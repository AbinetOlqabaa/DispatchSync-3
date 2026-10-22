import { User, UserRole, Dispatch, DispatchItem, ReceiptReconciliation, AuditLogEntry, SystemStatusInfo, Partner } from '../types';

export interface AuthCredentials {
  email: string;
  password?: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  businessName?: string;
}

export interface CreateDispatchPayload {
  senderId: string;
  senderName: string;
  receiverPartnerId: string;
  originLocation: string;
  destinationLocation: string;
  notes?: string;
  items: Omit<DispatchItem, 'id' | 'totalValue'>[];
}

export interface IAuthService {
  getCurrentUser(): Promise<User | null>;
  signIn(credentials: AuthCredentials): Promise<User>;
  signUp(payload: RegisterPayload): Promise<User>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<{ success: boolean; message: string }>;
  verifyPhoneOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }>;
  bootstrapSuperAdmin(secretToken: string, payload: { email: string; fullName: string; password: string }): Promise<User>;
  switchDemoRole(role: UserRole): Promise<User>;
}

export interface IDispatchService {
  listDispatches(filters?: { status?: string; search?: string; partnerId?: string }): Promise<Dispatch[]>;
  getDispatchById(id: string): Promise<Dispatch | null>;
  createDispatch(payload: CreateDispatchPayload): Promise<Dispatch>;
  markAsViewed(dispatchId: string, viewerName: string): Promise<Dispatch>;
  recordReceipt(dispatchId: string, reconciliation: ReceiptReconciliation): Promise<Dispatch>;
  listPartners(): Promise<Partner[]>;
}

export interface IAuditService {
  getAuditLogs(limit?: number): Promise<AuditLogEntry[]>;
  verifyLedgerIntegrity(): Promise<{ valid: boolean; verifiedCount: number; brokenAtId?: string }>;
}

export interface ISystemStatusService {
  getStatus(): Promise<SystemStatusInfo>;
}
