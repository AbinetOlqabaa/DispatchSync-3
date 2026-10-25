/**
 * Fayda e-ID Identity Verification Adapter
 * Designed in accordance with:
 * - .ai/IDENTITY_01_REQUIREMENTS_AND_UX.md
 * - .ai/IDENTITY_02_DATA_MODEL_AND_UNIQUENESS.md
 * - .ai/IDENTITY_03_AUTH_AND_OTP_FLOWS.md
 * - .ai/IDENTITY_04_SENSITIVE_DATA_SECURITY.md
 */

import { FaydaVerificationResult } from '../../types/dispatch.js';

export interface VerifyIdentityInput {
  fan: string; // Exactly 16 numeric digits, string
  fin: string; // Exactly 12 numeric digits, string
  fullName: string;
  phoneNumber: string;
}

export interface FaydaVerificationProvider {
  verifyIdentity(input: VerifyIdentityInput): Promise<FaydaVerificationResult>;
}

export function maskFan(fan: string): string {
  if (!fan || fan.length < 4) return '••••';
  const clean = fan.replace(/\D/g, '');
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export function maskFin(fin: string): string {
  if (!fin || fin.length < 4) return '••••';
  const clean = fin.replace(/\D/g, '');
  const last4 = clean.slice(-4);
  return `•••• •••• ${last4}`;
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 6) return phone || '';
  const clean = phone.trim();
  if (clean.startsWith('+251')) {
    // Ethiopian format: +251 91 ••• ••34
    const suffix = clean.slice(-2);
    const prefix = clean.slice(0, 7);
    return `${prefix} ••• ••${suffix}`;
  }
  // Generic international: keep first 6 chars, mask middle, show last 2
  const prefix = clean.slice(0, 6);
  const suffix = clean.slice(-2);
  return `${prefix} •••• ${suffix}`;
}

export function validateFanFormat(fan: string): { valid: boolean; error?: string } {
  if (typeof fan !== 'string') {
    return { valid: false, error: 'FAN must be a numeric string.' };
  }
  const clean = fan.trim();
  if (!/^\d{16}$/.test(clean)) {
    return { valid: false, error: 'FAN (Fayda Account Number) must be exactly 16 numeric digits.' };
  }
  return { valid: true };
}

export function validateFinFormat(fin: string): { valid: boolean; error?: string } {
  if (typeof fin !== 'string') {
    return { valid: false, error: 'FIN must be a numeric string.' };
  }
  const clean = fin.trim();
  if (!/^\d{12}$/.test(clean)) {
    return { valid: false, error: 'FIN (Fayda Identification Number) must be exactly 12 numeric digits.' };
  }
  return { valid: true };
}

/**
 * Development & Test Fayda Simulator
 * Uses synthetic fixtures with a prominent "Simulation" label.
 * NEVER connects to live government endpoints.
 */
export class FaydaSimulationAdapter implements FaydaVerificationProvider {
  readonly isSimulation = true;
  readonly providerName = 'Fayda e-ID Gateway Simulator (Dev Mode)';

  async verifyIdentity(input: VerifyIdentityInput): Promise<FaydaVerificationResult> {
    const fanCheck = validateFanFormat(input.fan);
    if (!fanCheck.valid) {
      return {
        verified: false,
        matchScore: 0,
        verificationMethod: 'FAYDA_DEV_SIMULATOR',
        providerName: this.providerName,
        isSimulation: true,
        fullNameMatched: false,
        phoneMatched: false,
        maskedFan: maskFan(input.fan),
        maskedFin: maskFin(input.fin),
        timestamp: new Date().toISOString(),
        errorCode: 'INVALID_FAN',
        error: fanCheck.error,
      };
    }

    const finCheck = validateFinFormat(input.fin);
    if (!finCheck.valid) {
      return {
        verified: false,
        matchScore: 0,
        verificationMethod: 'FAYDA_DEV_SIMULATOR',
        providerName: this.providerName,
        isSimulation: true,
        fullNameMatched: false,
        phoneMatched: false,
        maskedFan: maskFan(input.fan),
        maskedFin: maskFin(input.fin),
        timestamp: new Date().toISOString(),
        errorCode: 'INVALID_FIN',
        error: finCheck.error,
      };
    }

    const fan = input.fan.trim();
    const fin = input.fin.trim();

    // Deterministic test fixture: Timeout simulation
    if (fan.endsWith('0000')) {
      return {
        verified: false,
        matchScore: 0,
        verificationMethod: 'FAYDA_DEV_SIMULATOR',
        providerName: this.providerName,
        isSimulation: true,
        fullNameMatched: false,
        phoneMatched: false,
        maskedFan: maskFan(fan),
        maskedFin: maskFin(fin),
        timestamp: new Date().toISOString(),
        errorCode: 'PROVIDER_TIMEOUT',
        error: 'Fayda e-ID national identity gateway timed out during verification check (Simulated Fixture).',
      };
    }

    // Deterministic test fixture: Simulated not found / mismatch
    if (fan.endsWith('9999') || fin.endsWith('999')) {
      return {
        verified: false,
        matchScore: 25,
        verificationMethod: 'FAYDA_DEV_SIMULATOR',
        providerName: this.providerName,
        isSimulation: true,
        fullNameMatched: false,
        phoneMatched: false,
        maskedFan: maskFan(fan),
        maskedFin: maskFin(fin),
        timestamp: new Date().toISOString(),
        errorCode: 'ID_NOT_FOUND',
        error: 'Fayda account record not found in national identity registry (Simulated Fixture).',
      };
    }

    // Standard valid simulated synthetic match
    return {
      verified: true,
      matchScore: 98,
      verificationMethod: 'FAYDA_DEV_SIMULATOR',
      providerName: this.providerName,
      isSimulation: true,
      fullNameMatched: true,
      phoneMatched: true,
      maskedFan: maskFan(fan),
      maskedFin: maskFin(fin),
      timestamp: new Date().toISOString(),
    };
  }

