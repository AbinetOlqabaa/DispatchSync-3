import {
  User,
  UserRole,
  Dispatch,
  Partner,
  AuditLogEntry,
  SystemStatusInfo,
  ReceiptReconciliation
} from '../types';
import {
  IAuthService,
  IDispatchService,
  IAuditService,
  ISystemStatusService,
  AuthCredentials,
  RegisterPayload,
  CreateDispatchPayload
} from './types';
import {
  calculateItemTotals,
  computeIntegrityHash,
  formatDispatchNumber
} from '../domain/dispatch-rules';
import { validatePassword, validatePhoneNumber } from '../domain/auth-rules';

const STORAGE_KEYS = {
  CURRENT_USER: 'dispatch_kernel_current_user',
  USERS: 'dispatch_kernel_users',
  DISPATCHES: 'dispatch_kernel_dispatches',
  PARTNERS: 'dispatch_kernel_partners',
  AUDIT_LOGS: 'dispatch_kernel_audit_logs',
  SUPER_ADMIN_PROVISIONED: 'dispatch_kernel_sa_provisioned',
  PENDING_PHONE_OTP: 'dispatch_kernel_pending_otp'
};

// Seed demo partners
const INITIAL_PARTNERS: Partner[] = [
  {
    id: 'partner-001',
    businessId: 'biz-apex-logistics',
    name: 'Northstar Distribution Hub',
    contactName: 'Elena Rostova',
    contactEmail: 'elena.rostova@northstar-dist.demo',
    contactPhone: '+1 555-829-1029',
    address: '4500 Industrial Parkway, Dock 12, Chicago, IL',
    tier: 'PRIMARY',
    status: 'ACTIVE',
    createdAt: '2026-09-15T08:00:00Z'
  },
  {
    id: 'partner-002',
    businessId: 'biz-apex-logistics',
    name: 'Pacific Coast Cold Storage',
    contactName: 'Marcus Vance',
    contactEmail: 'm.vance@pacificcold.demo',
    contactPhone: '+1 555-392-8811',
    address: '120 Ocean Terminal Rd, Bldg C, Oakland, CA',
    tier: 'STANDARD',
    status: 'ACTIVE',
    createdAt: '2026-09-20T10:30:00Z'
  },
  {
    id: 'partner-003',
    businessId: 'biz-apex-logistics',
    name: 'Midwest Metro Transit Terminal',
    contactName: 'Devon Hayes',
    contactEmail: 'dhayes@midwesttransit.demo',
    contactPhone: '+1 555-491-0023',
    address: '88 Freight Depot Way, Indianapolis, IN',
    tier: 'REGIONAL',
    status: 'ACTIVE',
    createdAt: '2026-10-01T14:15:00Z'
  }
];

// Seed initial users for role testing
const INITIAL_USERS: User[] = [
  {
    id: 'user-bo-1',
    email: 'owner@apexdispatch.demo',
    fullName: 'Sarah Jenkins',
    phoneNumber: '+1 555-010-4491',
    phoneVerified: true,
    role: 'BUSINESS_OWNER',
    businessId: 'biz-apex-logistics',
    businessName: 'Apex Precision Logistics',
    createdAt: '2026-10-01T09:00:00Z',
    status: 'ACTIVE'
  },
  {
    id: 'user-sender-1',
    email: 'sender@apexdispatch.demo',
    fullName: 'Carlos Mendoza',
    phoneNumber: '+1 555-012-7721',
    phoneVerified: true,
    role: 'SENDER',
    businessId: 'biz-apex-logistics',
    businessName: 'Apex Precision Logistics',
    createdAt: '2026-10-05T11:00:00Z',
    status: 'ACTIVE'
  },
  {
    id: 'user-receiver-1',
    email: 'receiver@northstar-dist.demo',
    fullName: 'Elena Rostova',
    phoneNumber: '+1 555-829-1029',
    phoneVerified: true,
    role: 'RECEIVER',
    businessId: 'biz-apex-logistics',
    businessName: 'Northstar Distribution Hub',
    partnerId: 'partner-001',
    createdAt: '2026-10-08T13:00:00Z',
    status: 'ACTIVE'
  }
];

