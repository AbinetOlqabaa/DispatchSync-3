import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';

const router = Router();

// System Status and Diagnostics
router.get('/status', async (_req, res) => {
  try {
    const status = await sandboxStore.getSystemStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Staging Readiness Evaluation & Verification (.ai/09_RELEASE_CHECKLIST.md)
router.get('/staging-readiness', async (_req, res) => {
  try {
    const report = await sandboxStore.getStagingReadinessReport();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List Registered Businesses (used for partner association and overview)
router.get('/businesses', async (_req, res) => {
  try {
    const businesses = await sandboxStore.getAllBusinesses();
    res.json(businesses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