  async verifyFanFinMatch(input: { fan: string; fin: string; phoneNumber?: string; fullName?: string }): Promise<FaydaVerificationResult> {
    if (input.fan.endsWith('0000') || (input.phoneNumber && input.phoneNumber.endsWith('0000'))) {
      throw new Error('Fayda e-ID service verification timed out during registry lookup.');
    }
    const res = await this.verifyIdentity({
      fan: input.fan,
      fin: input.fin,
      fullName: input.fullName || 'Verified Citizen',
      phoneNumber: input.phoneNumber || '+251911223344',
    });
    if (input.phoneNumber && input.phoneNumber.endsWith('999')) {
      return {
        ...res,
        verified: false,
        failureReason: 'Fayda record mismatch for provided phone and FIN credentials.',
      };
    }
    return {
      ...res,
      verificationMethod: 'FAYDA_DEV_SIMULATED',
    };
  }
}

/**
 * Production Fayda Provider
 * Fails closed if live government credentials are not configured.
 */
export class FaydaProductionAdapter implements FaydaVerificationProvider {
  readonly isSimulation = false;
  readonly providerName = 'Fayda National e-ID Production Gateway';

  async verifyIdentity(input: VerifyIdentityInput): Promise<FaydaVerificationResult> {
    const hasEndpoint = Boolean(process.env.FAYDA_API_ENDPOINT);
    const hasClientId = Boolean(process.env.FAYDA_CLIENT_ID);
    const hasSecret = Boolean(process.env.FAYDA_CLIENT_SECRET);

    if (!hasEndpoint || !hasClientId || !hasSecret) {
      return {
        verified: false,
        matchScore: 0,
        verificationMethod: 'FAYDA_NATIONAL_ID_API',
        providerName: this.providerName,
        isSimulation: false,
        fullNameMatched: false,
        phoneMatched: false,
        maskedFan: maskFan(input.fan),
        maskedFin: maskFin(input.fin),
        timestamp: new Date().toISOString(),
        errorCode: 'PROVIDER_ERROR',
        error: 'Production Fayda national e-ID credentials are not configured. Identity-dependent registration failed closed.',
      };
    }

    // If configured in live deployment, this communicates via mTLS / OAuth token exchange
    // with the national identity authority endpoint.
    return {
      verified: false,
      matchScore: 0,
      verificationMethod: 'FAYDA_NATIONAL_ID_API',
      providerName: this.providerName,
      isSimulation: false,
      fullNameMatched: false,
      phoneMatched: false,
      maskedFan: maskFan(input.fan),
      maskedFin: maskFin(input.fin),
      timestamp: new Date().toISOString(),
      errorCode: 'PROVIDER_ERROR',
      error: 'Direct production Fayda API certificate exchange required.',
    };
  }

  async verifyFanFinMatch(input: { fan: string; fin: string; phoneNumber?: string; fullName?: string }): Promise<FaydaVerificationResult> {
    const hasEndpoint = Boolean(process.env.FAYDA_API_ENDPOINT);
    if (!hasEndpoint) {
      throw new Error('Production Fayda e-ID endpoint is not configured; failing closed.');
    }
    return this.verifyIdentity({
      fan: input.fan,
      fin: input.fin,
      fullName: input.fullName || 'Citizen',
      phoneNumber: input.phoneNumber || '',
    });
  }
}

// Select active provider based on environment
const isProd = process.env.NODE_ENV === 'production' && process.env.FAYDA_ENV === 'production';
export const faydaAdapter: FaydaVerificationProvider = isProd
  ? new FaydaProductionAdapter()
  : new FaydaSimulationAdapter();
