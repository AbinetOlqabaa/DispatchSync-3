import crypto from 'crypto';
import {
  AuditLogEntry,
  Business,
  DiscrepancyCase,
  Dispatch,
  DispatchLine,
  DispatchStatus,
  ItemCondition,
  Location,
  NotificationItem,
  Partner,
  SystemStatusInfo,
  User,
  UserRole,
  ViewReceipt,
} from '../../types/dispatch.js';
import {
  createSessionToken,
  generatePasswordResetToken,
  generatePhoneCode,
  getBootstrapStatus,
  passwordResetStore,
  phoneVerificationStore,
  redeemBootstrapToken,
  verifySessionToken,
} from '../security.js';
import { AuthSession, IAuthAdapter, IDatabaseAdapter, INotificationAdapter } from '../types.js';

// Pre-seeded Businesses
const businesses: Business[] = [
  {
    id: 'biz_apex_supply',
    name: 'Apex Supply Logistics',
    registrationNumber: 'REG-883921-US',
    countryCode: 'US',
    contactEmail: 'ops@apexsupply.com',
    contactPhone: '+1-555-019-2831',
    address: '104 Logistics Blvd, Industrial Park, Hub 4, Chicago, IL',
    status: 'ACTIVE',
    ownerUserIds: ['usr_business_owner'],
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'biz_metro_retail',
    name: 'Metro Retail Distribution',
    registrationNumber: 'REG-441209-US',
    countryCode: 'US',
    contactEmail: 'supply@metroretail.com',
    contactPhone: '+1-555-014-9922',
    address: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    status: 'ACTIVE',
    ownerUserIds: ['usr_receiver_metro'],
    createdAt: '2026-02-10T09:30:00.000Z',
  },
];

// Pre-seeded Origin Locations
const locations: Location[] = [
  {
    id: 'loc_apex_main',
    businessId: 'biz_apex_supply',
    label: 'Chicago Central Terminal - Dock 4',
    addressLines: '104 Logistics Blvd, Dock 4',
    city: 'Chicago',
    region: 'IL',
    countryCode: 'US',
    isDefault: true,
    latitude: 41.8781,
    longitude: -87.6298,
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'loc_apex_south',
    businessId: 'biz_apex_supply',
    label: 'Joliet Cold-Chain Warehouse - Bay 2',
    addressLines: '450 Cold Storage Way, Bay 2',
    city: 'Joliet',
    region: 'IL',
    countryCode: 'US',
    isDefault: false,
    latitude: 41.5250,
    longitude: -88.0817,
    createdAt: '2026-02-01T09:00:00.000Z',
  },
  {
    id: 'loc_metro_main',
    businessId: 'biz_metro_retail',
    label: 'Minneapolis Receiving Terminal - Dock 12',
    addressLines: '800 Commerce Avenue, Dock 12',
    city: 'Minneapolis',
    region: 'MN',
    countryCode: 'US',
    isDefault: true,
    latitude: 44.9778,
    longitude: -93.2650,
    createdAt: '2026-02-10T10:00:00.000Z',
  },
];

// Pre-seeded Partners (associated with Apex Supply)
const partners: Partner[] = [
  {
    id: 'part_metro_north',
    businessId: 'biz_apex_supply',
    partnerBusinessId: 'biz_metro_retail',
    name: 'Metro Retail North Branch',
    type: 'RETAILER',
    contactPerson: 'David Miller (Receiving Manager)',
    email: 'store@metroretail.com',
    phone: '+1-555-014-4411',
    countryCode: 'US',
    region: 'MN',
    city: 'Minneapolis',
    deliveryAddress: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    latitude: 44.9866,
    longitude: -93.2581,
    notes: 'Forklift required for pallet unloads. Contact dock manager prior to arrival.',
    createdAt: '2026-02-11T10:00:00.000Z',
  },
  {
    id: 'part_summit_depot',
    businessId: 'biz_apex_supply',
    name: 'Summit Wholesale Depot',
    type: 'WHOLESALER',
    contactPerson: 'Sarah Jenkins',
    email: 'logistics@summitwholesale.com',
    phone: '+1-555-017-3388',
    countryCode: 'US',
    region: 'IA',
    city: 'Des Moines',
    deliveryAddress: '2300 Prairie Parkway, Bay 4, Des Moines, IA',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    latitude: 41.5868,
    longitude: -93.6250,
    notes: 'Operating hours 06:00 - 15:00 CST.',
    createdAt: '2026-03-01T11:20:00.000Z',
  },
  {
    id: 'part_urban_market',
    businessId: 'biz_apex_supply',
    name: 'Urban Core Supermarkets',
    type: 'RETAILER',
    contactPerson: 'Marcus Vance',
    email: 'receiving@urbancore.com',
    phone: '+1-555-018-9102',
    countryCode: 'US',
    region: 'IL',
    city: 'Chicago',
    deliveryAddress: '450 Michigan Ave, Freight Entrance, Chicago, IL',
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
    latitude: 41.8818,
    longitude: -87.6232,
    notes: 'Alley entrance. Height clearance 13ft 6in max.',
    createdAt: '2026-03-12T14:45:00.000Z',
  },
];

