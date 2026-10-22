import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Get partners
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const filterBusiness = user.role === 'SUPER_ADMIN' ? undefined : user.businessId;
    const partners = await sandboxStore.getPartners(filterBusiness);
    res.json(partners);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create partner
router.post(
  '/',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const partner = await sandboxStore.createPartner(req.body, user);
      res.status(201).json(partner);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create partner.' });
    }
  }
);

export default router;
