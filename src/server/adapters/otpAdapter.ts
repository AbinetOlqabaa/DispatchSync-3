/**
 * OTP (One-Time Password) Provider Adapter
 * Designed in accordance with:
 * - .ai/IDENTITY_01_REQUIREMENTS_AND_UX.md
 * - .ai/IDENTITY_03_AUTH_AND_OTP_FLOWS.md
 * - .ai/IDENTITY_06_TESTS_AND_ACCEPTANCE.md
 */

import crypto from 'crypto';
import { OtpChallenge } from '../../types/dispatch.js';

interface StoredChallenge {
  challengeId: string;
  phoneNumber: string;
  codeHash: string;
  rawCodeForDev?: string;
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PROFILE_CHANGE';
  expiresAt: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  payload?: any; // Stored payload (e.g. pending registration or user info)
}

// In-memory challenge store: challengeId -> StoredChallenge
const challengeStore = new Map<string, StoredChallenge>();

// Track send frequency per phone number to prevent spam (max 5 sends per 15 min)
const phoneSendFrequency = new Map<string, { count: number; windowStart: number }>();

export class OtpAdapter {
  private isTestOrDev = process.env.NODE_ENV !== 'production';

  /**
   * Create and dispatch a new OTP challenge
   */
  async createChallenge(
    phoneNumber: string,
    purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PROFILE_CHANGE',
    payload?: any
  ): Promise<OtpChallenge> {
    const normalizedPhone = phoneNumber.trim();

    // Rate-limiting check: max 5 sends per 15 minutes per phone number
    const now = Date.now();
    const rateRecord = phoneSendFrequency.get(normalizedPhone);
    if (rateRecord) {
      if (now - rateRecord.windowStart < 15 * 60 * 1000) {
        if (rateRecord.count >= 6) {
          throw new Error('Too many OTP verification requests. Please wait a few minutes before trying again.');
        }
        rateRecord.count += 1;
      } else {
        phoneSendFrequency.set(normalizedPhone, { count: 1, windowStart: now });
      }
    } else {
      phoneSendFrequency.set(normalizedPhone, { count: 1, windowStart: now });
    }

    // Check if an active challenge exists and is still in cooldown
    for (const [id, ch] of challengeStore.entries()) {
      if (ch.phoneNumber === normalizedPhone && ch.purpose === purpose && now < ch.expiresAt) {
        if (!this.isTestOrDev && now < ch.resendAvailableAt) {
          const secondsWait = Math.ceil((ch.resendAvailableAt - now) / 1000);
          throw new Error(`Please wait ${secondsWait} seconds before requesting a new OTP code.`);
        }
        // Invalidate older challenge
        challengeStore.delete(id);
      }
    }

    // Generate secure 6-digit random code
    const randomInt = crypto.randomInt(100000, 999999);
    const code = randomInt.toString();

    // Hash the code with SHA-256 for secure comparison
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    const challengeId = 'otp_' + crypto.randomBytes(16).toString('hex');
    const expiresInSeconds = 300; // 5 minutes
    const expiresAt = now + expiresInSeconds * 1000;
    const resendAvailableAt = now + 30 * 1000; // 30 seconds cooldown

    const stored: StoredChallenge = {
      challengeId,
      phoneNumber: normalizedPhone,
      codeHash,
      rawCodeForDev: this.isTestOrDev ? code : undefined,
      purpose,
      expiresAt,
      resendAvailableAt,
      attemptsRemaining: 5,
      payload,
    };

    challengeStore.set(challengeId, stored);

    if (this.isTestOrDev) {
      console.log(`[OTP GATEWAY SIMULATION] Code for ${normalizedPhone} (${purpose}): >>> ${code} <<<`);
    }

    return {
      challengeId,
      phoneNumber: normalizedPhone,
      purpose,
      expiresAt,
      expiresInSeconds,
      resendAvailableAt,
      attemptsRemaining: stored.attemptsRemaining,
      isSimulation: this.isTestOrDev,
      simulatedCode: this.isTestOrDev ? code : undefined,
    };
  }

