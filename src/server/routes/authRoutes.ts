import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { getBootstrapStatus } from '../security.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const session = await sandboxStore.login(email, password);
    res.json(session);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed.' });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phoneNumber, businessName, role, partnerId } = req.body;

    if (!email || !password || !name || !phoneNumber || !businessName || !role) {
      res.status(400).json({ error: 'Please provide all required registration fields.' });
      return;
    }

    const validRoles = ['BUSINESS_OWNER', 'SENDER', 'RECEIVER'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Public registration allows BUSINESS_OWNER, SENDER, or RECEIVER roles only.' });
      return;
    }

    const session = await sandboxStore.register({
      email,
      password,
      name,
      phoneNumber,
      businessName,
      role,
      partnerId,
    });

    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed.' });
  }
});

// Current User Profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Password Reset Request
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    const result = await sandboxStore.requestPasswordReset(email);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    const result = await sandboxStore.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verify Phone SMS Code
router.post('/verify-phone', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Verification code is required.' });
      return;
    }

    const result = await sandboxStore.verifyPhoneNumber(req.user!.id, code);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Bootstrap Status
router.get('/bootstrap-status', async (_req, res) => {
  res.json(getBootstrapStatus());
});

// Superadmin Bootstrap (One-time secure initialization)
router.post('/bootstrap-superadmin', async (req, res) => {
  try {
    const { bootstrapSecret, email, password, name } = req.body;
    if (!bootstrapSecret || !email || !password || !name) {
      res.status(400).json({
        error: 'Missing required parameters: bootstrapSecret, email, password, and name are required.',
      });
      return;
    }

    const result = await sandboxStore.bootstrapSuperAdmin(bootstrapSecret, {
      email,
      password,
      name,
    });

    res.json({
      success: true,
      message: 'Super Administrator provisioned successfully. You may now log in.',
      user: result.user,
    });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Super-Admin bootstrap failed.' });
  }
});

// Switch Active Business Context (multi-membership)
router.post('/switch-business', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) {
      res.status(400).json({ error: 'businessId is required.' });
      return;
    }
    const updatedUser = await sandboxStore.switchActiveBusiness(req.user!.id, businessId);
    res.json({ user: updatedUser });
  } catch (err: any) {
    res.status(403).json({ error: err.message || 'Failed to switch business.' });
  }
});

export default router;
