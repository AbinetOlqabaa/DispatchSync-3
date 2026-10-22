import {
  AuditLogEntry,
  Business,
  DiscrepancyCase,
  Dispatch,
  Location,
  NotificationItem,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
  ViewReceipt,
} from '../types/dispatch.js';

export interface AuthSession {
  token: string;
  user: User;
  expiresAt: number;
}

export interface IAuthAdapter {
  login(email: string, password: string): Promise<AuthSession>;
  register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<AuthSession>;
  verifyToken(token: string): Promise<User | null>;
  requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }>;
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean }>;
  verifyPhoneNumber(userId: string, code: string): Promise<{ success: boolean }>;
  bootstrapSuperAdmin(bootstrapSecret: string, payload: { email: string; password: string; name: string }): Promise<{ success: boolean; user: User }>;
  isSuperAdminBootstrapAvailable(): boolean;
  switchActiveBusiness(userId: string, targetBusinessId: string): Promise<User>;
}

export interface IDatabaseAdapter {
  // Dispatches
  getDispatches(filter?: {
    businessId?: string;
    partnerId?: string;
    status?: string;
    role?: UserRole;
  }): Promise<Dispatch[]>;
  getDispatchById(id: string): Promise<Dispatch | null>;
  getDispatchByShareToken(token: string): Promise<Dispatch | null>;
  createDispatch(
    payload: {
      originLocationId?: string;
      originLocationLabel: string;
      originAddress: string;
      partnerId: string;
      destinationAddress?: string;
      driverName?: string;
      driverPhone?: string;
      vehicleReg?: string;
      notes?: string;
      idempotencyKey?: string;
      lines: Array<{
        sku: string;
        itemName: string;
        unit: string;
        unitPrice?: number;
        quantitySent: number;
        notes?: string;
      }>;
    },
    actor: User
  ): Promise<Dispatch>;
  recordViewReceipt(dispatchId: string, viewer: { id: string; name: string; role: UserRole; businessId?: string }, ipHash?: string): Promise<{ dispatch: Dispatch; viewReceipt: ViewReceipt }>;
  recordReceiptReport(
    id: string,
    payload: {
      lines: Array<{
        id: string;
        quantityReceived: number;
        condition: any;
        discrepancyType: any;
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
    },
    actor: User
  ): Promise<Dispatch>;
  respondToDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { status: 'ACKNOWLEDGED_BY_SENDER' | 'DISPUTED'; responseNotes: string },
    actor: User
  ): Promise<Dispatch>;
  resolveDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { resolution: string },
    actor: User
  ): Promise<Dispatch>;
  finalizeReconciliation(
    id: string,
    payload: { resolutionNotes: string },
    actor: User
  ): Promise<Dispatch>;

  // Partners
  getPartners(businessId?: string): Promise<Partner[]>;
  createPartner(partner: Omit<Partner, 'id' | 'createdAt'>, actor: User): Promise<Partner>;

  // Locations
  getLocations(businessId: string): Promise<Location[]>;
  createLocation(location: Omit<Location, 'id' | 'createdAt'>, actor: User): Promise<Location>;

  // Notifications & Outbox Delivery Engine
  getNotifications(userId: string): Promise<NotificationItem[]>;
  getOutboxNotifications(): Promise<NotificationItem[]>;
  retryNotificationDelivery(notificationId: string): Promise<NotificationItem>;
  sendOutboundNotification(payload: {
    channel: any;
    recipient: string;
    title: string;
    message: string;
    dispatchId?: string;
    dispatchNumber?: string;
  }): Promise<NotificationItem>;
  markNotificationRead(notificationId: string, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  createNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem>;

  // Audit
  getAuditLogs(filter?: { limitCount?: number; businessId?: string }): Promise<AuditLogEntry[]>;
  recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry>;

  // System & Staging Diagnostics
  getSystemStatus(): Promise<SystemStatusInfo>;
  getStagingReadinessReport(): Promise<any>;
  getAllBusinesses(): Promise<Business[]>;
}

export interface INotificationAdapter {
  notifyDispatchSubmitted(dispatch: Dispatch, partner: Partner): Promise<void>;
  notifyDispatchViewed(dispatch: Dispatch, viewerName: string): Promise<void>;
  notifyReceiptSubmitted(dispatch: Dispatch, hasDiscrepancy: boolean): Promise<void>;
  notifyDiscrepancyStatus(dispatch: Dispatch, discrepancyCase: DiscrepancyCase): Promise<void>;
  notifyReconciliationCompleted(dispatch: Dispatch): Promise<void>;
}
