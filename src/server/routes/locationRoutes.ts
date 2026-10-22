import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Get origin locations for current business
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const locations = await sandboxStore.getLocations(user.businessId);
    res.json(locations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new origin location
router.post(
  '/',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SENDER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { label, addressLines, city, region, countryCode, isDefault } = req.body;

      if (!label || !addressLines || !city) {
        res.status(400).json({ error: 'Label, street address, and city are required.' });
        return;
      }

      const location = await sandboxStore.createLocation(
        {
          businessId: user.businessId,
          label: label.trim(),
          addressLines: addressLines.trim(),
          city: city.trim(),
          region: region?.trim() || '',
          countryCode: countryCode?.trim() || 'US',
          isDefault: !!isDefault,
        },
        user
      );

      res.status(201).json(location);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to create location.' });
    }
  }
);

export default router;
