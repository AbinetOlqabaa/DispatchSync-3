import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Get in-app notifications for authenticated user
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const notifs = await sandboxStore.getNotifications(user.id);
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark single notification read
router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    await sandboxStore.markNotificationRead(id, user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mark all notifications read
router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    await sandboxStore.markAllNotificationsRead(user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
