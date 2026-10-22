/**
 * Core Domain Types for Business Dispatch & Delivery Reconciliation
 */

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'SENDER' | 'RECEIVER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  phoneVerified: boolean;
  role: UserRole;
  businessId?: string;
  businessName?: string;
  partnerId?: string;
  createdAt: string;
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED';
}

export interface Partner {
  id: string;
  businessId: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  tier: 'PRIMARY' | 'STANDARD' | 'REGIONAL';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export type DispatchStatus =
  | 'DRAFT'
  | 'DISPATCHED'
  | 'VIEWED'
  | 'DELIVERED'
  | 'ACCEPTED'
  | 'DISPUTED'
  | 'RECONCILED';

export interface DispatchItem {
  id: string;
  name: string;
  skuOrBatch: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  notes?: string;
}

export interface ReceiptReconciliation {
  recordedAt: string;
  recordedBy: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  missingQuantity: number;
  discrepancyValue: number;
  notes?: string;
  signedByName?: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  businessId: string;
  businessName: string;
  senderId: string;
  senderName: string;
  receiverPartnerId: string;
  receiverPartnerName: string;
  receiverContactPhone: string;
  receiverContactEmail: string;
  originLocation: string;
  destinationLocation: string;
  items: DispatchItem[];
  totalQuantity: number;
  totalValue: number;
  status: DispatchStatus;
  notes?: string;
  dispatchedAt?: string;
  viewedAt?: string;
  deliveredAt?: string;
  reconciliation?: ReceiptReconciliation;
  auditHash: string; // SHA-256 integrity hash
  previousHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action:
    | 'USER_SIGN_IN'
    | 'USER_REGISTERED'
    | 'SUPER_ADMIN_BOOTSTRAPPED'
    | 'DISPATCH_CREATED'
    | 'DISPATCH_SENT'
    | 'DISPATCH_VIEWED'
    | 'DISPATCH_RECEIPT_RECORDED'
    | 'DISPATCH_RECONCILED'
    | 'DISPATCH_DISPUTED';
  entityType: 'DISPATCH' | 'USER' | 'SYSTEM' | 'PARTNER';
  entityId: string;
  details: string;
  previousHash: string;
  hash: string;
}

export interface SystemStatusInfo {
  environment: {
    platform: string;
    isNativeAndroid: boolean;
    nativeAndroidSupported: boolean;
    appType: 'Mobile-First PWA (Web)' | 'Native Android APK';
    notes: string;
  };
  persistence: {
    adapterName: 'LOCAL_SANDBOX_ADAPTER' | 'CLOUD_FIRESTORE';
    isLiveCloudDatabase: boolean;
    statusLabel: string;
    description: string;
  };
  auth: {
    provider: 'LOCAL_SECURE_AUTH' | 'FIREBASE_AUTH';
    isLiveAuthProvider: boolean;
    phoneVerificationMode: 'READINESS_SIMULATOR' | 'LIVE_SMS_OTP';
  };
  security: {
    superAdminProvisioned: boolean;
    oneTimeBootstrapAllowed: boolean;
    tamperResistantAuditLedger: boolean;
    roleBasedAuthorization: boolean;
  };
  timestamp: string;
}
