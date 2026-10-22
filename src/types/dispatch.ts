/**
 * Domain types for Business Dispatch & Delivery Reconciliation
 * Defined in accordance with .ai/01_PRODUCT_REQUIREMENTS.md and .ai/02_ARCHITECTURE_AND_DATA_MODEL.md
 */

export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'SENDER' | 'RECEIVER';

export interface Membership {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  role: UserRole;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  fullName?: string;
  phoneNumber: string;
  phoneVerified: boolean;
  role: UserRole; // Active/primary role in current business context
  businessId: string; // Current active business context
  businessName: string;
  memberships: Membership[];
  partnerId?: string; // If RECEIVER role, binds to specific partner entity
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Business {
  id: string;
  name: string;
  registrationNumber?: string;
  countryCode: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: 'ACTIVE' | 'SUSPENDED';
  ownerUserIds: string[];
  createdAt: string;
}

export interface Location {
  id: string;
  businessId: string;
  label: string; // e.g., "Chicago Central Hub - Dock 4"
  addressLines: string;
  city: string;
  region: string;
  countryCode: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface Partner {
  id: string;
  businessId: string; // The supplier/distributor who registered this partner
  partnerBusinessId?: string; // Linked business entity if partner is registered on platform
  name: string;
  type: 'RETAILER' | 'WHOLESALER' | 'DISTRIBUTOR' | 'FRANCHISE' | 'CONSTRUCTION_SITE';
  contactPerson: string;
  email: string;
  phone: string;
  countryCode: string;
  region: string;
  city: string;
  deliveryAddress: string;
  status: 'ACTIVE' | 'SUSPENDED';
  verificationStatus: 'VERIFIED' | 'UNVERIFIED';
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: string;
}

export type ItemCondition = 'GOOD' | 'DAMAGED' | 'LOST' | 'UNKNOWN' | 'OTHER';

export type DiscrepancyType =
  | 'NONE'
  | 'SHORTAGE'
  | 'OVERAGE'
  | 'DAMAGED'
  | 'LOST'
  | 'NOT_RECEIVED'
  | 'COUNT_MISMATCH'
  | 'OTHER';

export interface DispatchLine {
  id: string;
  sku: string;
  itemName: string;
  unit: string; // 'boxes', 'pallets', 'kg', 'units', 'cartons', 'cases', 'bags'
  unitPrice?: number;
  quantitySent: number;
  quantityReceived?: number;
  condition?: ItemCondition;
  discrepancyType?: DiscrepancyType;
  lossQty?: number;
  notes?: string;
  ordinal: number;
}

export type DispatchStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DISPATCHED'
  | 'VIEWED'
  | 'IN_TRANSIT'
  | 'RECEIPT_SUBMITTED'
  | 'DISCREPANCY_REVIEW'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'RECONCILED'
  | 'CANCELLED';

export interface ViewReceipt {
  id: string;
  dispatchId: string;
  viewerUserId: string;
  viewerName: string;
  viewerBusinessId?: string;
  viewerRole: UserRole;
  firstViewedAt: string;
  lastViewedAt: string;
  viewCount: number;
  ipHash?: string;
}

export interface DiscrepancyCase {
  id: string;
  dispatchId: string;
  dispatchNumber: string;
  lineId?: string;
  itemName?: string;
  type: DiscrepancyType;
  expectedQuantity: number;
  reportedQuantity: number;
  shortfallQuantity: number;
  openedByUserId: string;
  openedByName: string;
  openedAt: string;
  status: 'OPEN' | 'ACKNOWLEDGED_BY_SENDER' | 'DISPUTED' | 'RESOLVED';
  notes?: string;
  senderResponseNotes?: string;
  resolution?: string;
  resolvedByUserId?: string;
  resolvedByName?: string;
  resolvedAt?: string;
}

export interface ReceiverSignoff {
  signerName: string;
  signerRole: string;
  signedAt: string;
  comments?: string;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string; // Unique human-readable code: DSP-2026-XXXX
  senderBusinessId: string;
  senderBusinessName: string;
  senderUserId: string;
  senderName: string;
  partnerId: string;
  partnerName: string;
  originLocationSnapshot: {
    locationId?: string;
    label: string;
    address: string;
  };
  destinationSnapshot: {
    partnerName: string;
    contactPerson: string;
    phone: string;
    address: string;
  };
  status: DispatchStatus;
  lines: DispatchLine[];
  totalQuantityDispatched: number;
  totalQuantityReceived?: number;
  totalQuantityLost?: number;
  shareToken: string; // Unguessable token
  driverName?: string;
  driverPhone?: string;
  vehicleReg?: string;
  dispatchedAt: string;
  firstViewedAt?: string;
  lastViewedAt?: string;
  viewReceipt?: ViewReceipt;
  receivedAt?: string;
  reconciledAt?: string;
  discrepancyCases?: DiscrepancyCase[];
  notes?: string;
  receiverSignoff?: ReceiverSignoff;
  idempotencyKey?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

export interface NotificationItem {
  id: string;
  recipientUserId: string;
  businessId: string;
  eventType:
    | 'DISPATCH_SUBMITTED'
    | 'DISPATCH_VIEWED'
    | 'RECEIPT_SUBMITTED'
    | 'DISCREPANCY_OPENED'
    | 'DISCREPANCY_RESOLVED'
    | 'DISPATCH_CANCELLED'
    | 'SECURITY_ALERT';
  title: string;
  message: string;
  dispatchId?: string;
  dispatchNumber?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  providerInfo?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  businessId?: string;
  action: string;
  entityType: 'DISPATCH' | 'PARTNER' | 'LOCATION' | 'USER' | 'BUSINESS' | 'RECONCILIATION' | 'DISCREPANCY';
  entityId: string;
  correlationId?: string;
  details: string;
  metadata?: Record<string, any>;
  ipHash?: string;
}

export interface SystemStatusInfo {
  kernelVersion: string;
  environment: 'development' | 'production';
  platform: 'Progressive Web App (PWA) / Node.js Express Container';
  isNativeAndroid: false;
  databaseProvider: string;
  authProvider: string;
  notificationProvider: string;
  isMockActive: boolean;
  totalDispatches: number;
  totalAuditEvents: number;
  totalPartners: number;
  totalLocations: number;
  totalNotifications: number;
  superAdminBootstrapAvailable: boolean;
  serverTime: string;
}
