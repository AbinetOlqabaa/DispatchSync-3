import crypto from 'crypto';

// Server-side secure bootstrap storage
let activeBootstrapToken: string | null = null;
let superAdminProvisioned = false;

// Initialize one-time token or use environment override
export function initSuperAdminBootstrap(): string {
  if (process.env.SUPERADMIN_BOOTSTRAP_SECRET) {
    activeBootstrapToken = process.env.SUPERADMIN_BOOTSTRAP_SECRET;
    console.log('[SECURITY] Super-Admin bootstrap token loaded from SUPERADMIN_BOOTSTRAP_SECRET environment variable.');
    return activeBootstrapToken;
  }

  // Generate 32-byte secure random token
  activeBootstrapToken = crypto.randomBytes(24).toString('hex');
  console.log('================================================================');
  console.log('[SECURITY ALERT] ONE-TIME SUPER-ADMIN BOOTSTRAP TOKEN GENERATED:');
  console.log(`>>> ${activeBootstrapToken} <<<`);
  console.log('Redeem this at /system/status or via POST /api/auth/bootstrap-superadmin');
  console.log('================================================================');
  return activeBootstrapToken;
}

export function getBootstrapStatus() {
  return {
    isAvailable: !superAdminProvisioned && activeBootstrapToken !== null,
    superAdminProvisioned,
    // Never expose token to client via API, only inform if bootstrap is available
  };
}

export function redeemBootstrapToken(providedToken: string): boolean {
  if (superAdminProvisioned || !activeBootstrapToken || !providedToken) {
    return false;
  }
  const bufProvided = Buffer.from(providedToken);
  const bufActive = Buffer.from(activeBootstrapToken);

  if (bufProvided.length !== bufActive.length) {
    return false;
  }

  // Constant-time comparison
  const isValid = crypto.timingSafeEqual(bufProvided, bufActive);

  if (isValid) {
    superAdminProvisioned = true;
    activeBootstrapToken = null; // Invalidate immediately
    console.log('[SECURITY] Super-admin successfully bootstrapped! Bootstrap token consumed and invalidated.');
    return true;
  }
  return false;
}

// Simple signed session tokens
const SESSION_SECRET = process.env.SESSION_SECRET || 'dispatchbridge-secret-key-development-2026';

export function createSessionToken(userId: string, role: string): string {
  const payload = JSON.stringify({
    userId,
    role,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    nonce: crypto.randomBytes(8).toString('hex'),
  });

  const encoded = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(encoded)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

// Reset token store: token -> { email, expiresAt }
export const passwordResetStore = new Map<string, { email: string; expiresAt: number }>();

export function generatePasswordResetToken(email: string): string {
  const token = 'rst_' + crypto.randomBytes(16).toString('hex');
  passwordResetStore.set(token, {
    email,
    expiresAt: Date.now() + 1000 * 60 * 30, // 30 minutes
  });
  return token;
}

// Phone verification store: userId -> { code, expiresAt }
export const phoneVerificationStore = new Map<string, { code: string; expiresAt: number }>();

export function generatePhoneCode(userId: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  phoneVerificationStore.set(userId, {
    code,
    expiresAt: Date.now() + 1000 * 60 * 10, // 10 minutes
  });
  console.log(`[SMS GATEWAY SIMULATOR] Sent verification code ${code} to user ${userId}`);
  return code;
}