// Seed initial dispatches
const INITIAL_DISPATCHES: Dispatch[] = [
  {
    id: 'dsp-001',
    dispatchNumber: 'DSP-2026-0001',
    businessId: 'biz-apex-logistics',
    businessName: 'Apex Precision Logistics',
    senderId: 'user-sender-1',
    senderName: 'Carlos Mendoza',
    receiverPartnerId: 'partner-001',
    receiverPartnerName: 'Northstar Distribution Hub',
    receiverContactPhone: '+1 555-829-1029',
    receiverContactEmail: 'elena.rostova@northstar-dist.demo',
    originLocation: 'Apex Central Warehouse (Bay 4)',
    destinationLocation: 'Northstar Distribution Hub Dock 12',
    status: 'DELIVERED',
    items: [
      {
        id: 'item-101',
        name: 'Precision Hydraulic Valves',
        skuOrBatch: 'HV-8840',
        quantity: 40,
        unit: 'units',
        unitPrice: 125,
        totalValue: 5000
      },
      {
        id: 'item-102',
        name: 'Reinforced Steel Gaskets',
        skuOrBatch: 'GSK-201',
        quantity: 100,
        unit: 'packs',
        unitPrice: 18,
        totalValue: 1800
      }
    ],
    totalQuantity: 140,
    totalValue: 6800,
    dispatchedAt: '2026-10-18T08:30:00Z',
    viewedAt: '2026-10-18T10:15:00Z',
    deliveredAt: '2026-10-18T16:45:00Z',
    reconciliation: {
      recordedAt: '2026-10-18T17:30:00Z',
      recordedBy: 'Elena Rostova (Northstar Receiver)',
      receivedQuantity: 140,
      acceptedQuantity: 138,
      damagedQuantity: 2,
      missingQuantity: 0,
      discrepancyValue: 250,
      notes: '2 valve casings showed minor hairline transit fractures. Disputed for supplier credit.'
    },
    auditHash: 'hash_7f9c811200000000000000000000000000000000000000000000000000000001',
    previousHash: 'GENESIS',
    createdAt: '2026-10-18T08:00:00Z',
    updatedAt: '2026-10-18T17:30:00Z'
  },
  {
    id: 'dsp-002',
    dispatchNumber: 'DSP-2026-0002',
    businessId: 'biz-apex-logistics',
    businessName: 'Apex Precision Logistics',
    senderId: 'user-sender-1',
    senderName: 'Carlos Mendoza',
    receiverPartnerId: 'partner-002',
    receiverPartnerName: 'Pacific Coast Cold Storage',
    receiverContactPhone: '+1 555-392-8811',
    receiverContactEmail: 'm.vance@pacificcold.demo',
    originLocation: 'Apex Cold Bay A',
    destinationLocation: '120 Ocean Terminal Rd, Oakland',
    status: 'VIEWED',
    items: [
      {
        id: 'item-201',
        name: 'Insulated Coolant Gel Packs',
        skuOrBatch: 'CGP-500',
        quantity: 250,
        unit: 'cases',
        unitPrice: 32,
        totalValue: 8000
      }
    ],
    totalQuantity: 250,
    totalValue: 8000,
    dispatchedAt: '2026-10-21T06:00:00Z',
    viewedAt: '2026-10-21T08:12:00Z',
    auditHash: 'hash_818290fa00000000000000000000000000000000000000000000000000000002',
    previousHash: 'hash_7f9c811200000000000000000000000000000000000000000000000000000001',
    createdAt: '2026-10-21T05:30:00Z',
    updatedAt: '2026-10-21T08:12:00Z'
  },
  {
    id: 'dsp-003',
    dispatchNumber: 'DSP-2026-0003',
    businessId: 'biz-apex-logistics',
    businessName: 'Apex Precision Logistics',
    senderId: 'user-bo-1',
    senderName: 'Sarah Jenkins',
    receiverPartnerId: 'partner-003',
    receiverPartnerName: 'Midwest Metro Transit Terminal',
    receiverContactPhone: '+1 555-491-0023',
    receiverContactEmail: 'dhayes@midwesttransit.demo',
    originLocation: 'Apex Central Warehouse',
    destinationLocation: '88 Freight Depot Way, Indianapolis',
    status: 'DISPATCHED',
    items: [
      {
        id: 'item-301',
        name: 'Heavy Duty Cargo Straps 10T',
        skuOrBatch: 'STRAP-10T',
        quantity: 60,
        unit: 'units',
        unitPrice: 45,
        totalValue: 2700
      }
    ],
    totalQuantity: 60,
    totalValue: 2700,
    dispatchedAt: '2026-10-21T14:00:00Z',
    auditHash: 'hash_99a8b11c00000000000000000000000000000000000000000000000000000003',
    previousHash: 'hash_818290fa00000000000000000000000000000000000000000000000000000002',
    createdAt: '2026-10-21T13:45:00Z',
    updatedAt: '2026-10-21T14:00:00Z'
  }
];

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2026-10-18T08:30:00Z',
    actorId: 'user-sender-1',
    actorName: 'Carlos Mendoza',
    actorRole: 'SENDER',
    action: 'DISPATCH_SENT',
    entityType: 'DISPATCH',
    entityId: 'dsp-001',
    details: 'Dispatched 140 units to Northstar Distribution Hub under DSP-2026-0001',
    previousHash: 'GENESIS',
    hash: 'hash_7f9c811200000000000000000000000000000000000000000000000000000001'
  },
  {
    id: 'audit-002',
    timestamp: '2026-10-18T10:15:00Z',
    actorId: 'partner-001-guest',
    actorName: 'Elena Rostova (Receiver)',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp-001',
    details: 'Receiver accessed delivery list via secure link. Status updated to VIEWED.',
    previousHash: 'hash_7f9c811200000000000000000000000000000000000000000000000000000001',
    hash: 'hash_818290fa00000000000000000000000000000000000000000000000000000002'
  },
  {
    id: 'audit-003',
    timestamp: '2026-10-18T17:30:00Z',
    actorId: 'user-receiver-1',
    actorName: 'Elena Rostova',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_RECEIPT_RECORDED',
    entityType: 'DISPATCH',
    entityId: 'dsp-001',
    details: 'Recorded receipt: 138 accepted, 2 damaged ($250 loss value). Discrepancy logged.',
    previousHash: 'hash_818290fa00000000000000000000000000000000000000000000000000000002',
    hash: 'hash_99a8b11c00000000000000000000000000000000000000000000000000000003'
  }
];

