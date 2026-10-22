import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, optionalAuthenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// List dispatches for current authenticated user or public sandbox demo
router.get('/', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user;
    const { status } = req.query as { status?: string };

    if (!user) {
      // Unauthenticated / demo guest view: return public sandbox demo dispatches
      const dispatches = await sandboxStore.getDispatches({ status });
      res.json(dispatches);
      return;
    }

    const dispatches = await sandboxStore.getDispatches({
      role: user.role,
      businessId: user.businessId,
      partnerId: user.partnerId,
      status,
    });

    res.json(dispatches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public partner view (via unguessable share token) - automatically records viewing
router.get('/public/:shareToken', async (req, res) => {
  try {
    const { shareToken } = req.params;
    const dispatch = await sandboxStore.getDispatchByShareToken(shareToken);

    if (!dispatch) {
      res.status(404).json({ error: 'Delivery list not found or link has expired.' });
      return;
    }

    const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
    const { dispatch: updated } = await sandboxStore.recordViewReceipt(
      dispatch.id,
      {
        id: 'partner_link_guest',
        name: `${dispatch.partnerName} (Receiver Link)`,
        role: 'RECEIVER',
      },
      clientIp
    );

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get dispatch by ID with strict tenant isolation check
router.get('/:id', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const dispatch = await sandboxStore.getDispatchById(id);

    if (!dispatch) {
      res.status(404).json({ error: 'Dispatch not found.' });
      return;
    }

    const user = req.user;
    // Strict Tenant Isolation if user is authenticated
    if (user && user.role !== 'SUPER_ADMIN') {
      if (user.role === 'RECEIVER') {
        if (user.partnerId && dispatch.partnerId !== user.partnerId) {
          res.status(403).json({ error: 'Forbidden: Access denied to unrelated partner dispatch.' });
          return;
        }
      } else if (dispatch.senderBusinessId !== user.businessId) {
        res.status(403).json({ error: 'Forbidden: Access denied to unrelated business dispatch.' });
        return;
      }
    }

    // If viewed by an authenticated receiver, record genuine view receipt
    if (user && user.role === 'RECEIVER') {
      const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1');
      await sandboxStore.recordViewReceipt(
        dispatch.id,
        {
          id: user.id,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
        },
        clientIp
      );
    }

    res.json(dispatch);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new dispatch (Senders, Owners, SuperAdmins)
router.post(
  '/',
  authenticate,
  requireRole('SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
      const newDispatch = await sandboxStore.createDispatch({ ...req.body, idempotencyKey }, user);
      res.status(201).json(newDispatch);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create dispatch.' });
    }
  }
);

// Bulk Create Dispatches (CSV import)
router.post(
  '/bulk',
  authenticate,
  requireRole('SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const dispatchesList = req.body.dispatches;
      const result = await sandboxStore.bulkCreateDispatches(dispatchesList, user);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to bulk-create dispatches.' });
    }
  }
);

// Record Driver Transit Package Scan & Milestone Verification
router.post('/:id/transit-scan', optionalAuthenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const updated = await sandboxStore.recordTransitScan(id, req.body, user);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to record transit scan.' });
  }
});

// Record delivery receipt & reconcile quantities (Receivers, Owners, SuperAdmins)
router.post(
  '/:id/reconcile',
  authenticate,
  requireRole('RECEIVER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Verify tenant ownership
      const existing = await sandboxStore.getDispatchById(id);
      if (!existing) {
        res.status(404).json({ error: 'Dispatch not found.' });
        return;
      }

      if (user.role !== 'SUPER_ADMIN') {
        if (user.role === 'RECEIVER') {
          if (user.partnerId && existing.partnerId !== user.partnerId) {
            res.status(403).json({ error: 'Forbidden: You cannot report receipt for another partner.' });
            return;
          }
        } else if (existing.senderBusinessId !== user.businessId) {
          res.status(403).json({ error: 'Forbidden: Cross-tenant modification denied.' });
          return;
        }
      }

      const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
      const updated = await sandboxStore.recordReceiptReport(id, { ...req.body, idempotencyKey }, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to record receipt.' });
    }
  }
);

// Respond to discrepancy case (Sender or Business Owner)
router.post(
  '/:id/discrepancies/:caseId/respond',
  authenticate,
  requireRole('SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id, caseId } = req.params;
      const user = req.user!;
      const updated = await sandboxStore.respondToDiscrepancy(id, caseId, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to respond to discrepancy.' });
    }
  }
);

// Resolve discrepancy case (Business Owner or Super Admin)
router.post(
  '/:id/discrepancies/:caseId/resolve',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id, caseId } = req.params;
      const user = req.user!;
      const updated = await sandboxStore.resolveDiscrepancy(id, caseId, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to resolve discrepancy.' });
    }
  }
);

// Finalize reconciliation resolution (Business Owner or Super Admin)
router.post(
  '/:id/finalize',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const updated = await sandboxStore.finalizeReconciliation(id, req.body, user);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to finalize reconciliation.' });
    }
  }
);

export default router;
