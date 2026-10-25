import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import { UserRole } from '../../types/dispatch.js';

const router = Router();

// Enforce authentication & Super Administrator role for all admin routes
router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// GET /api/admin/users - Search, filter, and paginate platform users
router.get('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const search = req.query.search as string | undefined;
    const role = req.query.role as UserRole | undefined;
    const status = req.query.status as 'ACTIVE' | 'SUSPENDED' | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    const result = await sandboxStore.adminGetUsers({
      search,
      role,
      status,
      page,
      limit,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch users.' });
  }
});

// POST /api/admin/users/:id/suspend - Suspend a user with audited reason
router.post('/users/:id/suspend', async (req: AuthenticatedRequest, res) => {
  try {
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ error: 'A justification reason is required to suspend an account.' });
      return;
    }

    const updatedUser = await sandboxStore.adminSuspendUser(req.user!.id, req.params.id, reason);
    res.json({ user: updatedUser, message: `User ${updatedUser.name} has been suspended.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to suspend user.' });
  }
});

// POST /api/admin/users/:id/reactivate - Reactivate a suspended user
router.post('/users/:id/reactivate', async (req: AuthenticatedRequest, res) => {
  try {
    const updatedUser = await sandboxStore.adminReactivateUser(req.user!.id, req.params.id);
    res.json({ user: updatedUser, message: `User ${updatedUser.name} has been reactivated.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to reactivate user.' });
  }
});

// PUT /api/admin/users/:id/role - Change user role
router.put('/users/:id/role', async (req: AuthenticatedRequest, res) => {
  try {
    const { role, businessId } = req.body;
    if (!role) {
      res.status(400).json({ error: 'Role is required.' });
      return;
    }

    const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER', 'RECEIVER'];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid user role specified.' });
      return;
    }

    const updatedUser = await sandboxStore.adminUpdateUserRole(
      req.user!.id,
      req.params.id,
      role,
      businessId
    );

    res.json({ user: updatedUser, message: `Role updated to ${role} for ${updatedUser.name}.` });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update user role.' });
  }
});

export default router;
