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
  maskedPhone?: string;
  phoneVerified: boolean;
  phoneVerifiedAt?: string;
  avatarUrl?: string;
  role: UserRole; // Active/primary role in current business context
  businessId: string; // Current active business context
  businessName: string;
  memberships: Membership[];
  partnerId?: string; // If RECEIVER role, binds to specific partner entity
  status: 'ACTIVE' | 'SUSPENDED';
  suspendedReason?: string;
  // Fayda e-ID Integration (Ethiopian National ID)
  fan?: string; // Fayda Account Number (16 numeric digits, preserved as string)
  fin?: string; // Fayda Identification Number (12 numeric digits, preserved as string)
  maskedFan?: string; // e.g. "•••• •••• •••• 1234"
  maskedFin?: string; // e.g. "•••• •••• 5678"
  faydaStatus?: 'UNVERIFIED' | 'SIMULATED_VERIFIED' | 'VERIFIED' | 'FAILED' | 'PENDING_REVIEW';
  faydaVerifiedAt?: string;
  faydaVerificationMethod?: 'FAYDA_DEV_SIMULATOR' | 'FAYDA_DEV_SIMULATED' | 'FAYDA_NATIONAL_ID_API';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface FaydaVerificationResult {
  verified: boolean;
  matchScore: number;
  verificationMethod: 'FAYDA_DEV_SIMULATOR' | 'FAYDA_DEV_SIMULATED' | 'FAYDA_NATIONAL_ID_API';
  providerName: string;
  isSimulation: boolean;
  fullNameMatched: boolean;
  phoneMatched: boolean;
  maskedFan: string;
  maskedFin: string;
  timestamp: string;
  error?: string;
  failureReason?: string;
  errorCode?: 'INVALID_FAN' | 'INVALID_FIN' | 'ID_NOT_FOUND' | 'NAME_MISMATCH' | 'PHONE_MISMATCH' | 'PROVIDER_TIMEOUT' | 'PROVIDER_ERROR';
}

export interface OtpChallenge {
  challengeId: string;
  phoneNumber: string;
  purpose: 'REGISTRATION' | 'LOGIN' | 'PASSWORD_RESET' | 'PROFILE_CHANGE';
  expiresAt: number;
  expiresInSeconds: number;
  resendAvailableAt: number;
  attemptsRemaining: number;
  isSimulation: boolean;
  simulatedCode?: string;
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

export interface CargoEvidence {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256Hash: string;
  dataUrl: string; // Base64 data URL
  uploadedAt: string;
  uploadedBy?: string;
  notes?: string;
}

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
  evidence?: CargoEvidence[];
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
  evidence?: CargoEvidence[];
}

export interface ReceiverSignoff {
  signerName: string;
  signerRole: string;
  signedAt: string;
  comments?: string;
  signatureSvgOrBase64?: string; // Captured vector/base64 signature
}

export interface GeoTelemetry {
  latitude: number;
  longitude: number;
  updatedAt?: string;
  speedKmh?: number;
  heading?: number;
  checkpointName?: string;
  source?: 'GPS' | 'DRIVER_SCAN' | 'CHECKPOINT' | 'SIMULATION';
}

export interface RouteWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  label?: string;
  timestamp?: string;
  speedKmh?: number;
  passed?: boolean;
}

export interface DispatchPathHistory {
  plannedWaypoints: RouteWaypoint[];
  actualWaypoints: RouteWaypoint[];
  lastCachedAt?: string;
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
    latitude?: number;
    longitude?: number;
  };
  destinationSnapshot: {
    partnerName: string;
    contactPerson: string;
    phone: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
  currentCoordinates?: GeoTelemetry;
  pathHistory?: DispatchPathHistory;
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

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'WEBHOOK';
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
  // Outbound notification queue & delivery tracking
  providerDeliveryStatus?: 'QUEUED' | 'SENDING' | 'DELIVERED' | 'FAILED' | 'READ';
  deliveryAttempts?: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  payloadPreview?: string;
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

export interface StagingCheckItem {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  remediation?: string;
}

export interface StagingReadinessReport {
  overallStatus: 'READY_FOR_STAGING' | 'NEEDS_CONFIGURATION' | 'IN_DEVELOPMENT';
  evaluatedAt: string;
  categories: {
    buildAndCodeQuality: {
      name: string;
      status: 'PASS' | 'WARN' | 'FAIL';
      checks: StagingCheckItem[];
    };
    identityAndSecurity: {
      name: string;
      status: 'PASS' | 'WARN' | 'FAIL';
      checks: StagingCheckItem[];
    };
    dataAndOperations: {
      name: string;
      status: 'PASS' | 'WARN' | 'FAIL';
      checks: StagingCheckItem[];
    };
    platformAndRelease: {
      name: string;
      status: 'PASS' | 'WARN' | 'FAIL';
      checks: StagingCheckItem[];
    };
  };
  metrics: {
    totalChecks: number;
    passed: number;
    warnings: number;
    failures: number;
  };
}
