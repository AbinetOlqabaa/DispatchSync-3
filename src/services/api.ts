import {
  AuditLogEntry,
  Business,
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
    if (this.token && storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch {
        this.user = null;
      }
    } else {
      this.token = null;
      this.user = null;
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
  async login(identifier: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async loginWithMobile(phoneNumber: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/login-mobile', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async initiateRegistration(payload: {
    role: UserRole;
    name: string;
    phoneNumber: string;
    countryDialCode?: string;
    fan: string;
    fin: string;
    businessName: string;
    password: string;
    partnerId?: string;
  }): Promise<{
    challengeId: string;
    expiresInSeconds: number;
    resendAvailableAt: number;
    isSimulation: boolean;
    simulatedCode?: string;
    maskedPhone: string;
    maskedFan: string;
    maskedFin: string;
  }> {
    return this.request('/api/auth/register/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async completeRegistration(challengeId: string, otpCode: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/api/auth/register/complete', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otpCode }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async initiateIdentityPasswordReset(payload: {
    phoneNumber: string;
    fan: string;
    fin: string;
    countryDialCode?: string;
  }): Promise<{
    challengeId: string;
    expiresInSeconds: number;
    resendAvailableAt: number;
    isSimulation: boolean;
    simulatedCode?: string;
    maskedPhone: string;
  }> {
    return this.request('/api/auth/password-reset/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async completeIdentityPasswordReset(
    challengeId: string,
    otpCode: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/password-reset/complete', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otpCode, newPassword }),
    });
  }

  async initiatePasswordChangeOtp(): Promise<{
    challengeId: string;
    expiresInSeconds: number;
    resendAvailableAt: number;
    isSimulation: boolean;
    simulatedCode?: string;
    maskedPhone: string;
  }> {
    return this.request('/api/auth/password-change/initiate-otp', {
      method: 'POST',
    });
  }

  async changePasswordWithOtp(
    currentPassword: string,
    newPassword: string,
    challengeId: string,
    otpCode: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request('/api/auth/password-change', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, challengeId, otpCode }),
    });
  }

  async updateProfile(data: { name?: string; avatarUrl?: string }): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  async removeProfilePhoto(): Promise<User> {
    const res = await this.request<{ user: User }>('/api/auth/profile/photo', {
      method: 'DELETE',
    });
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res.user;
  }

  // Admin User Management Endpoints
  async adminGetUsers(params?: {
    search?: string;
    role?: UserRole;
    status?: 'ACTIVE' | 'SUSPENDED';
    page?: number;
    limit?: number;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.role) query.set('role', params.role);
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    return this.request(`/api/admin/users${qs ? `?${qs}` : ''}`);
  }

  async adminSuspendUser(userId: string, reason: string): Promise<{ user: User; message: string }> {
    return this.request(`/api/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async adminReactivateUser(userId: string): Promise<{ user: User; message: string }> {
    return this.request(`/api/admin/users/${userId}/reactivate`, {
      method: 'POST',
    });
  }

  async adminUpdateUserRole(userId: string, role: UserRole, businessId?: string): Promise<{ user: User; message: string }> {
    return this.request(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, businessId }),
    });
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

  async createBusiness(payload: {
    name: string;
    registrationNumber?: string;
    countryCode?: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
  }): Promise<{ business: Business; user: User }> {
    const res = await this.request<{ business: Business; user: User }>('/api/auth/create-business', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.user = res.user;
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    return res;
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

  async updateDispatchTelemetry(
    id: string,
    telemetry: {
      latitude: number;
      longitude: number;
      speedKmh?: number;
      heading?: number;
      checkpointName?: string;
      source?: 'GPS' | 'DRIVER_SCAN' | 'CHECKPOINT' | 'SIMULATION';
    }
  ): Promise<Dispatch> {
    return this.request(`/api/dispatches/${id}/telemetry`, {
      method: 'POST',
      body: JSON.stringify(telemetry),
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
        evidence?: any[];
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
        signatureSvgOrBase64?: string;
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

  async recordPublicReceipt(
    shareToken: string,
    payload: {
      lines: Array<{
        id: string;
        quantityReceived: number;
        condition: string;
        discrepancyType?: string;
        notes?: string;
        evidence?: any[];
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
        signatureSvgOrBase64?: string;
      };
      idempotencyKey?: string;
    }
  ): Promise<Dispatch> {
    const key = payload.idempotencyKey || `idem_pub_rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return this.request(`/api/dispatches/public/${shareToken}/reconcile`, {
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

  async getOutboxNotifications(): Promise<NotificationItem[]> {
    return this.request('/api/notifications/outbox');
  }

  async retryNotificationDelivery(id: string): Promise<NotificationItem> {
    return this.request(`/api/notifications/${id}/retry`, {
      method: 'POST',
    });
  }

  async sendOutboundNotification(payload: {
    channel: string;
    recipient: string;
    title: string;
    message: string;
    dispatchId?: string;
    dispatchNumber?: string;
  }): Promise<NotificationItem> {
    return this.request('/api/notifications/outbound', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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

  // System Diagnostics & Staging Verification
  async getSystemStatus(): Promise<SystemStatusInfo> {
    return this.request('/api/system/status');
  }

  async getStagingReadinessReport(): Promise<any> {
    return this.request('/api/system/staging-readiness');
  }
}

export const api = new ApiService();
