import { SystemStatusInfo } from '../types';

export interface BootstrapResponse {
  success: boolean;
  message: string;
  admin?: {
    email: string;
    fullName: string;
    role: string;
    provisionedAt: string;
  };
}

export async function fetchServerHealth(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchServerConfigStatus(): Promise<SystemStatusInfo | null> {
  try {
    const res = await fetch('/api/config/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function requestServerBootstrap(payload: {
  secretToken: string;
  email: string;
  fullName: string;
}): Promise<BootstrapResponse> {
  try {
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server rejected bootstrap request');
    }
    return data;
  } catch (err: unknown) {
    if (err instanceof Error) throw err;
    throw new Error('Bootstrap request failed');
  }
}

export async function validateDispatchServerSide(payload: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }> {
  try {
    const res = await fetch('/api/dispatches/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch {
    // If server unreachable, fallback to client validation
    return { valid: true };
  }
}
