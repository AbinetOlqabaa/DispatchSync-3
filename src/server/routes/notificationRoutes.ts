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

// Get outbox notifications (SMS, Email, Webhooks, Push)
router.get('/outbox', authenticate, async (_req, res) => {
  try {
    const outbox = await sandboxStore.getOutboxNotifications();
    res.json(outbox);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Retry an outbound notification delivery
router.post('/:id/retry', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const updated = await sandboxStore.retryNotificationDelivery(id);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Send an outbound notification (SMS, Email, WhatsApp, Webhook test)
router.post('/outbound', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const notif = await sandboxStore.sendOutboundNotification(req.body);
    res.status(201).json(notif);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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
