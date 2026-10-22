import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Get audit logs (Super Admin and Business Owner only)
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'BUSINESS_OWNER'),
  async (_req: AuthenticatedRequest, res) => {
    try {
      const user = _req.user!;
      const logs = await sandboxStore.getAuditLogs({
        limitCount: 100,
        businessId: user.role === 'SUPER_ADMIN' ? undefined : user.businessId,
      });
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