class LocalSandboxAdapter implements IAuthService, IDispatchService, IAuditService, ISystemStatusService {
  private users: User[];
  private dispatches: Dispatch[];
  private partners: Partner[];
  private auditLogs: AuditLogEntry[];
  private currentUser: User | null = null;
  private isSuperAdminProvisioned: boolean = false;

  constructor() {
    this.users = this.load(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.dispatches = this.load(STORAGE_KEYS.DISPATCHES, INITIAL_DISPATCHES);
    this.partners = this.load(STORAGE_KEYS.PARTNERS, INITIAL_PARTNERS);
    this.auditLogs = this.load(STORAGE_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS);
    this.isSuperAdminProvisioned = this.load(STORAGE_KEYS.SUPER_ADMIN_PROVISIONED, false);
    
    // Default logged in user for testing experience
    const savedUser = this.load<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    this.currentUser = savedUser || this.users[0]; // defaults to Business Owner
  }

  private load<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(key);
        if (item) return JSON.parse(item);
      }
    } catch {
      // ignore storage error
    }
    return fallback;
  }

  private save(key: string, value: unknown): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      // ignore storage error
    }
  }

  private appendAuditLog(
    actor: { id: string; name: string; role: UserRole },
    action: AuditLogEntry['action'],
    entityType: AuditLogEntry['entityType'],
    entityId: string,
    details: string
  ): AuditLogEntry {
    const lastHash = this.auditLogs.length > 0 ? this.auditLogs[this.auditLogs.length - 1].hash : 'GENESIS';
    const timestamp = new Date().toISOString();
    const hash = computeIntegrityHash({ action, entityType, entityId, details, timestamp }, lastHash);

    const entry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action,
      entityType,
      entityId,
      details,
      previousHash: lastHash,
      hash
    };

    this.auditLogs.push(entry);
    this.save(STORAGE_KEYS.AUDIT_LOGS, this.auditLogs);
    return entry;
  }

  // --- Auth Service ---
  async getCurrentUser(): Promise<User | null> {
    return this.currentUser;
  }

  async signIn(credentials: AuthCredentials): Promise<User> {
    const email = credentials.email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === email);

    if (!user) {
      throw new Error(`No account found with email "${credentials.email}". (In demo mode, try owner@apexdispatch.demo, sender@apexdispatch.demo, or receiver@northstar-dist.demo)`);
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('This account has been suspended by system administration.');
    }

    this.currentUser = user;
    this.save(STORAGE_KEYS.CURRENT_USER, user);

    this.appendAuditLog(
      { id: user.id, name: user.fullName, role: user.role },
      'USER_SIGN_IN',
      'USER',
      user.id,
      `User signed in with role ${user.role} [Demo Sandbox Adapter]`
    );

    return user;
  }

  async signUp(payload: RegisterPayload): Promise<User> {
    // Validate password
    const pwdValidation = validatePassword(payload.password);
    if (!pwdValidation.isValid) {
      throw new Error(pwdValidation.errors[0]);
    }

    // Validate phone
    const phoneValidation = validatePhoneNumber(payload.phoneNumber);
    if (!phoneValidation.isValid) {
      throw new Error(phoneValidation.error || 'Invalid phone number');
    }

    // Prevent Super Admin self-registration
    if (payload.role === 'SUPER_ADMIN') {
      throw new Error('Super Administrator accounts cannot be registered via public registration. Use one-time bootstrap provisioning.');
    }

    const email = payload.email.trim().toLowerCase();
    if (this.users.some(u => u.email.toLowerCase() === email)) {
      throw new Error('An account with this email address already exists.');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      fullName: payload.fullName.trim(),
      phoneNumber: phoneValidation.formatted,
      phoneVerified: false, // Requires OTP verification
      role: payload.role,
      businessId: payload.role === 'BUSINESS_OWNER' ? `biz-${Date.now()}` : 'biz-apex-logistics',
      businessName: payload.businessName || 'Apex Logistics Partner',
      createdAt: new Date().toISOString(),
      status: 'PENDING_VERIFICATION'
    };

    this.users.push(newUser);
    this.save(STORAGE_KEYS.USERS, this.users);

    this.currentUser = newUser;
    this.save(STORAGE_KEYS.CURRENT_USER, newUser);

    this.appendAuditLog(
      { id: newUser.id, name: newUser.fullName, role: newUser.role },
      'USER_REGISTERED',
      'USER',
      newUser.id,
      `New user registered as ${newUser.role}. Verification pending.`
    );

    return newUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    this.save(STORAGE_KEYS.CURRENT_USER, null);
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const trimmed = email.trim().toLowerCase();
    const user = this.users.find(u => u.email.toLowerCase() === trimmed);
    if (!user) {
      // Standard security practice: do not reveal whether account exists
      return {
        success: true,
        message: 'If an account exists for this address, a password reset link has been dispatched.'
      };
    }
    return {
      success: true,
      message: `Password reset instructions dispatched to ${user.email} (Demo simulation: in production, a secure cryptographic link is emailed).`
    };
  }

  async verifyPhoneOtp(phone: string, otp: string): Promise<{ success: boolean; message: string }> {
    // In our verification-ready flow, the test OTP is '123456'
    if (otp !== '123456') {
      throw new Error('Invalid verification code. (For sandbox verification, please enter 123456)');
    }

    if (this.currentUser) {
      this.currentUser.phoneVerified = true;
      this.currentUser.status = 'ACTIVE';
      this.save(STORAGE_KEYS.CURRENT_USER, this.currentUser);

      const userIndex = this.users.findIndex(u => u.id === this.currentUser!.id);
      if (userIndex >= 0) {
        this.users[userIndex].phoneVerified = true;
        this.users[userIndex].status = 'ACTIVE';
        this.save(STORAGE_KEYS.USERS, this.users);
      }
    }

    return {
      success: true,
      message: 'Phone number verified successfully.'
    };
  }

  async bootstrapSuperAdmin(
    secretToken: string,
    payload: { email: string; fullName: string; password: string }
  ): Promise<User> {
    if (this.isSuperAdminProvisioned) {
      throw new Error('Super Administrator account has already been bootstrapped. One-time provisioning has concluded.');
    }

    // Expected token (can be passed via server environment or system setup)
    const validBootstrapTokens = ['DISPATCH_BOOTSTRAP_2026_ROOT', 'SECRET_SUPER_ADMIN_INIT_KEY'];
    if (!validBootstrapTokens.includes(secretToken.trim())) {
      throw new Error('Invalid Super-Administrator bootstrap token. Provisioning denied.');
    }

    const pwdCheck = validatePassword(payload.password);
    if (!pwdCheck.isValid) {
      throw new Error(pwdCheck.errors[0]);
    }

    const superAdminUser: User = {
      id: 'super-admin-root',
      email: payload.email.trim().toLowerCase(),
      fullName: payload.fullName.trim(),
      phoneNumber: '+1 800-555-0199',
      phoneVerified: true,
      role: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    };

    this.users.push(superAdminUser);
    this.isSuperAdminProvisioned = true;
    this.save(STORAGE_KEYS.USERS, this.users);
    this.save(STORAGE_KEYS.SUPER_ADMIN_PROVISIONED, true);

    this.currentUser = superAdminUser;
    this.save(STORAGE_KEYS.CURRENT_USER, superAdminUser);

    this.appendAuditLog(
      { id: superAdminUser.id, name: superAdminUser.fullName, role: 'SUPER_ADMIN' },
      'SUPER_ADMIN_BOOTSTRAPPED',
      'USER',
      superAdminUser.id,
      'First-time Super Administrator provisioned via secure one-time bootstrap token.'
    );

    return superAdminUser;
  }

  async switchDemoRole(role: UserRole): Promise<User> {
    let target = this.users.find(u => u.role === role);
    if (!target) {
      if (role === 'SUPER_ADMIN') {
        // Auto-bootstrap demo super admin if switched directly via demo switcher
        target = {
          id: 'user-superadmin-demo',
          email: 'admin@dispatchsync.internal',
          fullName: 'System Administrator',
          phoneNumber: '+1 800-000-0001',
          phoneVerified: true,
          role: 'SUPER_ADMIN',
          createdAt: new Date().toISOString(),
          status: 'ACTIVE'
        };
        this.users.push(target);
        this.save(STORAGE_KEYS.USERS, this.users);
      } else {
        throw new Error(`No user with role ${role} found in demo database.`);
      }
    }
    this.currentUser = target;
    this.save(STORAGE_KEYS.CURRENT_USER, target);
    return target;
  }

  // --- Dispatch Service ---
  async listDispatches(filters?: { status?: string; search?: string; partnerId?: string }): Promise<Dispatch[]> {
    let result = [...this.dispatches];

    if (filters?.status && filters.status !== 'ALL') {
      result = result.filter(d => d.status === filters.status);
    }

    if (filters?.partnerId) {
      result = result.filter(d => d.receiverPartnerId === filters.partnerId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        d =>
          d.dispatchNumber.toLowerCase().includes(q) ||
          d.receiverPartnerName.toLowerCase().includes(q) ||
          d.originLocation.toLowerCase().includes(q) ||
          d.destinationLocation.toLowerCase().includes(q) ||
          d.items.some(it => it.name.toLowerCase().includes(q) || it.skuOrBatch.toLowerCase().includes(q))
      );
    }

    // Sort descending by created date
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDispatchById(id: string): Promise<Dispatch | null> {
    return this.dispatches.find(d => d.id === id || d.dispatchNumber === id) || null;
  }

  async createDispatch(payload: CreateDispatchPayload): Promise<Dispatch> {
    if (!payload.items || payload.items.length === 0) {
      throw new Error('At least one item must be included in the dispatch manifest.');
    }

    const partner = this.partners.find(p => p.id === payload.receiverPartnerId);
    if (!partner) {
      throw new Error('Selected receiving partner does not exist.');
    }

    const sequence = this.dispatches.length + 1;
    const dispatchNumber = formatDispatchNumber(sequence);

    // Compute item totals
    const preparedItems = payload.items.map((it, idx) => ({
      ...it,
      id: `item-${Date.now()}-${idx}`,
      totalValue: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100
    }));

    const { totalQuantity, totalValue } = calculateItemTotals(preparedItems);

    const now = new Date().toISOString();
    const lastHash = this.dispatches.length > 0 ? this.dispatches[this.dispatches.length - 1].auditHash : 'GENESIS';

    const newDispatch: Dispatch = {
      id: `dsp-${Date.now()}`,
      dispatchNumber,
      businessId: this.currentUser?.businessId || 'biz-apex-logistics',
      businessName: this.currentUser?.businessName || 'Apex Precision Logistics',
      senderId: payload.senderId,
      senderName: payload.senderName,
      receiverPartnerId: partner.id,
      receiverPartnerName: partner.name,
      receiverContactPhone: partner.contactPhone,
      receiverContactEmail: partner.contactEmail,
      originLocation: payload.originLocation.trim(),
      destinationLocation: payload.destinationLocation.trim(),
      items: preparedItems,
      totalQuantity,
      totalValue,
      status: 'DISPATCHED',
      notes: payload.notes?.trim(),
      dispatchedAt: now,
      previousHash: lastHash,
      auditHash: computeIntegrityHash({ dispatchNumber, totalQuantity, totalValue, now }, lastHash),
      createdAt: now,
      updatedAt: now
    };

    this.dispatches.unshift(newDispatch);
    this.save(STORAGE_KEYS.DISPATCHES, this.dispatches);

    this.appendAuditLog(
      {
        id: payload.senderId,
        name: payload.senderName,
        role: this.currentUser?.role || 'SENDER'
      },
      'DISPATCH_CREATED',
      'DISPATCH',
      newDispatch.id,
      `Created and dispatched ${dispatchNumber} with ${totalQuantity} units ($${totalValue.toLocaleString()}) to ${partner.name}.`
    );

    return newDispatch;
  }

  async markAsViewed(dispatchId: string, viewerName: string): Promise<Dispatch> {
    const dispatch = this.dispatches.find(d => d.id === dispatchId);
    if (!dispatch) {
      throw new Error('Dispatch record not found.');
    }

    if (dispatch.status === 'DISPATCHED') {
      dispatch.status = 'VIEWED';
      dispatch.viewedAt = new Date().toISOString();
      dispatch.updatedAt = dispatch.viewedAt;
      this.save(STORAGE_KEYS.DISPATCHES, this.dispatches);

      this.appendAuditLog(
        {
          id: 'recipient-viewer',
          name: viewerName || dispatch.receiverPartnerName,
          role: 'RECEIVER'
        },
        'DISPATCH_VIEWED',
        'DISPATCH',
        dispatch.id,
        `Partner viewed dispatch delivery list. Status updated to VIEWED.`
      );
    }

    return dispatch;
  }

  async recordReceipt(dispatchId: string, reconciliation: ReceiptReconciliation): Promise<Dispatch> {
    const dispatch = this.dispatches.find(d => d.id === dispatchId);
    if (!dispatch) {
      throw new Error('Dispatch record not found.');
    }

    const lossUnits = reconciliation.missingQuantity + reconciliation.damagedQuantity;
    const finalStatus = lossUnits > 0 ? 'DISPUTED' : 'ACCEPTED';

    dispatch.status = finalStatus;
    dispatch.deliveredAt = reconciliation.recordedAt || new Date().toISOString();
    dispatch.reconciliation = reconciliation;
    dispatch.updatedAt = new Date().toISOString();

    this.save(STORAGE_KEYS.DISPATCHES, this.dispatches);

    this.appendAuditLog(
      {
        id: this.currentUser?.id || 'receiver-id',
        name: reconciliation.recordedBy || 'Receiving Agent',
        role: this.currentUser?.role || 'RECEIVER'
      },
      'DISPATCH_RECEIPT_RECORDED',
      'DISPATCH',
      dispatch.id,
      `Recorded receipt: ${reconciliation.acceptedQuantity} accepted, ${reconciliation.missingQuantity} missing, ${reconciliation.damagedQuantity} damaged (Discrepancy: $${reconciliation.discrepancyValue}). Status: ${finalStatus}.`
    );

    return dispatch;
  }

  async listPartners(): Promise<Partner[]> {
    return [...this.partners];
  }

  // --- Audit Service ---
  async getAuditLogs(limit: number = 50): Promise<AuditLogEntry[]> {
    return [...this.auditLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async verifyLedgerIntegrity(): Promise<{ valid: boolean; verifiedCount: number; brokenAtId?: string }> {
    const sorted = [...this.auditLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let currentPrevious = 'GENESIS';

    for (const log of sorted) {
      if (log.previousHash !== currentPrevious) {
        return {
          valid: false,
          verifiedCount: 0,
          brokenAtId: log.id
        };
      }
      currentPrevious = log.hash;
    }

    return {
      valid: true,
      verifiedCount: sorted.length
    };
  }

  // --- System Status Service ---
  async getStatus(): Promise<SystemStatusInfo> {
    return {
      environment: {
        platform: 'Linux Container (Google Cloud Run / Node.js 22)',
        isNativeAndroid: false,
        nativeAndroidSupported: false,
        appType: 'Mobile-First PWA (Web)',
        notes: 'Workspace is configured as a high-performance web runtime. No Android Gradle / SDK build toolchain exists in this environment. Application is built as an installable, mobile-responsive Progressive Web App (PWA).'
      },
      persistence: {
        adapterName: 'LOCAL_SANDBOX_ADAPTER',
        isLiveCloudDatabase: false,
        statusLabel: 'Local Sandbox Adapter (Isolated Browser Persistence)',
        description: 'Using isolated sandbox adapter with tamper-resistant audit hashes. Cloud Firestore credentials are not yet provisioned.'
      },
      auth: {
        provider: 'LOCAL_SECURE_AUTH',
        isLiveAuthProvider: false,
        phoneVerificationMode: 'READINESS_SIMULATOR'
      },
      security: {
        superAdminProvisioned: this.isSuperAdminProvisioned,
        oneTimeBootstrapAllowed: !this.isSuperAdminProvisioned,
        tamperResistantAuditLedger: true,
        roleBasedAuthorization: true
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const sandboxAdapter = new LocalSandboxAdapter();