// In-memory Users store
const users: Array<User & { passwordHash: string }> = [
  {
    id: 'usr_business_owner',
    email: 'owner@apexsupply.com',
    passwordHash: 'Password123!',
    name: 'Eleanor Vance',
    phoneNumber: '+1-555-019-2831',
    phoneVerified: true,
    role: 'BUSINESS_OWNER',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    status: 'ACTIVE',
    memberships: [
      {
        id: 'mem_001',
        userId: 'usr_business_owner',
        businessId: 'biz_apex_supply',
        businessName: 'Apex Supply Logistics',
        role: 'BUSINESS_OWNER',
        status: 'ACTIVE',
        createdAt: '2026-01-15T08:00:00.000Z',
      },
    ],
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
    lastLoginAt: '2026-10-21T13:00:00.000Z',
  },
  {
    id: 'usr_sender_dispatcher',
    email: 'dispatcher@apexsupply.com',
    passwordHash: 'Password123!',
    name: 'Carlos Ruiz',
    phoneNumber: '+1-555-019-5572',
    phoneVerified: true,
    role: 'SENDER',
    businessId: 'biz_apex_supply',
    businessName: 'Apex Supply Logistics',
    status: 'ACTIVE',
    memberships: [
      {
        id: 'mem_002',
        userId: 'usr_sender_dispatcher',
        businessId: 'biz_apex_supply',
        businessName: 'Apex Supply Logistics',
        role: 'SENDER',
        status: 'ACTIVE',
        createdAt: '2026-02-01T08:30:00.000Z',
      },
    ],
    createdAt: '2026-02-01T08:30:00.000Z',
    updatedAt: '2026-02-01T08:30:00.000Z',
    lastLoginAt: '2026-10-21T13:30:00.000Z',
  },
  {
    id: 'usr_receiver_metro',
    email: 'store@metroretail.com',
    passwordHash: 'Password123!',
    name: 'David Miller',
    phoneNumber: '+1-555-014-4411',
    phoneVerified: true,
    role: 'RECEIVER',
    businessId: 'biz_metro_retail',
    businessName: 'Metro Retail Distribution',
    partnerId: 'part_metro_north',
    status: 'ACTIVE',
    memberships: [
      {
        id: 'mem_003',
        userId: 'usr_receiver_metro',
        businessId: 'biz_metro_retail',
        businessName: 'Metro Retail Distribution',
        role: 'RECEIVER',
        status: 'ACTIVE',
        createdAt: '2026-02-11T10:00:00.000Z',
      },
    ],
    createdAt: '2026-02-11T10:00:00.000Z',
    updatedAt: '2026-02-11T10:00:00.000Z',
    lastLoginAt: '2026-10-21T12:45:00.000Z',
  },
  {
    id: 'usr_super_admin',
    email: 'admin@dispatchbridge.internal',
    passwordHash: 'Password123!',
    name: 'System Administrator (Initial Seed)',
    phoneNumber: '+1-555-010-0001',
    phoneVerified: true,
    role: 'SUPER_ADMIN',
    businessId: 'biz_platform',
    businessName: 'DispatchBridge Platform Engine',
    status: 'ACTIVE',
    memberships: [
      {
        id: 'mem_004',
        userId: 'usr_super_admin',
        businessId: 'biz_platform',
        businessName: 'DispatchBridge Platform Engine',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: '2026-10-21T13:50:00.000Z',
  },
];

// In-Memory In-App Notifications Store
const notifications: NotificationItem[] = [
  {
    id: 'notif_001',
    recipientUserId: 'usr_sender_dispatcher',
    businessId: 'biz_apex_supply',
    eventType: 'DISPATCH_VIEWED',
    title: 'Manifest Viewed by Partner',
    message: 'Metro Retail North Branch opened delivery manifest DSP-2026-0081.',
    dispatchId: 'dsp_001',
    dispatchNumber: 'DSP-2026-0081',
    channel: 'IN_APP',
    status: 'DELIVERED',
    isRead: false,
    createdAt: '2026-10-21T08:15:00.000Z',
  },
  {
    id: 'notif_002',
    recipientUserId: 'usr_business_owner',
    businessId: 'biz_apex_supply',
    eventType: 'DISCREPANCY_OPENED',
    title: 'Cargo Discrepancy Reported',
    message: 'Delivery DSP-2026-0078 has 7 units short/damaged. Shortage and transit damage flagged.',
    dispatchId: 'dsp_002',
    dispatchNumber: 'DSP-2026-0078',
    channel: 'IN_APP',
    status: 'DELIVERED',
    isRead: false,
    createdAt: '2026-10-20T14:22:00.000Z',
  },
  {
    id: 'notif_003',
    recipientUserId: 'usr_receiver_metro',
    businessId: 'biz_metro_retail',
    eventType: 'DISPATCH_SUBMITTED',
    title: 'New Inbound Dispatch Sent',
    message: 'Apex Supply Logistics dispatched shipment DSP-2026-0081 with 140 cases.',
    dispatchId: 'dsp_001',
    dispatchNumber: 'DSP-2026-0081',
    channel: 'IN_APP',
    status: 'DELIVERED',
    isRead: true,
    createdAt: '2026-10-21T07:30:00.000Z',
    readAt: '2026-10-21T08:15:00.000Z',
  },
];

// Pre-seeded Dispatches across lifecycle states
const dispatches: Dispatch[] = [
  {
    id: 'dsp_001',
    dispatchNumber: 'DSP-2026-0081',
    senderBusinessId: 'biz_apex_supply',
    senderBusinessName: 'Apex Supply Logistics',
    senderUserId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_metro_north',
    partnerName: 'Metro Retail North Branch',
    originLocationSnapshot: {
      locationId: 'loc_apex_main',
      label: 'Chicago Central Terminal - Dock 4',
      address: '104 Logistics Blvd, Dock 4, Chicago, IL',
    },
    destinationSnapshot: {
      partnerName: 'Metro Retail North Branch',
      contactPerson: 'David Miller (Receiving Manager)',
      phone: '+1-555-014-4411',
      address: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    },
    status: 'VIEWED',
    shareToken: 'sh_a91b2c4d8e7f',
    driverName: 'Robert Lang',
    driverPhone: '+1-555-019-9021',
    vehicleReg: 'TRK-4921',
    dispatchedAt: '2026-10-21T07:30:00.000Z',
    firstViewedAt: '2026-10-21T08:15:00.000Z',
    lastViewedAt: '2026-10-21T08:45:00.000Z',
    viewReceipt: {
      id: 'vr_001',
      dispatchId: 'dsp_001',
      viewerUserId: 'usr_receiver_metro',
      viewerName: 'David Miller',
      viewerBusinessId: 'biz_metro_retail',
      viewerRole: 'RECEIVER',
      firstViewedAt: '2026-10-21T08:15:00.000Z',
      lastViewedAt: '2026-10-21T08:45:00.000Z',
      viewCount: 3,
      ipHash: 'hash_127.0.0.1',
    },
    totalQuantityDispatched: 140,
    lines: [
      {
        id: 'itm_101',
        sku: 'SKU-BEV-001',
        itemName: 'Organic Cold-Brew Espresso (Case of 24 cans)',
        unit: 'cases',
        unitPrice: 38.5,
        quantitySent: 50,
        ordinal: 1,
      },
      {
        id: 'itm_102',
        sku: 'SKU-SNK-009',
        itemName: 'Artisan Sea Salt Crackers (Carton of 12 boxes)',
        unit: 'cartons',
        unitPrice: 24.0,
        quantitySent: 60,
        ordinal: 2,
      },
      {
        id: 'itm_103',
        sku: 'SKU-DRY-042',
        itemName: 'Fair-Trade Rolled Oats 25kg Bulk Bag',
        unit: 'bags',
        unitPrice: 42.0,
        quantitySent: 30,
        ordinal: 3,
      },
    ],
    notes: 'Priority morning delivery. Unload at Bay 3; refrigerated section.',
    version: 1,
    createdAt: '2026-10-21T07:15:00.000Z',
    updatedAt: '2026-10-21T08:15:00.000Z',
  },
  {
    id: 'dsp_002',
    dispatchNumber: 'DSP-2026-0078',
    senderBusinessId: 'biz_apex_supply',
    senderBusinessName: 'Apex Supply Logistics',
    senderUserId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_metro_north',
    partnerName: 'Metro Retail North Branch',
    originLocationSnapshot: {
      locationId: 'loc_apex_main',
      label: 'Chicago Central Terminal - Dock 4',
      address: '104 Logistics Blvd, Dock 4, Chicago, IL',
    },
    destinationSnapshot: {
      partnerName: 'Metro Retail North Branch',
      contactPerson: 'David Miller (Receiving Manager)',
      phone: '+1-555-014-4411',
      address: '800 Commerce Avenue, Dock 12, Minneapolis, MN',
    },
    status: 'PARTIALLY_RECEIVED',
    shareToken: 'sh_e83c7d6b1a09',
    driverName: 'Samira Patel',
    driverPhone: '+1-555-019-4402',
    vehicleReg: 'VAN-8802',
    dispatchedAt: '2026-10-20T09:00:00.000Z',
    firstViewedAt: '2026-10-20T10:05:00.000Z',
    receivedAt: '2026-10-20T14:20:00.000Z',
    totalQuantityDispatched: 100,
    totalQuantityReceived: 93,
    totalQuantityLost: 7,
    lines: [
      {
        id: 'itm_201',
        sku: 'SKU-GLS-101',
        itemName: 'Premium Olive Oil 750ml (Box of 6 glass bottles)',
        unit: 'boxes',
        unitPrice: 54.0,
        quantitySent: 40,
        quantityReceived: 36,
        condition: 'DAMAGED',
        discrepancyType: 'DAMAGED',
        lossQty: 4,
        notes: '4 boxes crushed and leaking onto truck floor upon opening tailgate.',
        ordinal: 1,
      },
      {
        id: 'itm_202',
        sku: 'SKU-SPA-303',
        itemName: 'Artisan Bronze-Die Pasta 500g (Pack of 20)',
        unit: 'packs',
        unitPrice: 32.0,
        quantitySent: 60,
        quantityReceived: 57,
        condition: 'GOOD',
        discrepancyType: 'SHORTAGE',
        lossQty: 3,
        notes: 'Pallet shrinkwrap intact; only 57 packs inside sealed crate.',
        ordinal: 2,
      },
    ],
    discrepancyCases: [
      {
        id: 'disc_001',
        dispatchId: 'dsp_002',
        dispatchNumber: 'DSP-2026-0078',
        lineId: 'itm_201',
        itemName: 'Premium Olive Oil 750ml (Box of 6 glass bottles)',
        type: 'DAMAGED',
        expectedQuantity: 40,
        reportedQuantity: 36,
        shortfallQuantity: 4,
        openedByUserId: 'usr_receiver_metro',
        openedByName: 'David Miller',
        openedAt: '2026-10-20T14:22:00.000Z',
        status: 'OPEN',
        senderResponseNotes: 'Warehouse inspection requested. Freight carrier claim pending.',
      },
      {
        id: 'disc_002',
        dispatchId: 'dsp_002',
        dispatchNumber: 'DSP-2026-0078',
        lineId: 'itm_202',
        itemName: 'Artisan Bronze-Die Pasta 500g (Pack of 20)',
        type: 'SHORTAGE',
        expectedQuantity: 60,
        reportedQuantity: 57,
        shortfallQuantity: 3,
        openedByUserId: 'usr_receiver_metro',
        openedByName: 'David Miller',
        openedAt: '2026-10-20T14:22:00.000Z',
        status: 'ACKNOWLEDGED_BY_SENDER',
        senderResponseNotes: 'Packing slip discrepancy verified at dispatch origin. Shortage acknowledged.',
      },
    ],
    receiverSignoff: {
      signerName: 'David Miller',
      signerRole: 'Receiving Dock Supervisor',
      signedAt: '2026-10-20T14:22:00.000Z',
      comments: 'Loss verified with carrier driver before departure. Credit note requested.',
    },
    notes: 'Fragile liquids included. Handle with forklift only.',
    version: 2,
    createdAt: '2026-10-20T08:45:00.000Z',
    updatedAt: '2026-10-20T14:22:00.000Z',
  },
  {
    id: 'dsp_003',
    dispatchNumber: 'DSP-2026-0065',
    senderBusinessId: 'biz_apex_supply',
    senderBusinessName: 'Apex Supply Logistics',
    senderUserId: 'usr_sender_dispatcher',
    senderName: 'Carlos Ruiz',
    partnerId: 'part_summit_depot',
    partnerName: 'Summit Wholesale Depot',
    originLocationSnapshot: {
      locationId: 'loc_apex_main',
      label: 'Chicago Central Terminal - Dock 4',
      address: '104 Logistics Blvd, Dock 4, Chicago, IL',
    },
    destinationSnapshot: {
      partnerName: 'Summit Wholesale Depot',
      contactPerson: 'Sarah Jenkins',
      phone: '+1-555-017-3388',
      address: '2300 Prairie Parkway, Bay 4, Des Moines, IA',
    },
    status: 'RECONCILED',
    shareToken: 'sh_f12a34b56c78',
    driverName: 'Robert Lang',
    driverPhone: '+1-555-019-9021',
    vehicleReg: 'TRK-4921',
    dispatchedAt: '2026-10-18T06:00:00.000Z',
    firstViewedAt: '2026-10-18T07:10:00.000Z',
    receivedAt: '2026-10-18T13:30:00.000Z',
    reconciledAt: '2026-10-19T10:00:00.000Z',
    totalQuantityDispatched: 200,
    totalQuantityReceived: 200,
    totalQuantityLost: 0,
    lines: [
      {
        id: 'itm_301',
        sku: 'SKU-FLR-001',
        itemName: 'Unbleached Bakers Flour 50lb Sack',
        unit: 'sacks',
        unitPrice: 28.0,
        quantitySent: 200,
        quantityReceived: 200,
        condition: 'GOOD',
        discrepancyType: 'NONE',
        lossQty: 0,
        notes: 'All bags received intact and dry.',
        ordinal: 1,
      },
    ],
    receiverSignoff: {
      signerName: 'Sarah Jenkins',
      signerRole: 'Warehouse Manager',
      signedAt: '2026-10-18T13:35:00.000Z',
      comments: 'Full shipment verified 100% complete.',
    },
    notes: 'Standard freight delivery.',
    version: 3,
    createdAt: '2026-10-18T05:30:00.000Z',
    updatedAt: '2026-10-19T10:00:00.000Z',
  },
];

// Append-only Audit Log Store
const auditLogs: AuditLogEntry[] = [
  {
    id: 'aud_001',
    timestamp: '2026-10-18T05:30:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    businessId: 'biz_apex_supply',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_003',
    correlationId: 'req_init_001',
    details: 'Created dispatch DSP-2026-0065 with 200 sacks of Flour for Summit Wholesale Depot.',
  },
  {
    id: 'aud_002',
    timestamp: '2026-10-18T07:10:00.000Z',
    actorId: 'part_summit_depot',
    actorName: 'Summit Wholesale Depot (Receiver)',
    actorRole: 'RECEIVER',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_003',
    correlationId: 'req_view_001',
    details: 'Delivery list viewed via partner link by receiver.',
  },
  {
    id: 'aud_003',
    timestamp: '2026-10-18T13:35:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'Sarah Jenkins',
    actorRole: 'RECEIVER',
    businessId: 'biz_apex_supply',
    action: 'RECEIPT_RECORDED',
    entityType: 'RECONCILIATION',
    entityId: 'dsp_003',
    correlationId: 'req_rcpt_001',
    details: 'Confirmed 200 items received with 0 loss. Signed off.',
  },
  {
    id: 'aud_004',
    timestamp: '2026-10-20T08:45:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    businessId: 'biz_apex_supply',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_002',
    correlationId: 'req_dsp_002',
    details: 'Created dispatch DSP-2026-0078 with 100 units for Metro Retail North Branch.',
  },
  {
    id: 'aud_005',
    timestamp: '2026-10-20T10:05:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'David Miller',
    actorRole: 'RECEIVER',
    businessId: 'biz_metro_retail',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_002',
    correlationId: 'req_view_002',
    details: 'Receiver viewed delivery manifest DSP-2026-0078.',
  },
  {
    id: 'aud_006',
    timestamp: '2026-10-20T14:22:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'David Miller',
    actorRole: 'RECEIVER',
    businessId: 'biz_metro_retail',
    action: 'DISCREPANCY_OPENED',
    entityType: 'DISCREPANCY',
    entityId: 'dsp_002',
    correlationId: 'req_disc_002',
    details: 'Recorded shortfall: 7 units lost (4 Damaged In Transit, 3 Shortage At Sender).',
  },
  {
    id: 'aud_007',
    timestamp: '2026-10-21T07:15:00.000Z',
    actorId: 'usr_sender_dispatcher',
    actorName: 'Carlos Ruiz',
    actorRole: 'SENDER',
    businessId: 'biz_apex_supply',
    action: 'DISPATCH_CREATED',
    entityType: 'DISPATCH',
    entityId: 'dsp_001',
    correlationId: 'req_dsp_001',
    details: 'Created dispatch DSP-2026-0081 with 140 units for Metro Retail North Branch.',
  },
  {
    id: 'aud_008',
    timestamp: '2026-10-21T08:15:00.000Z',
    actorId: 'usr_receiver_metro',
    actorName: 'David Miller',
    actorRole: 'RECEIVER',
    businessId: 'biz_metro_retail',
    action: 'DISPATCH_VIEWED',
    entityType: 'DISPATCH',
    entityId: 'dsp_001',
    correlationId: 'req_view_001',
    details: 'Partner acknowledged and viewed manifest DSP-2026-0081.',
  },
];

// Idempotency keys store
const idempotencyStore = new Map<string, any>();

export class SandboxStore implements IAuthAdapter, IDatabaseAdapter, INotificationAdapter {
  readonly isMock = true;
  readonly providerName = 'Sandbox In-Memory / Dev State';

  // --- Auth Adapter ---
  async login(email: string, password: string): Promise<AuthSession> {
    const userRecord = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!userRecord) {
      throw new Error('Invalid email or password.');
    }

    if (userRecord.passwordHash !== password) {
      throw new Error('Invalid email or password.');
    }

    if (userRecord.status === 'SUSPENDED') {
      throw new Error('Account suspended. Please contact platform administrator.');
    }

    userRecord.lastLoginAt = new Date().toISOString();
    const { passwordHash, ...safeUser } = userRecord;
    const token = createSessionToken(safeUser.id, safeUser.role);

    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: safeUser.role,
      businessId: safeUser.businessId,
      action: 'USER_LOGIN',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `User ${safeUser.email} authenticated successfully.`,
    });

    return {
      token,
      user: safeUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
  }

  async register(payload: {
    email: string;
    password: string;
    name: string;
    phoneNumber: string;
    businessName: string;
    role: UserRole;
    partnerId?: string;
  }): Promise<AuthSession> {
    const normalizedEmail = payload.email.toLowerCase().trim();
    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    if (payload.password.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }

    const newUserId = 'usr_' + crypto.randomBytes(6).toString('hex');
    const newBusinessId = 'biz_' + crypto.randomBytes(4).toString('hex');

    const newBusiness: Business = {
      id: newBusinessId,
      name: payload.businessName.trim(),
      countryCode: 'US',
      contactEmail: normalizedEmail,
      contactPhone: payload.phoneNumber.trim(),
      address: 'Registered Office',
      status: 'ACTIVE',
      ownerUserIds: [newUserId],
      createdAt: new Date().toISOString(),
    };
    businesses.push(newBusiness);

    // Create default origin location for this business
    locations.push({
      id: 'loc_' + crypto.randomBytes(4).toString('hex'),
      businessId: newBusinessId,
      label: 'Main Office & Warehouse',
      addressLines: 'Primary Commercial Location',
      city: 'Industrial Center',
      region: 'State',
      countryCode: 'US',
      isDefault: true,
      createdAt: new Date().toISOString(),
    });

    const newUserRecord: User & { passwordHash: string } = {
      id: newUserId,
      email: normalizedEmail,
      passwordHash: payload.password,
      name: payload.name.trim(),
      phoneNumber: payload.phoneNumber.trim(),
      phoneVerified: false,
      role: payload.role,
      businessId: newBusinessId,
      businessName: payload.businessName.trim(),
      partnerId: payload.partnerId,
      status: 'ACTIVE',
      memberships: [
        {
          id: 'mem_' + crypto.randomBytes(4).toString('hex'),
          userId: newUserId,
          businessId: newBusinessId,
          businessName: payload.businessName.trim(),
          role: payload.role,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUserRecord);

    const { passwordHash, ...safeUser } = newUserRecord;
    const token = createSessionToken(safeUser.id, safeUser.role);

    generatePhoneCode(safeUser.id);

    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: safeUser.role,
      businessId: safeUser.businessId,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `New account registered as ${safeUser.role} for business ${safeUser.businessName}.`,
    });

    return {
      token,
      user: safeUser,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
    };
  }

  async verifyToken(token: string): Promise<User | null> {
    const session = verifySessionToken(token);
    if (!session) return null;
    const found = users.find((u) => u.id === session.userId);
    if (!found || found.status === 'SUSPENDED') return null;
    const { passwordHash, ...safeUser } = found;
    return safeUser;
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; resetTokenPreview?: string }> {
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { success: true };
    }

    const token = generatePasswordResetToken(user.email);

    await this.recordAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      businessId: user.businessId,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      details: `Password reset link requested for ${user.email}.`,
    });

    return { success: true, resetTokenPreview: token };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const entry = passwordResetStore.get(token);
    if (!entry) {
      throw new Error('Invalid or expired password reset token.');
    }
    if (Date.now() > entry.expiresAt) {
      passwordResetStore.delete(token);
      throw new Error('Password reset token has expired. Please request a new one.');
    }

    const user = users.find((u) => u.email.toLowerCase() === entry.email.toLowerCase());
    if (!user) {
      throw new Error('User not found.');
    }

    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long.');
    }

    user.passwordHash = newPassword;
    user.updatedAt = new Date().toISOString();
    passwordResetStore.delete(token);

    await this.recordAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      businessId: user.businessId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      details: `Password changed successfully for ${user.email}.`,
    });

    return { success: true };
  }

  async verifyPhoneNumber(userId: string, code: string): Promise<{ success: boolean }> {
    const entry = phoneVerificationStore.get(userId);
    if (!entry) {
      throw new Error('No active verification code for this user.');
    }
    if (Date.now() > entry.expiresAt) {
      phoneVerificationStore.delete(userId);
      throw new Error('Verification code expired. Please request a new code.');
    }
    if (entry.code !== code.trim()) {
      throw new Error('Incorrect verification code. Please check your SMS and try again.');
    }

    const user = users.find((u) => u.id === userId);
    if (user) {
      user.phoneVerified = true;
      user.updatedAt = new Date().toISOString();
    }
    phoneVerificationStore.delete(userId);

    return { success: true };
  }

  isSuperAdminBootstrapAvailable(): boolean {
    return getBootstrapStatus().isAvailable;
  }

  async bootstrapSuperAdmin(
    secret: string,
    payload: { email: string; password: string; name: string }
  ): Promise<{ success: boolean; user: User }> {
    const isValid = redeemBootstrapToken(secret);
    if (!isValid) {
      throw new Error('Invalid or already consumed Super-Administrator bootstrap token.');
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      existing.role = 'SUPER_ADMIN';
      existing.name = payload.name;
      existing.passwordHash = payload.password;
      existing.updatedAt = new Date().toISOString();

      const { passwordHash, ...safeUser } = existing;
      await this.recordAudit({
        actorId: safeUser.id,
        actorName: safeUser.name,
        actorRole: 'SUPER_ADMIN',
        action: 'SUPERADMIN_BOOTSTRAP',
        entityType: 'USER',
        entityId: safeUser.id,
        details: `Existing user ${safeUser.email} promoted to first Super-Admin via one-time bootstrap token.`,
      });
      return { success: true, user: safeUser };
    }

    const newAdmin: User & { passwordHash: string } = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      email: normalizedEmail,
      passwordHash: payload.password,
      name: payload.name,
      phoneNumber: '+1-000-000-0000',
      phoneVerified: true,
      role: 'SUPER_ADMIN',
      businessId: 'biz_platform',
      businessName: 'DispatchBridge Platform Engine',
      status: 'ACTIVE',
      memberships: [
        {
          id: 'mem_admin',
          userId: 'usr_admin',
          businessId: 'biz_platform',
          businessName: 'DispatchBridge Platform Engine',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.push(newAdmin);
    const { passwordHash, ...safeUser } = newAdmin;

    await this.recordAudit({
      actorId: safeUser.id,
      actorName: safeUser.name,
      actorRole: 'SUPER_ADMIN',
      action: 'SUPERADMIN_BOOTSTRAP',
      entityType: 'USER',
      entityId: safeUser.id,
      details: `New Super-Admin ${safeUser.email} provisioned via verified one-time bootstrap token.`,
    });

    return { success: true, user: safeUser };
  }

  async switchActiveBusiness(userId: string, targetBusinessId: string): Promise<User> {
    const user = users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');

    const membership = user.memberships.find((m) => m.businessId === targetBusinessId);
    if (!membership && user.role !== 'SUPER_ADMIN') {
      throw new Error('Forbidden: You do not have membership in the requested business.');
    }

    const targetBiz = businesses.find((b) => b.id === targetBusinessId);
    if (!targetBiz) throw new Error('Target business does not exist.');

    user.businessId = targetBiz.id;
    user.businessName = targetBiz.name;
    if (membership) {
      user.role = membership.role;
    }
    user.updatedAt = new Date().toISOString();

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // --- Database Adapter: Dispatches ---
  async getDispatches(filter?: {
    businessId?: string;
    partnerId?: string;
    status?: string;
    role?: UserRole;
  }): Promise<Dispatch[]> {
    let result = [...dispatches];

    if (filter?.role === 'SUPER_ADMIN') {
      // Super admin sees all dispatches
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filter?.role === 'RECEIVER') {
      if (filter.partnerId) {
        result = result.filter((d) => d.partnerId === filter.partnerId);
      }
    } else if (filter?.businessId) {
      result = result.filter((d) => d.senderBusinessId === filter.businessId);
    }

    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status);
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getDispatchById(
    id: string,
    userContext?: { role: UserRole; businessId: string; partnerId?: string }
  ): Promise<Dispatch | null> {
    const found = dispatches.find((d) => d.id === id);
    if (!found) return null;

    if (userContext && userContext.role !== 'SUPER_ADMIN') {
      if (userContext.role === 'RECEIVER') {
        if (userContext.partnerId && found.partnerId !== userContext.partnerId) {
          throw new Error('403 Forbidden: Access denied to unrelated partner dispatch.');
        }
      } else if (found.senderBusinessId !== userContext.businessId) {
        throw new Error('403 Forbidden: Access denied to unrelated business dispatch.');
      }
    }

    return JSON.parse(JSON.stringify(found));
  }

  async getDispatchByShareToken(token: string): Promise<Dispatch | null> {
    const found = dispatches.find((d) => d.shareToken === token);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  async createDispatch(
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
  ): Promise<Dispatch> {
    // Idempotency check
    if (payload.idempotencyKey && idempotencyStore.has(payload.idempotencyKey)) {
      return idempotencyStore.get(payload.idempotencyKey);
    }

    if (!payload.lines || payload.lines.length === 0) {
      throw new Error('A dispatch must include at least one cargo item line.');
    }

    for (let i = 0; i < payload.lines.length; i++) {
      const line = payload.lines[i];
      if (!line.itemName || !line.itemName.trim()) {
        throw new Error(`Item line #${i + 1} is missing a description.`);
      }
      if (typeof line.quantitySent !== 'number' || isNaN(line.quantitySent) || line.quantitySent <= 0) {
        throw new Error(`Item line #${i + 1} (${line.itemName}) must have a valid positive quantity.`);
      }
    }

    const partner = partners.find((p) => p.id === payload.partnerId);
    if (!partner) {
      throw new Error('Selected receiving partner does not exist.');
    }

    // Resolve Origin Location Snapshot
    let originLabel = payload.originLocationLabel;
    let originAddr = payload.originAddress;
    if (payload.originLocationId) {
      const loc = locations.find((l) => l.id === payload.originLocationId);
      if (loc) {
        originLabel = loc.label;
        originAddr = `${loc.addressLines}, ${loc.city}, ${loc.region}`;
      }
    }

    const nextId = 'dsp_' + crypto.randomBytes(4).toString('hex');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const dispatchNumber = `DSP-2026-${randomCode}`;
    const shareToken = 'sh_' + crypto.randomBytes(8).toString('hex');

    const totalQty = payload.lines.reduce((sum, line) => sum + Number(line.quantitySent), 0);
    const now = new Date().toISOString();

    const dispatchLines: DispatchLine[] = payload.lines.map((line, idx) => ({
      id: `line_${nextId}_${idx + 1}`,
      sku: line.sku?.trim() || `SKU-${String(idx + 1).padStart(3, '0')}`,
      itemName: line.itemName.trim(),
      unit: line.unit || 'cases',
      unitPrice: line.unitPrice || 0,
      quantitySent: Number(line.quantitySent),
      notes: line.notes || '',
      ordinal: idx + 1,
    }));

    const newDispatch: Dispatch = {
      id: nextId,
      dispatchNumber,
      senderBusinessId: actor.businessId,
      senderBusinessName: actor.businessName,
      senderUserId: actor.id,
      senderName: actor.name,
      partnerId: partner.id,
      partnerName: partner.name,
      originLocationSnapshot: {
        locationId: payload.originLocationId,
        label: originLabel,
        address: originAddr,
      },
      destinationSnapshot: {
        partnerName: partner.name,
        contactPerson: partner.contactPerson,
        phone: partner.phone,
        address: payload.destinationAddress || partner.deliveryAddress,
      },
      status: 'DISPATCHED',
      lines: dispatchLines,
      totalQuantityDispatched: totalQty,
      shareToken,
      driverName: payload.driverName?.trim() || '',
      driverPhone: payload.driverPhone?.trim() || '',
      vehicleReg: payload.vehicleReg?.trim() || '',
      dispatchedAt: now,
      notes: payload.notes?.trim() || '',
      idempotencyKey: payload.idempotencyKey,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    dispatches.unshift(newDispatch);

    if (payload.idempotencyKey) {
      idempotencyStore.set(payload.idempotencyKey, newDispatch);
    }

    // Record audit log
    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: actor.businessId,
      action: 'DISPATCH_CREATED',
      entityType: 'DISPATCH',
      entityId: newDispatch.id,
      details: `Created dispatch ${newDispatch.dispatchNumber} to ${partner.name} (${totalQty} units).`,
      metadata: {
        partnerId: partner.id,
        lineCount: newDispatch.lines.length,
        driver: newDispatch.driverName,
      },
    });

    // Create In-App Notification for receiver if linked
    if (partner.partnerBusinessId) {
      const receiverUser = users.find((u) => u.businessId === partner.partnerBusinessId);
      if (receiverUser) {
        await this.createNotification({
          recipientUserId: receiverUser.id,
          businessId: partner.partnerBusinessId,
          eventType: 'DISPATCH_SUBMITTED',
          title: 'Inbound Delivery Dispatched',
          message: `${actor.businessName} dispatched shipment ${newDispatch.dispatchNumber} (${totalQty} units).`,
          dispatchId: newDispatch.id,
          dispatchNumber: newDispatch.dispatchNumber,
          channel: 'IN_APP',
          status: 'DELIVERED',
        });
      }
    }

    await this.notifyDispatchSubmitted(newDispatch, partner);

    return JSON.parse(JSON.stringify(newDispatch));
  }

  async recordViewReceipt(
    dispatchId: string,
    viewer: { id: string; name: string; role: UserRole; businessId?: string },
    ipHash?: string
  ): Promise<{ dispatch: Dispatch; viewReceipt: ViewReceipt }> {
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (!dispatch) throw new Error('Dispatch not found.');

    const now = new Date().toISOString();
    const isFirstView = !dispatch.firstViewedAt;

    if (isFirstView) {
      dispatch.firstViewedAt = now;
      if (dispatch.status === 'DISPATCHED' || dispatch.status === 'SUBMITTED') {
        dispatch.status = 'VIEWED';
      }
    }
    dispatch.lastViewedAt = now;
    dispatch.updatedAt = now;

    if (!dispatch.viewReceipt) {
      dispatch.viewReceipt = {
        id: 'vr_' + crypto.randomBytes(4).toString('hex'),
        dispatchId: dispatch.id,
        viewerUserId: viewer.id,
        viewerName: viewer.name,
        viewerBusinessId: viewer.businessId,
        viewerRole: viewer.role,
        firstViewedAt: now,
        lastViewedAt: now,
        viewCount: 1,
        ipHash: ipHash || 'ip_anonymous',
      };
    } else {
      dispatch.viewReceipt.lastViewedAt = now;
      dispatch.viewReceipt.viewCount += 1;
    }

    if (isFirstView) {
      await this.recordAudit({
        actorId: viewer.id,
        actorName: viewer.name,
        actorRole: viewer.role,
        businessId: dispatch.senderBusinessId,
        action: 'DISPATCH_VIEWED',
        entityType: 'DISPATCH',
        entityId: dispatch.id,
        details: `Delivery list ${dispatch.dispatchNumber} viewed by receiver ${viewer.name}.`,
        metadata: { ipHash },
      });

      // In-app notification to sender
      await this.createNotification({
        recipientUserId: dispatch.senderUserId,
        businessId: dispatch.senderBusinessId,
        eventType: 'DISPATCH_VIEWED',
        title: 'Partner Viewed Manifest',
        message: `${dispatch.partnerName} opened delivery manifest ${dispatch.dispatchNumber}.`,
        dispatchId: dispatch.id,
        dispatchNumber: dispatch.dispatchNumber,
        channel: 'IN_APP',
        status: 'DELIVERED',
      });

      await this.notifyDispatchViewed(dispatch, viewer.name);
    }

    return {
      dispatch: JSON.parse(JSON.stringify(dispatch)),
      viewReceipt: JSON.parse(JSON.stringify(dispatch.viewReceipt)),
    };
  }

  async recordReceiptReport(
    id: string,
    payload: {
      lines: Array<{
        id: string;
        quantityReceived: number;
        condition: ItemCondition;
        discrepancyType: any;
        notes?: string;
      }>;
      signoff: {
        signerName: string;
        signerRole: string;
        comments?: string;
      };
      idempotencyKey?: string;
    },
    actor: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === id);
    if (!dispatch) throw new Error('Dispatch not found.');

    let totalRecv = 0;
    let totalLoss = 0;
    const newDiscrepancyCases: DiscrepancyCase[] = [];

    const updatedLines = dispatch.lines.map((orig) => {
      const update = payload.lines.find((l) => l.id === orig.id);
      if (!update) return orig;

      const received = Math.max(0, Number(update.quantityReceived) || 0);
      const loss = Math.max(0, orig.quantitySent - received);
      totalRecv += received;
      totalLoss += loss;

      let discType = update.discrepancyType;
      if (loss === 0 && (!discType || discType === 'NONE')) {
        discType = 'NONE';
      } else if (loss > 0 && (!discType || discType === 'NONE')) {
        discType = update.condition === 'DAMAGED' ? 'DAMAGED' : 'SHORTAGE';
      }

      if (loss > 0 || update.condition === 'DAMAGED') {
        newDiscrepancyCases.push({
          id: 'disc_' + crypto.randomBytes(4).toString('hex'),
          dispatchId: dispatch.id,
          dispatchNumber: dispatch.dispatchNumber,
          lineId: orig.id,
          itemName: orig.itemName,
          type: discType,
          expectedQuantity: orig.quantitySent,
          reportedQuantity: received,
          shortfallQuantity: loss,
          openedByUserId: actor.id,
          openedByName: actor.name,
          openedAt: new Date().toISOString(),
          status: 'OPEN',
          notes: update.notes || '',
        });
      }

      return {
        ...orig,
        quantityReceived: received,
        condition: update.condition || 'GOOD',
        discrepancyType: discType,
        lossQty: loss,
        notes: update.notes || orig.notes,
      };
    });

    const now = new Date().toISOString();
    dispatch.lines = updatedLines;
    dispatch.totalQuantityReceived = totalRecv;
    dispatch.totalQuantityLost = totalLoss;
    dispatch.receivedAt = now;
    dispatch.receiverSignoff = {
      signerName: payload.signoff.signerName,
      signerRole: payload.signoff.signerRole,
      signedAt: now,
      comments: payload.signoff.comments,
    };

    if (totalLoss > 0) {
      dispatch.status = 'PARTIALLY_RECEIVED';
      dispatch.discrepancyCases = (dispatch.discrepancyCases || []).concat(newDiscrepancyCases);
    } else {
      dispatch.status = 'RECEIVED';
    }

    dispatch.version += 1;
    dispatch.updatedAt = now;

    // Audit
    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: dispatch.senderBusinessId,
      action: totalLoss > 0 ? 'RECEIPT_DISCREPANCY_RECORDED' : 'RECEIPT_RECORDED',
      entityType: 'RECONCILIATION',
      entityId: dispatch.id,
      details: `Delivery receipt confirmed by ${payload.signoff.signerName}. Sent: ${dispatch.totalQuantityDispatched}, Received: ${totalRecv}, Loss: ${totalLoss}.`,
      metadata: { totalReceived: totalRecv, totalLoss, status: dispatch.status },
    });

    // Notify sender & owner
    await this.createNotification({
      recipientUserId: dispatch.senderUserId,
      businessId: dispatch.senderBusinessId,
      eventType: totalLoss > 0 ? 'DISCREPANCY_OPENED' : 'RECEIPT_SUBMITTED',
      title: totalLoss > 0 ? 'Delivery Shortfall / Loss Flagged' : 'Delivery Received Complete',
      message: `${dispatch.partnerName} submitted receipt for ${dispatch.dispatchNumber}. Received: ${totalRecv}/${dispatch.totalQuantityDispatched} units.`,
      dispatchId: dispatch.id,
      dispatchNumber: dispatch.dispatchNumber,
      channel: 'IN_APP',
      status: 'DELIVERED',
    });

    await this.notifyReceiptSubmitted(dispatch, totalLoss > 0);

    return JSON.parse(JSON.stringify(dispatch));
  }

  async respondToDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { status: 'ACKNOWLEDGED_BY_SENDER' | 'DISPUTED'; responseNotes: string },
    actor: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (!dispatch) throw new Error('Dispatch not found.');

    const targetCase = dispatch.discrepancyCases?.find((c) => c.id === caseId);
    if (!targetCase) throw new Error('Discrepancy case not found.');

    targetCase.status = payload.status;
    targetCase.senderResponseNotes = payload.responseNotes.trim();
    dispatch.version += 1;
    dispatch.updatedAt = new Date().toISOString();

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: dispatch.senderBusinessId,
      action: 'DISCREPANCY_RESPONDED',
      entityType: 'DISCREPANCY',
      entityId: targetCase.id,
      details: `Sender responded to discrepancy on ${dispatch.dispatchNumber}: ${payload.status}. Notes: ${payload.responseNotes}`,
    });

    await this.notifyDiscrepancyStatus(dispatch, targetCase);

    return JSON.parse(JSON.stringify(dispatch));
  }

  async resolveDiscrepancy(
    dispatchId: string,
    caseId: string,
    payload: { resolution: string },
    actor: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (!dispatch) throw new Error('Dispatch not found.');

    const targetCase = dispatch.discrepancyCases?.find((c) => c.id === caseId);
    if (!targetCase) throw new Error('Discrepancy case not found.');

    const now = new Date().toISOString();
    targetCase.status = 'RESOLVED';
    targetCase.resolution = payload.resolution.trim();
    targetCase.resolvedByUserId = actor.id;
    targetCase.resolvedByName = actor.name;
    targetCase.resolvedAt = now;

    // Check if all cases are resolved
    const allResolved = dispatch.discrepancyCases?.every((c) => c.status === 'RESOLVED');
    if (allResolved) {
      dispatch.status = 'RECONCILED';
      dispatch.reconciledAt = now;
    }

    dispatch.version += 1;
    dispatch.updatedAt = now;

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: dispatch.senderBusinessId,
      action: 'DISCREPANCY_RESOLVED',
      entityType: 'DISCREPANCY',
      entityId: targetCase.id,
      details: `Discrepancy case ${targetCase.id} on ${dispatch.dispatchNumber} resolved: ${payload.resolution}`,
    });

    return JSON.parse(JSON.stringify(dispatch));
  }

  async finalizeReconciliation(
    id: string,
    payload: { resolutionNotes: string },
    actor: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === id);
    if (!dispatch) throw new Error('Dispatch not found.');

    const now = new Date().toISOString();
    dispatch.status = 'RECONCILED';
    dispatch.reconciledAt = now;
    dispatch.notes =
      (dispatch.notes ? dispatch.notes + '\n\n' : '') +
      `[Reconciliation Finalized by ${actor.name} on ${new Date().toLocaleDateString()}]: ${payload.resolutionNotes}`;

    // Mark all cases as resolved
    dispatch.discrepancyCases?.forEach((c) => {
      c.status = 'RESOLVED';
      c.resolution = c.resolution || payload.resolutionNotes;
      c.resolvedByUserId = actor.id;
      c.resolvedByName = actor.name;
      c.resolvedAt = now;
    });

    dispatch.version += 1;
    dispatch.updatedAt = now;

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: dispatch.senderBusinessId,
      action: 'RECONCILIATION_FINALIZED',
      entityType: 'RECONCILIATION',
      entityId: dispatch.id,
      details: `Reconciliation closed and finalized for ${dispatch.dispatchNumber}. Resolution: ${payload.resolutionNotes}`,
    });

    await this.notifyReconciliationCompleted(dispatch);

    return JSON.parse(JSON.stringify(dispatch));
  }

  // --- Locations ---
  async getLocations(businessId: string): Promise<Location[]> {
    return locations.filter((l) => l.businessId === businessId);
  }

  async createLocation(location: Omit<Location, 'id' | 'createdAt'>, actor: User): Promise<Location> {
    const newLocation: Location = {
      ...location,
      id: 'loc_' + crypto.randomBytes(4).toString('hex'),
      createdAt: new Date().toISOString(),
    };
    locations.push(newLocation);

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: actor.businessId,
      action: 'LOCATION_CREATED',
      entityType: 'LOCATION',
      entityId: newLocation.id,
      details: `Added dispatch origin location: ${newLocation.label}.`,
    });

    return newLocation;
  }

  // --- Partners ---
  async getPartners(businessId?: string): Promise<Partner[]> {
    if (businessId) {
      return partners.filter((p) => p.businessId === businessId);
    }
    return [...partners];
  }

  async createPartner(partner: Omit<Partner, 'id' | 'createdAt'>, actor: User): Promise<Partner> {
    if (!partner.name || !partner.email) {
      throw new Error('Partner company name and email are required.');
    }

    const nextId = 'part_' + crypto.randomBytes(4).toString('hex');
    const newPartner: Partner = {
      ...partner,
      id: nextId,
      businessId: actor.businessId,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      createdAt: new Date().toISOString(),
    };

    partners.push(newPartner);

    await this.recordAudit({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      businessId: actor.businessId,
      action: 'PARTNER_REGISTERED',
      entityType: 'PARTNER',
      entityId: newPartner.id,
      details: `Registered receiving partner ${newPartner.name} (${newPartner.type}).`,
    });

    return newPartner;
  }

  // --- Notifications ---
  async getNotifications(userId: string): Promise<NotificationItem[]> {
    return notifications
      .filter((n) => n.recipientUserId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    const notif = notifications.find((n) => n.id === notificationId && n.recipientUserId === userId);
    if (notif) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const now = new Date().toISOString();
    notifications
      .filter((n) => n.recipientUserId === userId && !n.isRead)
      .forEach((n) => {
        n.isRead = true;
        n.readAt = now;
      });
  }

  async createNotification(item: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...item,
      id: 'notif_' + crypto.randomBytes(4).toString('hex'),
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(newNotif);
    return newNotif;
  }

  // --- Audit ---
  async getAuditLogs(filter?: { limitCount?: number; businessId?: string }): Promise<AuditLogEntry[]> {
    let result = [...auditLogs];
    if (filter?.businessId) {
      result = result.filter((l) => !l.businessId || l.businessId === filter.businessId);
    }
    return result
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, filter?.limitCount || 100);
  }

  async recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: 'aud_' + crypto.randomBytes(4).toString('hex'),
      timestamp: new Date().toISOString(),
    };
    auditLogs.unshift(fullEntry);
    return fullEntry;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return [...businesses];
  }

  async getSystemStatus(): Promise<SystemStatusInfo> {
    return {
      kernelVersion: '0.2.0-master',
      environment: (process.env.NODE_ENV as any) || 'development',
      platform: 'Progressive Web App (PWA) / Node.js Express Container',
      isNativeAndroid: false,
      databaseProvider: 'Sandbox In-Memory / Dev State',
      authProvider: 'Sandbox Mock JWT',
      notificationProvider: 'In-App Notifications Hub + SMS Simulator',
      isMockActive: true,
      totalDispatches: dispatches.length,
      totalAuditEvents: auditLogs.length,
      totalPartners: partners.length,
      totalLocations: locations.length,
      totalNotifications: notifications.length,
      superAdminBootstrapAvailable: getBootstrapStatus().isAvailable,
      serverTime: new Date().toISOString(),
    };
  }

  // --- Notification Adapters ---
  async notifyDispatchSubmitted(dispatch: Dispatch, partner: Partner): Promise<void> {
    console.log(`[NOTIFICATION DISPATCH] Alert queued for partner ${partner.name} <${partner.email}>.`);
  }

  async notifyDispatchViewed(dispatch: Dispatch, viewerName: string): Promise<void> {
    console.log(`[NOTIFICATION VIEWED] Alert queued for dispatcher ${dispatch.senderName}: Manifest viewed by ${viewerName}.`);
  }

  async notifyReceiptSubmitted(dispatch: Dispatch, hasDiscrepancy: boolean): Promise<void> {
    console.log(`[NOTIFICATION RECEIPT] Alert: Delivery receipt confirmed (Discrepancy: ${hasDiscrepancy}).`);
  }

  async notifyDiscrepancyStatus(dispatch: Dispatch, discrepancyCase: DiscrepancyCase): Promise<void> {
    console.log(`[NOTIFICATION DISCREPANCY] Case ${discrepancyCase.id} updated to ${discrepancyCase.status}.`);
  }

  async notifyReconciliationCompleted(dispatch: Dispatch): Promise<void> {
    console.log(`[NOTIFICATION RECONCILIATION] Reconciliation finalized and confirmed for ${dispatch.dispatchNumber}.`);
  }

  async recordTransitScan(
    dispatchId: string,
    payload: {
      barcode: string;
      statusUpdate?: DispatchStatus;
      checkpointLocation?: string;
      driverNotes?: string;
      scannedLineIds?: string[];
      actorName?: string;
    },
    actor?: User
  ): Promise<Dispatch> {
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (!dispatch) throw new Error('Dispatch not found.');

    const now = new Date().toISOString();
    if (payload.statusUpdate) {
      dispatch.status = payload.statusUpdate;
    } else if (dispatch.status === 'DISPATCHED' || dispatch.status === 'VIEWED') {
      dispatch.status = 'IN_TRANSIT';
    }

    // Update scanned lines notes if provided
    if (payload.scannedLineIds && payload.scannedLineIds.length > 0) {
      dispatch.lines.forEach((l) => {
        if (payload.scannedLineIds?.includes(l.id)) {
          l.notes = (l.notes ? `${l.notes} | ` : '') + `Verified package barcode: ${payload.barcode} at ${now}`;
        }
      });
    }

    dispatch.version += 1;
    dispatch.updatedAt = now;

    const actorId = actor ? actor.id : 'carrier_driver';
    const actorName = actor ? actor.name : (payload.actorName || dispatch.driverName || 'Courier Driver');
    const actorRole = actor ? actor.role : 'SENDER';

    await this.recordAudit({
      actorId,
      actorName,
      actorRole,
      businessId: dispatch.senderBusinessId,
      action: 'TRANSIT_PACKAGE_SCANNED',
      entityType: 'DISPATCH',
      entityId: dispatch.id,
      details: `Package transit barcode scanned: "${payload.barcode}". Checkpoint: "${payload.checkpointLocation || 'Dock en route'}". Status: ${dispatch.status}.`,
      metadata: {
        barcode: payload.barcode,
        checkpointLocation: payload.checkpointLocation,
        driverNotes: payload.driverNotes,
        status: dispatch.status,
      },
    });

    return JSON.parse(JSON.stringify(dispatch));
  }

  async bulkCreateDispatches(
    dispatchesPayload: Array<{
      partnerId?: string;
      partnerName?: string;
      originLocationId?: string;
      originLocationLabel?: string;
      originAddress?: string;
      destinationAddress?: string;
      driverName?: string;
      driverPhone?: string;
      vehicleReg?: string;
      notes?: string;
      lines: Array<{
        sku: string;
        itemName: string;
        unit: string;
        unitPrice?: number;
        quantitySent: number;
        notes?: string;
      }>;
    }>,
    actor: User
  ): Promise<{ createdCount: number; dispatches: Dispatch[]; errors?: string[] }> {
    if (!dispatchesPayload || !Array.isArray(dispatchesPayload) || dispatchesPayload.length === 0) {
      throw new Error('No dispatch data provided for bulk creation.');
    }

    const created: Dispatch[] = [];
    const errors: string[] = [];

    const defaultLocation =
      locations.find((l) => l.businessId === actor.businessId && l.isDefault) ||
      locations.find((l) => l.businessId === actor.businessId) ||
      locations[0];

    for (let i = 0; i < dispatchesPayload.length; i++) {
      const entry = dispatchesPayload[i];
      try {
        let partner = partners.find(
          (p) =>
            p.businessId === actor.businessId &&
            (p.id === entry.partnerId ||
              p.name.toLowerCase() === entry.partnerName?.toLowerCase().trim())
        );

        if (!partner && entry.partnerName) {
          partner = {
            id: 'part_' + crypto.randomBytes(4).toString('hex'),
            businessId: actor.businessId,
            name: entry.partnerName.trim(),
            type: 'RETAILER',
            contactPerson: 'Receiving Team',
            email: `receiving@${entry.partnerName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'partner'}.com`,
            phone: '+1-555-000-0000',
            countryCode: 'US',
            region: 'Default',
            city: 'Primary City',
            deliveryAddress: entry.destinationAddress || 'Standard Partner Delivery Dock',
            status: 'ACTIVE',
            verificationStatus: 'UNVERIFIED',
            createdAt: new Date().toISOString(),
          };
          partners.push(partner);
        }

        if (!partner) {
          throw new Error(`Row #${i + 1}: Partner "${entry.partnerName || entry.partnerId}" could not be resolved.`);
        }

        const dispatch = await this.createDispatch(
          {
            originLocationId: entry.originLocationId || defaultLocation?.id,
            originLocationLabel: entry.originLocationLabel || defaultLocation?.label || 'Primary Loading Bay',
            originAddress: entry.originAddress || defaultLocation?.addressLines || 'Warehouse Center',
            partnerId: partner.id,
            destinationAddress: entry.destinationAddress || partner.deliveryAddress,
            driverName: entry.driverName,
            driverPhone: entry.driverPhone,
            vehicleReg: entry.vehicleReg,
            notes: entry.notes,
            lines: entry.lines,
          },
          actor
        );

        created.push(dispatch);
      } catch (err: any) {
        errors.push(`Manifest #${i + 1}: ${err.message}`);
      }
    }

    return {
      createdCount: created.length,
      dispatches: created,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

export const sandboxStore = new SandboxStore();
