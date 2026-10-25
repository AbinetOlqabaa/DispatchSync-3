import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { getBootstrapStatus } from '../security.js';

const router = Router();

// Login (Email or Mobile Number)
router.post('/login', async (req, res) => {
  try {
    const { email, phoneNumber, identifier, password } = req.body;
    const userIdentifier = identifier || email || phoneNumber;

    if (!userIdentifier || !password) {
      res.status(400).json({ error: 'Mobile number or email, and password are required.' });
      return;
    }

    const session = await sandboxStore.login(userIdentifier, password);
    res.json(session);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Login failed.' });
  }
});

// Dedicated Mobile Login
router.post('/login-mobile', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;
    if (!phoneNumber || !password) {
      res.status(400).json({ error: 'Mobile number and password are required.' });
      return;
    }

    const session = await sandboxStore.loginWithMobile(phoneNumber, password);
    res.json(session);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Mobile login failed.' });
  }
});

// Step 1: Initiate Registration with Fayda e-ID Verification & OTP Challenge
router.post('/register/initiate', async (req, res) => {
  try {
    const { role, name, phoneNumber, countryDialCode, fan, fin, businessName, password, email, partnerId } = req.body;

    if (!role || !name || !phoneNumber || !fan || !fin || !businessName || !password) {
      res.status(400).json({
        error: 'Missing required registration parameters: role, name, phoneNumber, fan, fin, businessName, and password are required.',
      });
      return;
    }

    if (role === 'SUPER_ADMIN') {
      res.status(400).json({ error: 'Public registration as Super Administrator is strictly prohibited.' });
      return;
    }

    const challenge = await sandboxStore.initiateRegistration({
      role,
      name,
      phoneNumber,
      countryDialCode,
      fan,
      fin,
      businessName,
      password,
      email,
      partnerId,
    });

    res.json(challenge);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration initiation failed.' });
  }
});

// Step 2: Complete Registration with OTP Code
router.post('/register/complete', async (req, res) => {
  try {
    const { challengeId, otpCode } = req.body;
    if (!challengeId || !otpCode) {
      res.status(400).json({ error: 'challengeId and otpCode are required.' });
      return;
    }

    const session = await sandboxStore.completeRegistration(challengeId, otpCode);
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration completion failed.' });
  }
});

// Legacy Register (Fallback for tests)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phoneNumber, businessName, role, partnerId } = req.body;

    if (!email || !password || !name || !phoneNumber || !businessName || !role) {
      res.status(400).json({ error: 'Please provide all required registration fields.' });
      return;
    }

    if (role === 'SUPER_ADMIN') {
      res.status(400).json({ error: 'Public registration as Super Administrator is strictly prohibited.' });
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

// Password Reset Step 1: Initiate with Mobile + FAN + FIN verification
router.post('/password-reset/initiate', async (req, res) => {
  try {
    const { phoneNumber, fan, fin, countryDialCode } = req.body;
    if (!phoneNumber || !fan || !fin) {
      res.status(400).json({ error: 'Mobile number, FAN, and FIN are required to initiate password recovery.' });
      return;
    }

    const challenge = await sandboxStore.initiatePasswordReset(phoneNumber, fan, fin, countryDialCode);
    res.json(challenge);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Identity verification failed.' });
  }
});

// Password Reset Step 2: Complete Reset with OTP + New Password
router.post('/password-reset/complete', async (req, res) => {
  try {
    const { challengeId, otpCode, newPassword } = req.body;
    if (!challengeId || !otpCode || !newPassword) {
      res.status(400).json({ error: 'challengeId, otpCode, and newPassword are required.' });
      return;
    }

    const result = await sandboxStore.completePasswordReset(challengeId, otpCode, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Password reset failed.' });
  }
});

// Signed-In Password Change Step 1: Request Step-up OTP
router.post('/password-change/initiate-otp', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const challenge = await sandboxStore.initiatePasswordChangeOtp(req.user!.id);
    res.json(challenge);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to dispatch step-up OTP.' });
  }
});

// Signed-In Password Change Step 2: Verify Step-up OTP and Update Password
router.post('/password-change', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { currentPassword, newPassword, challengeId, otpCode } = req.body;
    if (!currentPassword || !newPassword || !challengeId || !otpCode) {
      res.status(400).json({ error: 'currentPassword, newPassword, challengeId, and otpCode are required.' });
      return;
    }

    const result = await sandboxStore.changePassword(
      req.user!.id,
      currentPassword,
      newPassword,
      challengeId,
      otpCode
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Password update failed.' });
  }
});

// Profile Management: Update Profile (Name & Photo)
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, avatarUrl } = req.body;
    const updatedUser = await sandboxStore.updateProfile(req.user!.id, { name, avatarUrl });
    res.json({ user: updatedUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update profile.' });
  }
});

// Profile Management: Remove Photo
router.delete('/profile/photo', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const updatedUser = await sandboxStore.removeProfilePhoto(req.user!.id);
    res.json({ user: updatedUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to remove profile photo.' });
  }
});

// Current User Profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Password Reset Request (Legacy Email)
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

// Reset Password (Legacy Email)
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

// Create New Business Entity & Membership
router.post('/create-business', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { name, registrationNumber, countryCode, contactEmail, contactPhone, address } = req.body;
    if (!name || !contactEmail || !contactPhone || !address) {
      res.status(400).json({ error: 'name, contactEmail, contactPhone, and address are required.' });
      return;
    }
    const result = await sandboxStore.createBusiness(req.user!.id, {
      name,
      registrationNumber,
      countryCode,
      contactEmail,
      contactPhone,
      address,
    });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create business entity.' });
  }
});

export default router;
