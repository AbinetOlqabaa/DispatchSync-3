import {
  AuditLogEntry,
  Dispatch,
  Location,
  NotificationItem,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
} from '../types/dispatch.js';

const TOKEN_KEY = 'dispatchbridge_auth_token';
const USER_KEY = 'dispatchbridge_auth_user';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

class ApiService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch {
        this.user = null;
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  setSession(token: string, user: User) {
    this.token = token;
    this.user = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    // Correlation ID tracking
    if (!headers.has('X-Correlation-ID')) {
      headers.set('X-Correlation-ID', `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
    }

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    let response: Response;
    try {
      response = await fetch(endpoint, {
        ...options,
        headers,
      });
    } catch (err: any) {
      throw new ApiError('Network connection failure. Please check your connection and retry.', 0);
    }

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        const text = await response.text();
        if (text) errorMessage = text;
      }
      throw new ApiError(errorMessage, response.status);
    }

    return response.json() as Promise<T>;
  }

  // Auth Endpoints
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async getProfile(): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/me');
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  async switchActiveBusiness(businessId: string): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/switch-business', {
      method: 'POST',
      body: JSON.stringify({ businessId }),
    });
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }> {
    return this.request('/api/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    return this.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async verifyPhone(code: string): Promise<{ success: boolean }> {
    const res = await this.request<{ success: boolean }>('/api/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (this.user) {
      this.user.phoneVerified = true;
      localStorage.setItem(USER_KEY, JSON.stringify(this.user));
    }
    return res;
  }

  async getBootstrapStatus(): Promise<{ isAvailable: boolean; superAdminProvisioned: boolean }> {
    return this.request('/api/auth/bootstrap-status');
  }

  async bootstrapSuperAdmin(payload: {
    bootstrapSecret: string;
    email: string;
    password: string;
    name: string;
  }): Promise<{ success: boolean; message: string; user: User }> {
    return this.request('/api/auth/bootstrap-superadmin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Dispatches
  async getDispatches(statusFilter?: string): Promise<Dispatch[]> {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    return this.request(`/api/dispatches${query}`);
  }

  async getDispatch(id: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}`);
  }

  async getPublicDispatch(shareToken: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/public/${shareToken}`);
  }

  async createDispatch(payload: any, idempotencyKey?: string): Promise<Dispatch> {
    const key = idempotencyKey || `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.request('/api/dispatches', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key },
      body: JSON.stringify({ ...payload, idempotencyKey: key }),
    });
  }

  async bulkCreateDispatches(dispatches: any[]): Promise<{ createdCount: number; dispatches: Dispatch[]; errors?: string[] }> {
    return this.request('/api/dispatches/bulk', {
      method: 'POST',
      body: JSON.stringify({ dispatches }),
    });
  }

  async recordTransitScan(
    id: string,
    payload: {
      barcode: string;
      statusUpdate?: string;
      checkpointLocation?: string;
      driverNotes?: string;
      scannedLineIds?: string[];
      actorName?: string;
    }
  ): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}/transit-scan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async recordReceipt(
    id: string,
    payload: {
      lines: Array<{
        id: string;
        quantityReceived: number;
        condition: string;
        discrepancyType?: string;
        notes?: string;
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
      };
      idempotencyKey?: string;
    }
  ): Promise<Dispatch> {
    const key = payload.idempotencyKey || `idem_rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.request(`/api/dispatches/${id}/reconcile`, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': key },
      body: JSON.stringify({ ...payload, idempotencyKey: key }),
    });
  }

  async respondToDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { status: 'ACKNOWLEDGED_BY_SENDER' | 'DISPUTED'; responseNotes: string }
  ): Promise<Dispatch> {
    return this.request(`/api/dispatches/${dispatchId}/discrepancies/${caseId}/respond`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resolveDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { resolution: string }
  ): Promise<Dispatch> {
    return this.request(`/api/dispatches/${dispatchId}/discrepancies/${caseId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async finalizeReconciliation(id: string, resolutionNotes: string): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}/finalize`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes }),
    });
  }

  // Partners
  async getPartners(): Promise<Partner[]> {
    return this.request('/api/partners');
  }

  async createPartner(payload: any): Promise<Partner> {
    return this.request('/api/partners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Locations (Origin terminals & warehouses)
  async getLocations(): Promise<Location[]> {
    return this.request('/api/locations');
  }

  async createLocation(payload: any): Promise<Location> {
    return this.request('/api/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // In-App Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return this.request('/api/notifications');
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.request(`/api/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request('/api/notifications/read-all', { method: 'PATCH' });
  }

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    return this.request('/api/audit');
  }

  // System Diagnostics
  async getSystemStatus(): Promise<SystemStatusInfo> {
    return this.request('/api/system/status');
  }
}

export const api = new ApiService();