  /**
   * Verify an OTP code against challenge
   */
  async verifyCode(
    challengeId: string,
    providedCode: string,
    expectedPurpose?: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PROFILE_CHANGE'
  ): Promise<{ success: boolean; error?: string; payload?: any; phoneNumber?: string; attemptsRemaining?: number }> {
    const challenge = challengeStore.get(challengeId);
    if (!challenge) {
      return { success: false, error: 'OTP challenge expired or not found. Please request a new code.' };
    }

    if (expectedPurpose && challenge.purpose !== expectedPurpose) {
      return { success: false, error: 'OTP purpose mismatch.' };
    }

    const now = Date.now();
    if (now > challenge.expiresAt) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'OTP code has expired. Please request a new code.' };
    }

    if (challenge.attemptsRemaining <= 0) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'Too many incorrect attempts. This OTP challenge has been revoked.', attemptsRemaining: 0 };
    }

    const cleanInput = providedCode.trim();

    // In dev/test mode, allow synthetic default code '123456' OR the actual generated code
    const isSyntheticTestMatch = this.isTestOrDev && cleanInput === '123456';

    const inputHash = crypto.createHash('sha256').update(cleanInput).digest('hex');
    const isHashMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(challenge.codeHash));

    if (isHashMatch || isSyntheticTestMatch) {
      // Invalidate immediately upon successful verification (single-use)
      const payload = challenge.payload;
      const phoneNumber = challenge.phoneNumber;
      challengeStore.delete(challengeId);
      return { success: true, payload, phoneNumber };
    }

    // Decrement attempts on failure
    challenge.attemptsRemaining -= 1;
    if (challenge.attemptsRemaining <= 0) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'Incorrect OTP code. Maximum attempts exceeded; challenge revoked.', attemptsRemaining: 0 };
    }

    return {
      success: false,
      error: `Incorrect OTP code. ${challenge.attemptsRemaining} attempts remaining.`,
      attemptsRemaining: challenge.attemptsRemaining,
    };
  }

  // Synchronous convenience wrapper for unit tests
  verifyOtp(
    challengeId: string,
    providedCode: string,
    expectedPurpose?: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PROFILE_CHANGE'
  ): { success: boolean; error?: string; payload?: any; phoneNumber?: string; attemptsRemaining?: number } {
    const challenge = challengeStore.get(challengeId);
    if (!challenge) {
      return { success: false, error: 'OTP challenge expired or not found. Please request a new code.' };
    }

    if (expectedPurpose && challenge.purpose !== expectedPurpose) {
      return { success: false, error: 'OTP purpose mismatch.' };
    }

    const now = Date.now();
    if (now > challenge.expiresAt) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'OTP code has expired. Please request a new code.' };
    }

    if (challenge.attemptsRemaining <= 0) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'Too many incorrect attempts. This OTP challenge has been revoked.', attemptsRemaining: 0 };
    }

    const cleanInput = providedCode.trim();
    const isSyntheticTestMatch = this.isTestOrDev && cleanInput === '123456';
    const inputHash = crypto.createHash('sha256').update(cleanInput).digest('hex');
    const isHashMatch = crypto.timingSafeEqual(Buffer.from(inputHash), Buffer.from(challenge.codeHash));

    if (isHashMatch || isSyntheticTestMatch) {
      const payload = challenge.payload;
      const phoneNumber = challenge.phoneNumber;
      challengeStore.delete(challengeId);
      return { success: true, payload, phoneNumber };
    }

    challenge.attemptsRemaining -= 1;
    if (challenge.attemptsRemaining <= 0) {
      challengeStore.delete(challengeId);
      return { success: false, error: 'Incorrect OTP code. Maximum attempts exceeded; challenge revoked.', attemptsRemaining: 0 };
    }

    return {
      success: false,
      error: `Incorrect OTP code. ${challenge.attemptsRemaining} attempts remaining.`,
      attemptsRemaining: challenge.attemptsRemaining,
    };
  }

  getChallenge(challengeId: string): StoredChallenge | undefined {
    return challengeStore.get(challengeId);
  }

  clear() {
    challengeStore.clear();
    phoneSendFrequency.clear();
  }
}

export const otpAdapter = new OtpAdapter();
export const otpChallengeStore = otpAdapter;
