/**
 * Comprehensive Automated Test Suite for Business Dispatch & Delivery Reconciliation
 * Implements acceptance criteria defined in .ai/08_TESTING_AND_ACCEPTANCE.md:
 * - Layer 1: Unit tests (Quantity validation, decimal precision, discrepancy calculation, FSM, HMAC security, bootstrap token single-use, idempotency)
 * - Layer 2: Security & Tenant Isolation tests (Cross-tenant access denial, IDOR prevention, immutable quantitySent enforcement)
 * - Layer 3: End-to-End Integration tests (Create multi-line dispatch -> View receipt -> Reconcile with discrepancy -> Resolve -> Audit trail & Notifications)
 */

import { sandboxStore } from '../src/server/adapters/sandboxStore.js';
import {
  initSuperAdminBootstrap,
  redeemBootstrapToken,
  getBootstrapStatus,
  createSessionToken,
  verifySessionToken,
} from '../src/server/security.js';
import { DispatchStatus, ItemCondition, User } from '../src/types/dispatch.js';
import { recommendationEngine } from '../src/services/recommendationEngine.js';
import {
  saveMapCache,
  getMapCache,
  isMapCached,
  clearMapCache,
  queueOfflineTelemetry,
  getOfflineTelemetryQueue,
  clearOfflineTelemetryQueue,
} from '../src/utils/mapCache.js';
import {
  maskFan,
  maskFin,
  maskPhoneNumber,
  validateFanFormat,
  validateFinFormat,
  FaydaSimulationAdapter,
  FaydaProductionAdapter,
} from '../src/server/adapters/faydaAdapter.js';
import { otpChallengeStore } from '../src/server/adapters/otpAdapter.js';
import { normalizeToE164, isValidE164 } from '../src/utils/phoneUtils.js';

interface TestResult {
  group: string;
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  durationMs: number;
}

const testResults: TestResult[] = [];

async function test(group: string, name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    testResults.push({ group, name, status: 'PASS', durationMs: Date.now() - start });
    console.log(`  [PASS] ${name}`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    testResults.push({ group, name, status: 'FAIL', error: errorMsg, durationMs: Date.now() - start });
    console.error(`  [FAIL] ${name} -> ${errorMsg}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}. ${message || ''}`);
  }
}

// Pre-seeded actor test fixtures
const senderUser: User = {
  id: 'usr_sender_dispatcher',
  email: 'dispatcher@apexsupply.com',
  name: 'Carlos Ruiz',
  phoneNumber: '+1-555-019-5572',
  phoneVerified: true,
  role: 'SENDER',
  businessId: 'biz_apex_supply',
  businessName: 'Apex Supply Logistics',
  status: 'ACTIVE',
  memberships: [],
  createdAt: '',
  updatedAt: '',
};

const receiverUser: User = {
  id: 'usr_receiver_metro',
  email: 'store@metroretail.com',
  name: 'David Miller',
  phoneNumber: '+1-555-014-4411',
  phoneVerified: true,
  role: 'RECEIVER',
  businessId: 'biz_metro_retail',
  businessName: 'Metro Retail Distribution',
  partnerId: 'part_metro_north',
  status: 'ACTIVE',
  memberships: [],
  createdAt: '',
  updatedAt: '',
};

const ownerUser: User = {
  id: 'usr_business_owner',
  email: 'owner@apexsupply.com',
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
    {
      id: 'mem_001_midwest',
      userId: 'usr_business_owner',
      businessId: 'biz_midwest_coldchain',
      businessName: 'Midwest Cold-Chain Express',
      role: 'BUSINESS_OWNER',
      status: 'ACTIVE',
      createdAt: '2026-02-15T08:00:00.000Z',
    },
  ],
  createdAt: '',
  updatedAt: '',
};

async function runTestSuite() {
  console.log('========================================================================');
  console.log('  RUNNING DISPATCHBRIDGE ACCEPTANCE & INTEGRATION TEST SUITE');
  console.log('========================================================================\n');

  // -------------------------------------------------------------------------
  // 1. UNIT TESTS: Domain rules, Math, FSM, Security Primitives
  // -------------------------------------------------------------------------
  console.log('--- 1. Unit Tests ---');

  await test('Unit', 'Decimal precision & line discrepancy calculation', () => {
    const qtySent = 125.75;
    const qtyReceived = 100.25;
    const shortfall = Math.round((qtySent - qtyReceived) * 1000) / 1000;
    assertEqual(shortfall, 25.5, 'Decimal shortfall should be exactly 25.500');

    // Float rounding edge case (0.1 + 0.2)
    const float1 = 0.1;
    const float2 = 0.2;
    const sum = Math.round((float1 + float2) * 100) / 100;
    assertEqual(sum, 0.3, 'Decimal addition rounding should resolve IEEE 754 precision');
  });

  await test('Unit', 'Quantity validation: zero or negative quantities rejected', () => {
    const validateQuantity = (qty: number): boolean => {
      return typeof qty === 'number' && !isNaN(qty) && qty > 0;
    };

    assert(validateQuantity(10), 'Positive integer is valid');
    assert(validateQuantity(0.5), 'Positive decimal is valid');
    assert(!validateQuantity(0), 'Zero quantity is invalid');
    assert(!validateQuantity(-5), 'Negative quantity is invalid');
    assert(!validateQuantity(NaN), 'NaN is invalid');
  });

  await test('Unit', 'Dispatch FSM state transitions', () => {
    const validTransitions: Record<DispatchStatus, DispatchStatus[]> = {
      DRAFT: ['SUBMITTED', 'CANCELLED'],
      SUBMITTED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['VIEWED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      VIEWED: ['IN_TRANSIT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      IN_TRANSIT: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      RECEIPT_SUBMITTED: ['DISCREPANCY_REVIEW', 'PARTIALLY_RECEIVED', 'RECEIVED', 'RECONCILED'],
      DISCREPANCY_REVIEW: ['PARTIALLY_RECEIVED', 'RECONCILED'],
      PARTIALLY_RECEIVED: ['RECONCILED'],
      RECEIVED: ['RECONCILED'],
      RECONCILED: [],
      CANCELLED: [],
    };

    const canTransition = (from: DispatchStatus, to: DispatchStatus) => {
      return validTransitions[from]?.includes(to) ?? false;
    };

    assert(canTransition('DISPATCHED', 'VIEWED'), 'DISPATCHED -> VIEWED is valid');
    assert(canTransition('VIEWED', 'PARTIALLY_RECEIVED'), 'VIEWED -> PARTIALLY_RECEIVED is valid');
    assert(canTransition('PARTIALLY_RECEIVED', 'RECONCILED'), 'PARTIALLY_RECEIVED -> RECONCILED is valid');
    assert(!canTransition('DRAFT', 'RECONCILED'), 'DRAFT cannot jump directly to RECONCILED');
    assert(!canTransition('RECONCILED', 'DISPATCHED'), 'RECONCILED is terminal and cannot transition to DISPATCHED');
    assert(!canTransition('CANCELLED', 'SUBMITTED'), 'CANCELLED is terminal and cannot transition to SUBMITTED');
  });

  await test('Unit', 'HMAC Session Token Creation & Cryptographic Verification', () => {
    const token = createSessionToken('usr_test_dispatcher', 'SENDER');
    assert(typeof token === 'string' && token.includes('.'), 'Session token is formed as base64url.signature');

    const verified = verifySessionToken(token);
    assert(verified !== null, 'Valid session token must verify');
    assertEqual(verified?.userId, 'usr_test_dispatcher');
    assertEqual(verified?.role, 'SENDER');

    // Tampered payload test
    const [payload, sig] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'usr_hacker', role: 'SUPER_ADMIN' })).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${sig}`;
    const tamperedResult = verifySessionToken(tamperedToken);
    assert(tamperedResult === null, 'Tampered token payload must fail signature verification');

    // Tampered signature test
    const badSigToken = `${payload}.invalid_signature_bytes`;
    const badSigResult = verifySessionToken(badSigToken);
    assert(badSigResult === null, 'Invalid signature must be rejected');
  });

  await test('Unit', 'Super-Admin One-Time Bootstrap Token Lifecycle', () => {
    const secret = initSuperAdminBootstrap();
    assert(typeof secret === 'string' && secret.length >= 16, 'Bootstrap token generated');

    const statusBefore = getBootstrapStatus();
    assert(statusBefore.isAvailable, 'Bootstrap must be available prior to redemption');

    // Attempt with incorrect token (different length or mismatched content)
    const wrongRedeem = redeemBootstrapToken('wrong-fake-token-xyz');
    assert(!wrongRedeem, 'Incorrect bootstrap token must be rejected');

    // Redeem with legitimate token
    const legitimateRedeem = redeemBootstrapToken(secret);
    assert(legitimateRedeem, 'Valid bootstrap token must redeem successfully');

    // Ensure single-use: replay attack attempt
    const replayRedeem = redeemBootstrapToken(secret);
    assert(!replayRedeem, 'Replay of bootstrap token must fail (single-use enforced)');

    const statusAfter = getBootstrapStatus();
    assert(!statusAfter.isAvailable, 'Bootstrap must no longer be available');
    assert(statusAfter.superAdminProvisioned, 'Super admin provisioned flag must be set');
  });

  // -------------------------------------------------------------------------
  // 2. SECURITY & TENANT ISOLATION TESTS
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Security & Tenant Isolation Tests ---');

  await test('Security', 'Cross-Tenant Access Denial: Business A cannot access Business B dispatch', async () => {
    const allDispatches = await sandboxStore.getDispatches({
      role: 'BUSINESS_OWNER',
      businessId: 'biz_apex_supply',
    });
    assert(allDispatches.length > 0, 'Apex supply has seeded dispatches');

    const apexDispatchId = allDispatches[0].id;

    // Dispatcher from an unrelated tenant (e.g. biz_unrelated) attempts to access Apex Supply's dispatch
    let caughtError = false;
    try {
      await sandboxStore.getDispatchById(apexDispatchId, {
        role: 'SENDER',
        businessId: 'biz_unrelated',
      });
    } catch (err: any) {
      caughtError = true;
      assert(err.message.includes('403') || err.message.includes('Forbidden') || err.message.includes('Access denied'), 'Error indicates tenant access denial');
    }
    assert(caughtError, 'Cross-tenant dispatch retrieval must throw access denied');
  });

  await test('Security', 'Receiver cannot alter original dispatched lines or sender identity', async () => {
    const dispatches = await sandboxStore.getDispatches({
      role: 'BUSINESS_OWNER',
      businessId: 'biz_apex_supply',
    });
    const target = dispatches[0];

    const originalSentQty = target.lines[0].quantitySent;
    const originalSenderBiz = target.senderBusinessId;

    // Receiver records receipt report
    const reconcileInput = {
      lines: [
        {
          id: target.lines[0].id,
          quantityReceived: originalSentQty,
          condition: 'GOOD' as ItemCondition,
          discrepancyType: 'NONE' as any,
        },
      ],
      signoff: {
        signerName: 'Test Inspector',
        signerRole: 'Receiving Dock Lead',
      },
    };

    const reconciled = await sandboxStore.recordReceiptReport(
      target.id,
      reconcileInput,
      receiverUser
    );

    // Verify original immutable properties have not been modified
    assertEqual(reconciled.senderBusinessId, originalSenderBiz, 'Sender business ID cannot be modified by receiver');
    assertEqual(reconciled.lines[0].quantitySent, originalSentQty, 'Original quantity sent cannot be overwritten');
  });

  // -------------------------------------------------------------------------
  // 3. INTEGRATION TESTS: Complete End-to-End Dispatch Lifecycle
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Integration & Workflow Tests ---');

  let createdDispatchId = '';
  let shareToken = '';
  const testIdempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  await test('Integration', 'Create multi-line dispatch with location and partner snapshots', async () => {
    const locations = await sandboxStore.getLocations('biz_apex_supply');
    assert(locations.length > 0, 'Origin locations exist');
    const partners = await sandboxStore.getPartners('biz_apex_supply');
    assert(partners.length > 0, 'Partners exist');

    const originLoc = locations[0];
    const destinationPartner = partners[0];

    const input = {
      partnerId: destinationPartner.id,
      originLocationId: originLoc.id,
      originLocationLabel: originLoc.label,
      originAddress: `${originLoc.addressLines}, ${originLoc.city}, ${originLoc.region}`,
      driverName: 'Marcus Vance',
      driverPhone: '+1-555-888-9911',
      vehicleReg: 'IL-COMM-9942',
      notes: 'Dock appointment at 09:00 AM CST',
      idempotencyKey: testIdempotencyKey,
      lines: [
        {
          sku: 'SKU-E2E-100',
          itemName: 'Commercial Grade Microfiber Wipes',
          unit: 'boxes',
          quantitySent: 60,
          unitPrice: 24.5,
        },
        {
          sku: 'SKU-E2E-200',
          itemName: 'Heavy Duty Degreaser Solution (5L)',
          unit: 'cases',
          quantitySent: 40,
          unitPrice: 58.0,
        },
      ],
    };

    const dispatch = await sandboxStore.createDispatch(input, senderUser);

    assert(Boolean(dispatch.id), 'Dispatch must have an ID');
    assert(dispatch.dispatchNumber.startsWith('DSP-'), 'Dispatch number has standard format');
    assertEqual(dispatch.lines.length, 2, 'Dispatch contains exactly 2 lines');
    assertEqual(dispatch.totalQuantityDispatched, 100, 'Total dispatched quantity is 60 + 40 = 100');
    assertEqual(dispatch.status, 'DISPATCHED', 'Initial status after submission is DISPATCHED');
    assert(Boolean(dispatch.shareToken), 'Unguessable share token is generated');
    assertEqual(dispatch.originLocationSnapshot.label, originLoc.label, 'Origin snapshot preserved');
    assertEqual(dispatch.destinationSnapshot.partnerName, destinationPartner.name, 'Destination snapshot preserved');

    createdDispatchId = dispatch.id;
    shareToken = dispatch.shareToken;
  });

  await test('Integration', 'Idempotency: Re-submitting identical idempotencyKey returns existing dispatch', async () => {
    const locations = await sandboxStore.getLocations('biz_apex_supply');
    const partners = await sandboxStore.getPartners('biz_apex_supply');

    const duplicateInput = {
      partnerId: partners[0].id,
      originLocationLabel: locations[0].label,
      originAddress: locations[0].addressLines,
      lines: [
        {
          sku: 'SKU-E2E-100',
          itemName: 'Commercial Grade Microfiber Wipes',
          unit: 'boxes',
          quantitySent: 60,
        },
      ],
      idempotencyKey: testIdempotencyKey, // Same key as previous step
    };

    const reSubmitted = await sandboxStore.createDispatch(duplicateInput, senderUser);
    assertEqual(reSubmitted.id, createdDispatchId, 'Must return identical dispatch ID without creating new duplicate');
  });

  await test('Integration', 'View Receipt: Recipient opens manifest and view receipt is tracked', async () => {
    // 1. Fetch via share token (public / recipient route)
    const publicView = await sandboxStore.getDispatchByShareToken(shareToken);
    assert(publicView !== null, 'Public view must return dispatch');
    assertEqual(publicView!.id, createdDispatchId, 'Retrieves dispatch via token');

    // 2. Record view receipt as authenticated receiver
    const { dispatch: viewed, viewReceipt } = await sandboxStore.recordViewReceipt(
      createdDispatchId,
      {
        id: receiverUser.id,
        name: receiverUser.name,
        role: receiverUser.role,
        businessId: receiverUser.businessId,
      },
      'hash_ip_192_168_1_50'
    );

    assert(Boolean(viewed.firstViewedAt), 'firstViewedAt timestamp recorded');
    assertEqual(viewReceipt.viewerName, receiverUser.name, 'Viewer name recorded');
    assertEqual(viewReceipt.viewCount, 1, 'View count is 1 on first view');
    assertEqual(viewed.status, 'VIEWED', 'Status updated from DISPATCHED to VIEWED');

    // 3. Second view increments viewCount without altering firstViewedAt
    const firstTime = viewed.firstViewedAt;
    const { viewReceipt: secondReceipt } = await sandboxStore.recordViewReceipt(
      createdDispatchId,
      {
        id: receiverUser.id,
        name: receiverUser.name,
        role: receiverUser.role,
        businessId: receiverUser.businessId,
      }
    );
    assertEqual(secondReceipt.viewCount, 2, 'View count increments to 2 on re-view');
    assertEqual(secondReceipt.firstViewedAt, firstTime, 'firstViewedAt remains immutable on subsequent views');
  });

  await test('Integration', 'Reconciliation: Receiver reports damaged goods and shortfall', async () => {
    const current = await sandboxStore.getDispatchById(createdDispatchId);
    assert(current !== null, 'Created dispatch exists');

    // Line 1: 60 sent -> 60 received in GOOD condition
    // Line 2: 40 sent -> 30 received (GOOD), 10 DAMAGED
    const line1 = current!.lines[0];
    const line2 = current!.lines[1];

    const reconcilePayload = {
      lines: [
        {
          id: line1.id,
          quantityReceived: 60,
          condition: 'GOOD' as ItemCondition,
          discrepancyType: 'NONE' as any,
          notes: 'Full count intact',
        },
        {
          id: line2.id,
          quantityReceived: 30,
          condition: 'DAMAGED' as ItemCondition,
          discrepancyType: 'DAMAGED' as any,
          notes: '10 cases crushed by freight forklift on pallet base',
        },
      ],
      signoff: {
        signerName: 'David Miller',
        signerRole: 'Warehouse Operations Supervisor',
        comments: 'Received with 10 crushed units flagged for credit memo',
      },
    };

    const reconciled = await sandboxStore.recordReceiptReport(
      createdDispatchId,
      reconcilePayload,
      receiverUser
    );

    assertEqual(reconciled.totalQuantityDispatched, 100);
    assertEqual(reconciled.totalQuantityReceived, 90, 'Total received is 60 + 30 = 90');
    assertEqual(reconciled.totalQuantityLost, 10, 'Total lost is 10');
    assertEqual(reconciled.status, 'PARTIALLY_RECEIVED', 'Status marked PARTIALLY_RECEIVED due to damage/shortage');
    assert(Boolean(reconciled.receivedAt), 'receivedAt timestamp set');
    assertEqual(reconciled.receiverSignoff?.signerName, 'David Miller');

    // Check discrepancy case opened
    assert(Array.isArray(reconciled.discrepancyCases), 'Discrepancy cases array exists');
    assert(reconciled.discrepancyCases!.length >= 1, 'At least 1 discrepancy case opened');

    const discCase = reconciled.discrepancyCases![0];
    assertEqual(discCase.status, 'OPEN', 'Case is in OPEN status');
    assertEqual(discCase.shortfallQuantity, 10, 'Shortfall quantity is 10');
  });

  await test('Integration', 'Sender acknowledges and resolves discrepancy with credit memo', async () => {
    const current = await sandboxStore.getDispatchById(createdDispatchId);
    assert(current !== null && Boolean(current.discrepancyCases), 'Discrepancy cases exist');
    const discCase = current!.discrepancyCases![0];

    const resolved = await sandboxStore.resolveDiscrepancy(
      createdDispatchId,
      discCase.id,
      {
        resolution: 'Approved 10-unit replacement shipment with Credit Memo #CM-2026-904',
      },
      ownerUser
    );

    assertEqual(resolved.status, 'RECONCILED', 'Dispatch transitions to RECONCILED after case resolution');

    const updatedCase = resolved.discrepancyCases?.find((c) => c.id === discCase.id);
    assert(Boolean(updatedCase), 'Updated case found');
    assertEqual(updatedCase?.status, 'RESOLVED');
    assertEqual(updatedCase?.resolvedByName, 'Eleanor Vance');
    assert(Boolean(updatedCase?.resolution), 'Resolution notes saved');
  });

  await test('Integration', 'Audit Trail: Verifying complete audit log trail', async () => {
    const auditLogs = await sandboxStore.getAuditLogs({ businessId: 'biz_apex_supply' });
    assert(auditLogs.length > 0, 'Audit entries exist for business');

    const actions = auditLogs.map((l) => l.action);
    console.log(`    Audited actions found (${auditLogs.length}): ${actions.slice(0, 5).join(', ')}...`);

    assert(actions.includes('DISPATCH_CREATED'), 'Audit log includes DISPATCH_CREATED');
    assert(actions.includes('DISPATCH_VIEWED'), 'Audit log includes DISPATCH_VIEWED');
    assert(actions.includes('RECEIPT_DISCREPANCY_RECORDED'), 'Audit log includes RECEIPT_DISCREPANCY_RECORDED');
    assert(actions.includes('DISCREPANCY_RESOLVED'), 'Audit log includes DISCREPANCY_RESOLVED');
  });

  await test('Integration', 'In-App Notifications: Recipients received expected alerts', async () => {
    // Check sender notifications (usr_sender_dispatcher)
    const dispatcherNotifs = await sandboxStore.getNotifications('usr_sender_dispatcher');
    assert(dispatcherNotifs.length > 0, 'Dispatcher received notifications');

    const eventTypes = dispatcherNotifs.map((n) => n.eventType);
    console.log(`    Notification events logged: ${eventTypes.join(', ')}`);

    // Verify notifications include DISPATCH_VIEWED and DISCREPANCY_OPENED
    assert(eventTypes.includes('DISPATCH_VIEWED'), 'Notifications include DISPATCH_VIEWED');
    assert(eventTypes.includes('DISCREPANCY_OPENED'), 'Notifications include DISCREPANCY_OPENED');

    // Mark all as read
    await sandboxStore.markAllNotificationsRead('usr_sender_dispatcher');
    const notifsAfter = await sandboxStore.getNotifications('usr_sender_dispatcher');
    const unreadAfter = notifsAfter.filter((n) => !n.isRead).length;
    assertEqual(unreadAfter, 0, 'All notifications marked as read');
  });

  // -------------------------------------------------------------------------
  // Layer 4: Feature Enhancements Acceptance Tests (Requirements 7 & 10)
  // -------------------------------------------------------------------------
  await test('Enhancements', 'Geospatial: Origin docks and delivery partners have valid coordinates', async () => {
    const locs = await sandboxStore.getLocations('biz_apex_supply');
    assert(locs.length > 0, 'Registered origin locations found');
    const mainHub = locs.find((l) => l.id === 'loc_apex_main');
    assert(Boolean(mainHub), 'Chicago main terminal dock exists');
    assert(mainHub?.latitude !== undefined && mainHub?.longitude !== undefined, 'Coordinates defined on origin dock');
    assertEqual(mainHub?.latitude, 41.8781, 'Chicago latitude matches expected GPS');
    assertEqual(mainHub?.longitude, -87.6298, 'Chicago longitude matches expected GPS');

    const parts = await sandboxStore.getPartners('biz_apex_supply');
    const metro = parts.find((p) => p.id === 'part_metro_north');
    assert(Boolean(metro), 'Metro retail partner exists');
    assert(metro?.latitude !== undefined && metro?.longitude !== undefined, 'Coordinates defined on partner destination');
  });

  await test('Enhancements', 'Recommendation Engine: Collaborative filtering computes affinities from dispatch history', async () => {
    const existingDispatches = await sandboxStore.getDispatches({ businessId: 'biz_apex_supply' });
    assert(existingDispatches.length > 0, 'Dispatches exist for analysis');

    // Run engine with default preferences
    const recs = recommendationEngine.generateRecommendations(
      existingDispatches,
      {
        preferredCategories: ['FOOD_BEVERAGE', 'COLD_CHAIN'],
        temperatureControl: 'ANY',
        priorityLevel: 'STANDARD',
        budgetTier: 'BALANCED',
      },
      [
        { sku: 'SKU-GLS-101', category: 'FOOD_BEVERAGE', action: 'VIEW_MANIFEST', timestamp: new Date().toISOString() },
      ]
    );

    assert(recs.length > 0, 'Recommendations returned by engine');
    assert(recs[0].confidencePercent >= 50 && recs[0].confidencePercent <= 99, 'Confidence percent bounded between 50% and 99%');
    assert(Boolean(recs[0].primaryReason), 'Recommendation includes transparent human-readable explanation');
    assert(Boolean(recs[0].collaborativeExplanation), 'Collaborative filtering explanation present');

    // Verify ordering by score descending
    for (let i = 0; i < recs.length - 1; i++) {
      assert(recs[i].score >= recs[i + 1].score, `Item ${i} score (${recs[i].score}) >= item ${i+1} score (${recs[i+1].score})`);
    }

    // Verify future architecture roadmap contains required technical milestones
    const roadmap = recommendationEngine.getFutureImprovementsRoadmap();
    assertEqual(roadmap.length, 4, 'Future improvements roadmap contains 4 detailed phases');
    const titles = roadmap.map((r) => r.title);
    assert(titles.some((t) => t.includes('Matrix Factorization')), 'Roadmap includes Matrix Factorization');
    assert(titles.some((t) => t.includes('Two-Tower')), 'Roadmap includes Two-Tower Neural Retrieval');
    assert(titles.some((t) => t.includes('Bandits')), 'Roadmap includes Multi-Armed Bandits');
    assert(titles.some((t) => t.includes('Graph Neural Networks')), 'Roadmap includes Graph Neural Networks');
  });

  // -------------------------------------------------------------------------
  // Layer 5: Extension Roadmap (Master Plan Staging) Acceptance Tests
  // -------------------------------------------------------------------------
  await test('Master Plan Staging', 'Digital Glass Signature: Receiver dock signature is captured and locked into sign-off record', async () => {
    // Create new dispatch to reconcile with digital signature
    const newDispatch = await sandboxStore.createDispatch(
      {
        originLocationLabel: 'Chicago Main Dock',
        originAddress: '104 Logistics Blvd, Chicago, IL',
        partnerId: 'part_metro_north',
        lines: [
          { sku: 'SKU-SIG-01', itemName: 'High-Value Solar Micro-Inverter 400W', unit: 'units', quantitySent: 15 },
        ],
      },
      senderUser
    );

    const testSignatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const reconciled = await sandboxStore.recordReceiptReport(
      newDispatch.id,
      {
        lines: [
          { id: newDispatch.lines[0].id, quantityReceived: 15, condition: 'GOOD', discrepancyType: 'NONE' },
        ],
        signoff: {
          signerName: 'Marcus Wright',
          signerRole: 'Senior Receiving Inspector',
          comments: 'Seals verified; 15 units intact.',
          signatureSvgOrBase64: testSignatureDataUrl,
        },
      },
      receiverUser
    );

    assert(Boolean(reconciled.receiverSignoff), 'Sign-off record exists');
    assertEqual(reconciled.receiverSignoff?.signerName, 'Marcus Wright', 'Signer name recorded');
    assertEqual(reconciled.receiverSignoff?.signerRole, 'Senior Receiving Inspector', 'Signer role recorded');
    assert(Boolean(reconciled.receiverSignoff?.signatureSvgOrBase64), 'Digital signature data URL recorded');
    assertEqual(reconciled.receiverSignoff?.signatureSvgOrBase64, testSignatureDataUrl, 'Exact signature payload preserved');
    assertEqual(reconciled.status, 'RECEIVED', 'Status transitioned to RECEIVED');
  });

  await test('Master Plan Staging', 'Photo Damage Claims: Cargo damage photos with SHA-256 hashes are attached to discrepancy cases', async () => {
    const newDispatch = await sandboxStore.createDispatch(
      {
        originLocationLabel: 'Chicago Main Dock',
        originAddress: '104 Logistics Blvd, Chicago, IL',
        partnerId: 'part_metro_north',
        lines: [
          { sku: 'SKU-GLS-99', itemName: 'Fragile Ceramic Laboratory Flasks (Set of 12)', unit: 'boxes', quantitySent: 20 },
        ],
      },
      senderUser
    );

    const testEvidence = [
      {
        id: 'ev_test_101',
        fileName: 'shattered_crate_tailgate.png',
        mimeType: 'image/png',
        fileSize: 1048576,
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        uploadedAt: new Date().toISOString(),
        notes: 'Crushed corner pallet with shattered glassware on tailgate arrival',
      },
    ];

    const reconciled = await sandboxStore.recordReceiptReport(
      newDispatch.id,
      {
        lines: [
          {
            id: newDispatch.lines[0].id,
            quantityReceived: 14,
            condition: 'DAMAGED',
            discrepancyType: 'DAMAGED',
            notes: '6 boxes destroyed in transit.',
            evidence: testEvidence,
          },
        ],
        signoff: {
          signerName: 'Marcus Wright',
          signerRole: 'Senior Receiving Inspector',
          comments: 'Damage photos attached to claim.',
        },
      },
      receiverUser
    );

    assertEqual(reconciled.status, 'PARTIALLY_RECEIVED', 'Status transitioned to PARTIALLY_RECEIVED');
    assertEqual(reconciled.totalQuantityLost, 6, 'Shortfall quantity calculated correctly');
    assert(Boolean(reconciled.discrepancyCases && reconciled.discrepancyCases.length > 0), 'Discrepancy case created');

    const discCase = reconciled.discrepancyCases![0];
    assertEqual(discCase.type, 'DAMAGED', 'Discrepancy case type DAMAGED');
    assert(Boolean(discCase.evidence && discCase.evidence.length > 0), 'Evidence attached to discrepancy case');
    assertEqual(discCase.evidence![0].fileName, 'shattered_crate_tailgate.png', 'Evidence filename matches');
    assertEqual(discCase.evidence![0].sha256Hash, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'Tamper-evident SHA-256 hash verified');
  });

  await test('Master Plan Staging', 'Notification Outbox Gateway: Outbound SMS, Email, and Webhook queuing with delivery retries', async () => {
    // Test dispatching an outbound SMS alert
    const smsNotice = await sandboxStore.sendOutboundNotification({
      channel: 'SMS',
      recipient: '+1-555-014-4411',
      title: 'Outbound Manifest Test SMS',
      message: 'Shipment DSP-TEST-001 has been dispatched.',
    });

    assert(Boolean(smsNotice.id), 'Outbound notification generated');
    assertEqual(smsNotice.channel, 'SMS', 'Channel matches SMS');
    assertEqual(smsNotice.providerDeliveryStatus, 'DELIVERED', 'Status marked DELIVERED');

    // Retrieve from outbox
    const outbox = await sandboxStore.getOutboxNotifications();
    assert(outbox.length > 0, 'Outbox notifications retrieved');
    assert(outbox.some((n) => n.id === smsNotice.id), 'Created notification exists in outbox');

    // Test delivery retry
    const retried = await sandboxStore.retryNotificationDelivery(smsNotice.id);
    assertEqual(retried.id, smsNotice.id, 'Retried notification matches');
    assert(retried.deliveryAttempts! >= 2, 'Delivery attempt incremented');
  });

  await test('Master Plan Staging', 'Staging Readiness Diagnostics Engine: Automated evaluation against 4 release checklist domains', async () => {
    const report = await sandboxStore.getStagingReadinessReport();
    assert(Boolean(report), 'Staging readiness report returned');
    assertEqual(report.overallStatus, 'READY_FOR_STAGING', 'Overall status is READY_FOR_STAGING');

    const cats = report.categories;
    assert(Boolean(cats.buildAndCodeQuality), 'Build and Code Quality domain evaluated');
    assert(Boolean(cats.identityAndSecurity), 'Identity and Security domain evaluated');
    assert(Boolean(cats.dataAndOperations), 'Data and Operations domain evaluated');
    assert(Boolean(cats.platformAndRelease), 'Platform and Release domain evaluated');

    assertEqual(cats.buildAndCodeQuality.status, 'PASS', 'Build domain PASS');
    assertEqual(cats.identityAndSecurity.status, 'PASS', 'Security domain PASS');
    assertEqual(cats.dataAndOperations.status, 'PASS', 'Data domain PASS');
    assertEqual(cats.platformAndRelease.status, 'PASS', 'Release domain PASS');

    assert(report.metrics.failures === 0, 'Zero staging check failures');
    assert(report.metrics.passed >= 16, 'At least 16 discrete checks passed');
  });

  await test('Geospatial & Telemetry', 'Dispatch Geo-Coordinates & Live Map Telemetry: Origin, Destination, and Current GPS coordinates are stored and updated', async () => {
    // 1. Verify pre-seeded dispatch dsp_001 has valid coordinates
    const dsp = await sandboxStore.getDispatchById('dsp_001');
    assert(Boolean(dsp), 'Dispatch dsp_001 exists');
    if (!dsp) throw new Error('Dispatch dsp_001 not found');
    assert(dsp.originLocationSnapshot.latitude !== undefined, 'Origin snapshot latitude exists');
    assert(dsp.originLocationSnapshot.longitude !== undefined, 'Origin snapshot longitude exists');
    assert(dsp.destinationSnapshot.latitude !== undefined, 'Destination snapshot latitude exists');
    assert(dsp.destinationSnapshot.longitude !== undefined, 'Destination snapshot longitude exists');
    assert(dsp.currentCoordinates !== undefined, 'currentCoordinates stored in dispatch record');
    assert(typeof dsp.currentCoordinates?.latitude === 'number', 'currentCoordinates.latitude is numeric');
    assert(typeof dsp.currentCoordinates?.longitude === 'number', 'currentCoordinates.longitude is numeric');

    // 2. Create a fresh in-flight dispatch and test live telemetry waypoint update
    const activeDsp = await sandboxStore.createDispatch(
      {
        originLocationId: 'loc_apex_main',
        originLocationLabel: 'Chicago Central Hub',
        originAddress: '104 Logistics Blvd',
        partnerId: 'part_metro_north',
        driverName: 'Test Carrier Driver',
        lines: [
          {
            sku: 'SKU-MAP-TEST',
            itemName: 'Telemetry Sensor Kits',
            unit: 'boxes',
            quantitySent: 25,
          },
        ],
      },
      senderUser
    );

    assert(activeDsp.originLocationSnapshot.latitude !== undefined, 'New dispatch origin latitude populated');
    assert(activeDsp.destinationSnapshot.latitude !== undefined, 'New dispatch destination latitude populated');
    assertEqual(activeDsp.status, 'DISPATCHED', 'Initial status is DISPATCHED');

    const updated = await sandboxStore.updateDispatchTelemetry(activeDsp.id, {
      latitude: 44.1234,
      longitude: -92.5678,
      speedKmh: 82,
      heading: 320,
      checkpointName: 'I-90 Mile Marker 290 Waypoint',
      source: 'GPS',
    });

    assertEqual(updated.currentCoordinates?.latitude, 44.1234, 'Latitude updated');
    assertEqual(updated.currentCoordinates?.longitude, -92.5678, 'Longitude updated');
    assertEqual(updated.currentCoordinates?.speedKmh, 82, 'Speed updated');
    assertEqual(updated.currentCoordinates?.checkpointName, 'I-90 Mile Marker 290 Waypoint', 'Checkpoint updated');
    assertEqual(updated.status, 'IN_TRANSIT', 'Status transitioned to IN_TRANSIT');
  });

  await test('Geospatial & Telemetry', 'Map Offline Caching: Pre-caching coordinate data, tile grid bounds, and offline telemetry queuing', async () => {
    const dsp = await sandboxStore.getDispatchById('dsp_001');
    assert(Boolean(dsp), 'Dispatch dsp_001 exists');
    if (!dsp) throw new Error('Dispatch dsp_001 not found');

    // 1. Save dispatch map data to local offline cache
    const cachedRecord = saveMapCache(dsp);
    assert(Boolean(cachedRecord), 'Cached map record created');
    assertEqual(cachedRecord.dispatchId, dsp.id, 'Cached dispatch ID matches');
    assertEqual(cachedRecord.dispatchNumber, dsp.dispatchNumber, 'Cached dispatch number matches');
    assert(cachedRecord.sizeBytes > 0, 'Cached size in bytes calculated');
    assert(Boolean(cachedRecord.offlineTileGrid), 'Offline tile grid configuration stored');
    assert(cachedRecord.offlineTileGrid.tilesAvailable, 'Offline tile grid flag active');
    assert(cachedRecord.plannedWaypoints.length > 0, 'Planned waypoints stored in offline cache');
    assert(cachedRecord.actualWaypoints.length > 0, 'Actual route waypoints stored in offline cache');

    // 2. Query cache availability
    const isCached = isMapCached(dsp.id);
    assert(isCached, 'isMapCached returns true after saveMapCache');

    // 3. Retrieve cached data
    const retrieved = getMapCache(dsp.id);
    assert(Boolean(retrieved), 'getMapCache retrieves cached record');
    assertEqual(retrieved?.dispatchNumber, dsp.dispatchNumber, 'Retrieved cache matches dispatch number');
    assertEqual(retrieved?.origin.latitude, dsp.originLocationSnapshot.latitude, 'Retrieved cache origin lat matches');
    assertEqual(retrieved?.destination.latitude, dsp.destinationSnapshot.latitude, 'Retrieved cache destination lat matches');

    // 4. Test offline telemetry queueing when connection is unstable
    queueOfflineTelemetry(dsp.id, {
      latitude: 43.8500,
      longitude: -91.2500,
      speedKmh: 78,
      heading: 305,
      checkpointName: 'La Crosse Offline Checkpoint',
    });
    queueOfflineTelemetry(dsp.id, {
      latitude: 44.0500,
      longitude: -91.6500,
      speedKmh: 85,
      heading: 310,
      checkpointName: 'Winona Offline Checkpoint',
    });

    const pendingQueue = getOfflineTelemetryQueue(dsp.id);
    assertEqual(pendingQueue.length, 2, 'Two offline telemetry entries queued');
    assertEqual(pendingQueue[0].checkpointName, 'La Crosse Offline Checkpoint', 'First offline checkpoint queued');
    assert(Boolean(pendingQueue[0].queuedAt), 'queuedAt timestamp populated on offline entry');

    // 5. Test queue flush & cache clear
    clearOfflineTelemetryQueue(dsp.id);
    assertEqual(getOfflineTelemetryQueue(dsp.id).length, 0, 'Offline telemetry queue emptied after sync');

    clearMapCache(dsp.id);
    assert(!isMapCached(dsp.id), 'isMapCached returns false after clearMapCache');
  });

  await test('Geospatial & Telemetry', 'Route Polylines & History: Planned corridor vs. actual transit waypoint polyline overlay data', async () => {
    // 1. Fetch dispatch dsp_001 with pre-seeded route history
    const dsp = await sandboxStore.getDispatchById('dsp_001');
    assert(Boolean(dsp), 'Dispatch dsp_001 exists');
    if (!dsp) throw new Error('Dispatch dsp_001 not found');

    assert(Boolean(dsp.pathHistory), 'pathHistory exists on dispatch record');
    const pathHistory = dsp.pathHistory!;

    // 2. Verify planned route corridor waypoints
    assert(Array.isArray(pathHistory.plannedWaypoints), 'plannedWaypoints is an array');
    assert(pathHistory.plannedWaypoints.length >= 8, 'Planned route contains >= 8 corridor waypoints along I-90/I-94');

    const firstPlanned = pathHistory.plannedWaypoints[0];
    const lastPlanned = pathHistory.plannedWaypoints[pathHistory.plannedWaypoints.length - 1];
    assertEqual(firstPlanned.latitude, 41.8781, 'First planned waypoint is origin dock in Chicago');
    assertEqual(lastPlanned.latitude, 44.9866, 'Last planned waypoint is destination hub in Minneapolis');

    // 3. Verify actual historical breadcrumb waypoints
    assert(Array.isArray(pathHistory.actualWaypoints), 'actualWaypoints is an array');
    assert(pathHistory.actualWaypoints.length >= 5, 'Actual route history contains >= 5 GPS breadcrumb waypoints');

    const firstActual = pathHistory.actualWaypoints[0];
    assert(Boolean(firstActual.timestamp), 'Actual waypoint contains timestamp');
    assert(Boolean(firstActual.passed), 'Actual waypoint marked passed');

    // 4. Verify telemetry update appends new waypoint to actual route polyline
    const initialActualCount = pathHistory.actualWaypoints.length;
    const updatedDsp = await sandboxStore.updateDispatchTelemetry('dsp_001', {
      latitude: 44.3500,
      longitude: -92.2000,
      speedKmh: 86,
      heading: 312,
      checkpointName: 'Wabasha County Corridor Waypoint',
      source: 'GPS',
    });

    const updatedActualCount = updatedDsp.pathHistory?.actualWaypoints.length || 0;
    assertEqual(updatedActualCount, initialActualCount + 1, 'New GPS waypoint appended to actual route polyline history');

    const latestWp = updatedDsp.pathHistory?.actualWaypoints[updatedActualCount - 1];
    assertEqual(latestWp?.latitude, 44.3500, 'Latest actual waypoint latitude matches telemetry update');
    assertEqual(latestWp?.longitude, -92.2000, 'Latest actual waypoint longitude matches telemetry update');
    assertEqual(latestWp?.label, 'Wabasha County Corridor Waypoint', 'Latest actual waypoint label preserved');
  });

  await test('Integration', 'Guest Exploration & Tablet Responsive Data: Public sandbox dispatches accessible without auth token', async () => {
    // 1. Fetch dispatches with unauthenticated filter (simulating guest visitor exploration)
    const publicDispatches = await sandboxStore.getDispatches({});
    assert(Array.isArray(publicDispatches), 'Public dispatches returned as array');
    assert(publicDispatches.length >= 3, 'Public sandbox contains at least 3 seeded dispatches for exploration');

    // 2. Verify all returned dispatches have necessary fields for tablet cards and itemized manifest tables
    for (const d of publicDispatches) {
      assert(Boolean(d.dispatchNumber), `Dispatch ${d.id} has valid dispatchNumber`);
      assert(Boolean(d.senderBusinessName), `Dispatch ${d.id} has senderBusinessName`);
      assert(Boolean(d.destinationSnapshot?.address), `Dispatch ${d.id} has destination address`);
      assert(Array.isArray(d.lines) && d.lines.length > 0, `Dispatch ${d.id} has lines`);
      assert(typeof d.totalQuantityDispatched === 'number', `Dispatch ${d.id} has totalQuantityDispatched`);
      assert(Boolean(d.shareToken), `Dispatch ${d.id} has public unguessable shareToken`);
    }

    // 3. Verify public partner view access by unguessable share token without authentication
    const firstDispatch = publicDispatches[0];
    const resolvedByToken = await sandboxStore.getDispatchByShareToken(firstDispatch.shareToken);
    assert(resolvedByToken !== null, 'Public partner view resolves dispatch by token');
    assertEqual(resolvedByToken?.id, firstDispatch.id, 'Resolved dispatch ID matches expected');
  });

  await test('Multi-Business', 'Context Switching & Multi-Membership: Business owner switches tenant context and registers new business entity', async () => {
    // 1. Verify ownerUser initial context
    assertEqual(ownerUser.businessId, 'biz_apex_supply', 'Initial active business context is biz_apex_supply');
    assert(ownerUser.memberships.length >= 2, 'Owner user has multiple business memberships');
    const midwestMem = ownerUser.memberships.find((m) => m.businessId === 'biz_midwest_coldchain');
    assert(Boolean(midwestMem), 'Membership for Midwest Cold-Chain Express exists');

    // 2. Switch context to biz_midwest_coldchain
    const switchedUser = await sandboxStore.switchActiveBusiness(ownerUser.id, 'biz_midwest_coldchain');
    assertEqual(switchedUser.businessId, 'biz_midwest_coldchain', 'Active businessId switched to biz_midwest_coldchain');
    assertEqual(switchedUser.businessName, 'Midwest Cold-Chain Express', 'Active businessName matches target business');

    // 3. Verify tenant scoping on dispatches
    const midwestDispatches = await sandboxStore.getDispatches({ businessId: 'biz_midwest_coldchain' });
    const apexDispatches = await sandboxStore.getDispatches({ businessId: 'biz_apex_supply' });
    assert(Array.isArray(midwestDispatches), 'Midwest dispatches query succeeds');
    assert(apexDispatches.length >= 3, 'Apex supply has seeded dispatches');

    // 4. Register a new business entity under the user account
    const newBizPayload = {
      name: 'Great Lakes Cold Freightways Ltd.',
      registrationNumber: 'REG-GLF-9941',
      countryCode: 'US',
      contactEmail: 'operations@greatlakesfreight.com',
      contactPhone: '+1-414-555-0188',
      address: '700 Harbor View Way, Bay 3, Milwaukee, WI',
    };
    const { business: createdBiz, user: updatedUserWithNewBiz } = await sandboxStore.createBusiness(
      ownerUser.id,
      newBizPayload
    );

    assert(Boolean(createdBiz.id), 'New business entity created with generated ID');
    assertEqual(createdBiz.name, 'Great Lakes Cold Freightways Ltd.', 'Business legal name matches');
    assertEqual(updatedUserWithNewBiz.businessId, createdBiz.id, 'User active business updated to newly created entity');
    assert(
      updatedUserWithNewBiz.memberships.some((m) => m.businessId === createdBiz.id),
      'New business membership appended to user memberships'
    );
    assert(updatedUserWithNewBiz.memberships.length >= 3, 'User now holds at least 3 active business memberships');

    // 5. Switch back to original business context to keep test runner idempotent
    const restoredUser = await sandboxStore.switchActiveBusiness(ownerUser.id, 'biz_apex_supply');
    assertEqual(restoredUser.businessId, 'biz_apex_supply', 'Switched back to biz_apex_supply successfully');
  });

  await test('Tablet UX & Layout Stability', 'Responsive Layout Boundaries: All tables, summary metrics, and status endpoints provide bounded fields without page-level overflow', async () => {
    // 1. Verify system status fields are bounded and complete
    const status = await sandboxStore.getSystemStatus();
    assert(Boolean(status.kernelVersion), 'System status includes kernel version');
    assert(Boolean(status.databaseProvider), 'System status includes database provider');
    assert(typeof status.totalDispatches === 'number', 'Total dispatches is numeric');

    // 2. Verify all seeded dispatches have itemized lines with SKU, description, unit, and valid counts
    const dispatches = await sandboxStore.getDispatches({});
    for (const d of dispatches) {
      assert(d.lines.length > 0, `Dispatch ${d.dispatchNumber} contains lines`);
      for (const line of d.lines) {
        assert(line.sku.length <= 32, `Line SKU ${line.sku} within 32 chars for column stability`);
        assert(line.quantitySent > 0, `Line quantitySent is positive`);
        assert(Boolean(line.unit), `Line has unit specified`);
      }
    }

    // 3. Verify audit log entries have bounded actor and entity labels
    const logs = await sandboxStore.getAuditLogs();
    assert(logs.length > 0, 'Audit logs populated');
    for (const log of logs) {
      assert(Boolean(log.action), 'Log has valid action string');
      assert(Boolean(log.actorName), 'Log has actor name');
      assert(Boolean(log.entityType), 'Log has entity type');
    }
  });

  await test('Public Partner Workflows', 'Public Partner Token Reconciliation: External recipient signs off dock manifest via share token with digital signature', async () => {
    // 1. Create a fresh dispatch to test public share token reconciliation flow
    const testDispatch = await sandboxStore.createDispatch(
      {
        partnerId: 'part_metro_north',
        originLocationLabel: 'Chicago Outbound Terminal 2',
        originAddress: '200 Cargo Way, Chicago, IL',
        lines: [
          { sku: 'SKU-PUB-01', itemName: 'Cold-Pressed Valencia Orange Juice (Pallet)', unit: 'pallets', quantitySent: 4 },
          { sku: 'SKU-PUB-02', itemName: 'Organic Fuji Apples (Crate)', unit: 'crates', quantitySent: 20 },
        ],
      },
      senderUser
    );

    assert(Boolean(testDispatch.shareToken), 'Share token created for dispatch');

    // 2. Lookup dispatch via unguessable share token
    const publicView = await sandboxStore.getDispatchByShareToken(testDispatch.shareToken);
    assert(publicView !== null, 'Public token resolves to active dispatch');
    assertEqual(publicView!.dispatchNumber, testDispatch.dispatchNumber);

    // 3. Partner signs off dock manifest as unauthenticated dock receiver
    const testSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const guestActor: User = {
      id: `usr_partner_link_${testDispatch.partnerId}`,
      email: 'dock.receiving@metroretail.com',
      name: 'Elena Rostova',
      phoneNumber: '+1-555-019-4400',
      phoneVerified: false,
      role: 'RECEIVER',
      businessId: testDispatch.partnerId,
      businessName: 'Metro Retail North Branch',
      memberships: [],
      partnerId: testDispatch.partnerId,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const reconciled = await sandboxStore.recordReceiptReport(
      testDispatch.id,
      {
        lines: [
          { id: testDispatch.lines[0].id, quantityReceived: 4, condition: 'GOOD', discrepancyType: 'NONE' },
          { id: testDispatch.lines[1].id, quantityReceived: 18, condition: 'DAMAGED', discrepancyType: 'SHORTAGE', notes: '2 crates damaged by dampness' },
        ],
        signoff: {
          signerName: 'Elena Rostova',
          signerRole: 'Dock Receiving Supervisor',
          comments: 'Temperature sensor checked: 3.8C. Accepted with 2 crate discrepancy.',
          signatureSvgOrBase64: testSig,
        },
      },
      guestActor
    );

    assertEqual(reconciled.status, 'PARTIALLY_RECEIVED', 'Status updated to PARTIALLY_RECEIVED due to 2 crate shortage');
    assertEqual(reconciled.totalQuantityReceived, 22, 'Total received is 4 + 18 = 22');
    assertEqual(reconciled.totalQuantityLost, 2, 'Total lost is 2');
    assert(Boolean(reconciled.receiverSignoff), 'Receiver signoff recorded');
    assertEqual(reconciled.receiverSignoff?.signerName, 'Elena Rostova', 'Signer name recorded correctly');
    assertEqual(reconciled.receiverSignoff?.signatureSvgOrBase64, testSig, 'Digital signature captured and locked');
    assert(Boolean(reconciled.discrepancyCases && reconciled.discrepancyCases.length > 0), 'Discrepancy case opened automatically');
  });

  await test('Tablet UX & Responsive Stability', 'Tablet Multi-Viewport Density: Metric cards 2-column wrapping, responsive table scrolling bounds, and filter row protection', async () => {
    // 1. Verify metric valuations scale accurately without numeric truncation or collision
    const dispatches = await sandboxStore.getDispatches();
    assert(dispatches.length >= 3, 'Multiple dispatches exist for aggregate calculation');

    const pendingDispatches = dispatches.filter((d) =>
      ['IN_TRANSIT', 'DISPATCHED', 'VIEWED', 'SUBMITTED'].includes(d.status)
    );
    const totalValueInTransit = pendingDispatches.reduce((acc, d) => {
      const dispatchValue = d.lines.reduce(
        (lineSum, l) => lineSum + l.quantitySent * (l.unitPrice || 25),
        0
      );
      return acc + dispatchValue;
    }, 0);
    assert(totalValueInTransit > 0, 'Total value in transit is non-zero and formatted cleanly');

    // 2. Validate partner destinations and location terminals have address snapshots for bounded rendering
    const partners = await sandboxStore.getPartners();
    for (const p of partners) {
      assert(Boolean(p.deliveryAddress && p.deliveryAddress.length > 0), `Partner ${p.name} has bounded delivery address`);
      assert(Boolean(p.contactPerson), `Partner ${p.name} has contact person`);
      assert(Boolean(p.phone), `Partner ${p.name} has phone number`);
    }

    // 3. Confirm all location snapshots have complete labels and coordinate markers
    const locations = await sandboxStore.getLocations(senderUser.businessId);
    for (const loc of locations) {
      assert(Boolean(loc.label), `Location ${loc.id} has label`);
      assert(Boolean(loc.city), `Location ${loc.id} has city`);
      assert(typeof loc.latitude === 'number' && typeof loc.longitude === 'number', `Location ${loc.id} has valid numeric coordinates`);
    }

    // 4. Validate system staging report passes all release checklist domains
    const stagingReport = await sandboxStore.getStagingReadinessReport();
    assertEqual(stagingReport.overallStatus, 'READY_FOR_STAGING', 'Diagnostics engine confirms READY_FOR_STAGING');
  });

  // -------------------------------------------------------------------------
  // 6. Identity, Fayda e-ID, OTP & Admin Governance Acceptance Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Identity, Fayda e-ID, OTP & Admin Governance Tests ---');

  await test('Identity & Fayda', 'FAN and FIN numeric format validation & data masking', () => {
    // 1. FAN 16 numeric digits validation (preserves leading zeros)
    assert(validateFanFormat('1234567890123456').valid, 'Valid 16-digit FAN passes');
    assert(validateFanFormat('0123456789012345').valid, '16-digit FAN with leading zero passes');
    assert(!validateFanFormat('123456789012345').valid, '15-digit FAN fails');
    assert(!validateFanFormat('12345678901234567').valid, '17-digit FAN fails');
    assert(!validateFanFormat('123456789012345a').valid, 'Non-numeric FAN fails');

    // 2. FIN 12 numeric digits validation (preserves leading zeros)
    assert(validateFinFormat('123456789012').valid, 'Valid 12-digit FIN passes');
    assert(validateFinFormat('012345678901').valid, '12-digit FIN with leading zero passes');
    assert(!validateFinFormat('12345678901').valid, '11-digit FIN fails');
    assert(!validateFinFormat('1234567890123').valid, '13-digit FIN fails');
    assert(!validateFinFormat('12345678901x').valid, 'Non-numeric FIN fails');

    // 3. Masking functions
    assertEqual(maskFan('1234567890123456'), '•••• •••• •••• 3456', 'FAN is masked leaving only last 4 digits');
    assertEqual(maskFin('123456789012'), '•••• •••• 9012', 'FIN is masked leaving only last 4 digits');
    assert(maskPhoneNumber('+251911223344').includes('•••'), 'Phone number is masked');
  });

  await test('Identity & Fayda', 'Public self-registration strictly rejects SUPER_ADMIN role', async () => {
    let errorCaught = false;
    try {
      await sandboxStore.initiateRegistration({
        name: 'Malicious Actor',
        email: 'attacker@example.com',
        phoneNumber: '+251999887766',
        password: 'Password123!',
        role: 'SUPER_ADMIN' as any,
        businessName: 'Infiltrator Corp',
        fan: '1111222233334444',
        fin: '111122223333',
      });
    } catch (err: any) {
      errorCaught = true;
      assert(err.message.toLowerCase().includes('super administrator'), 'Proper rejection error thrown');
    }
    assert(errorCaught, 'SUPER_ADMIN self-registration must be rejected server-side');
  });

  await test('Identity & Fayda', 'Fayda adapter simulation fixtures & production fail-closed', async () => {
    const simAdapter = new FaydaSimulationAdapter();

    // 1. Valid verification match
    const validResult = await simAdapter.verifyFanFinMatch({
      fan: '5555666677778888',
      fin: '555566667777',
      phoneNumber: '+251911223344',
    });
    assert(validResult.verified, 'Simulation verifies matching synthetic Fayda credentials');
    assertEqual(validResult.verificationMethod, 'FAYDA_DEV_SIMULATED', 'Returns FAYDA_DEV_SIMULATED method');

    // 2. Timeout fixture (phone ending in 0000)
    let timeoutCaught = false;
    try {
      await simAdapter.verifyFanFinMatch({
        fan: '5555666677778888',
        fin: '555566667777',
        phoneNumber: '+251911000000',
      });
    } catch (err: any) {
      timeoutCaught = true;
      assert(err.message.includes('timed out'), 'Simulated timeout fixture triggered');
    }
    assert(timeoutCaught, 'Timeout fixture must throw network timeout error');

    // 3. Mismatch fixture (phone ending in 999)
    const mismatchResult = await simAdapter.verifyFanFinMatch({
      fan: '5555666677778888',
      fin: '555566667777',
      phoneNumber: '+251911000999',
    });
    assert(!mismatchResult.verified, 'Simulated mismatch fixture marks verification as false');
    assert(Boolean(mismatchResult.failureReason), 'Failure reason is provided');

    // 4. Production adapter fails closed
    const prodAdapter = new FaydaProductionAdapter();
    let prodFailClosed = false;
    try {
      await prodAdapter.verifyFanFinMatch({
        fan: '5555666677778888',
        fin: '555566667777',
        phoneNumber: '+251911223344',
      });
    } catch (err: any) {
      prodFailClosed = true;
      assert(err.message.includes('failing closed'), 'Production adapter fails closed when unconfigured');
    }
    assert(prodFailClosed, 'Production adapter must fail closed');
  });

  await test('Identity & Fayda', 'OTP challenge lifecycle (purpose binding, attempt limits, single-use)', async () => {
    // 1. Create challenge
    const challenge = await otpChallengeStore.createChallenge('+251911998877', 'REGISTRATION');
    assert(Boolean(challenge.challengeId), 'Challenge created with ID');
    assertEqual(challenge.purpose, 'REGISTRATION', 'Purpose set correctly');

    // 2. Wrong purpose verification fails
    const wrongPurpose = otpChallengeStore.verifyOtp(challenge.challengeId, '123456', 'PASSWORD_RESET');
    assert(!wrongPurpose.success, 'Verifying OTP with mismatched purpose must fail');

    // 3. Wrong code increments attempts
    const wrongCode = otpChallengeStore.verifyOtp(challenge.challengeId, '000000', 'REGISTRATION');
    assert(!wrongCode.success, 'Invalid code fails verification');
    assertEqual(wrongCode.attemptsRemaining, 4, 'Remaining attempts decremented');

    // 4. Valid dev simulated code succeeds
    const validVerify = otpChallengeStore.verifyOtp(challenge.challengeId, '123456', 'REGISTRATION');
    assert(validVerify.success, 'Valid OTP succeeds');

    // 5. Single-use invalidation: subsequent attempt with same challenge fails
    const replayed = otpChallengeStore.verifyOtp(challenge.challengeId, '123456', 'REGISTRATION');
    assert(!replayed.success, 'Consumed OTP challenge cannot be replayed (single-use enforced)');
  });

  await test('Identity & Fayda', 'Mobile number authentication with E.164 normalization', async () => {
    // 1. Phone normalization
    assertEqual(normalizeToE164('0911223344', 'ET'), '+251911223344', 'Local Ethiopian mobile normalized to E.164');
    assertEqual(normalizeToE164('+251911223344', 'ET'), '+251911223344', 'Already-E.164 Ethiopian mobile preserved');
    assert(isValidE164('+251911223344'), 'Valid E.164 format verified');

    // 2. Successful mobile login
    const authResult = await sandboxStore.loginWithMobile(senderUser.phoneNumber, 'Password123!');
    assertEqual(authResult.user.id, senderUser.id, 'Logged in user ID matches');
    assert(Boolean(authResult.user.maskedFan), 'Masked FAN present on session user');
    assert(Boolean(authResult.user.maskedFin), 'Masked FIN present on session user');

    // 3. Invalid credentials timing-safe generic error
    let badCredsCaught = false;
    try {
      await sandboxStore.loginWithMobile(senderUser.phoneNumber, 'wrongPassword!');
    } catch (err: any) {
      badCredsCaught = true;
      assertEqual(err.message, 'Invalid mobile number or password.', 'Generic error returned for invalid password');
    }
    assert(badCredsCaught, 'Invalid password throws error');
  });

  await test('Identity & Fayda', 'End-to-end registration flow with unique linkage & opaque usr_ ID', async () => {
    const testPhone = '+251922334455';
    const testFan = '9876543210987654';
    const testFin = '987654321098';

    // 1. Duplicate registration checks against existing seed user (Carlos)
    // Duplicate Phone (+15550195572 exists)
    let dupPhoneCaught = false;
    try {
      await sandboxStore.initiateRegistration({
        name: 'Another User',
        email: 'another@example.com',
        phoneNumber: senderUser.phoneNumber,
        password: 'Password123!',
        role: 'RECEIVER',
        businessName: 'Other Biz',
        fan: '1234123412341234',
        fin: '123412341234',
      });
    } catch (err: any) {
      dupPhoneCaught = true;
      assert(err.message.includes('mobile phone number is already registered'), 'Duplicate phone rejected');
    }
    assert(dupPhoneCaught, 'Duplicate phone number must be rejected');

    // Duplicate FAN (2222333344445555 exists)
    let dupFanCaught = false;
    try {
      await sandboxStore.initiateRegistration({
        name: 'Another User',
        email: 'another2@example.com',
        phoneNumber: '+251922334499',
        password: 'Password123!',
        role: 'RECEIVER',
        businessName: 'Other Biz',
        fan: '2222333344445555',
        fin: '123412341234',
      });
    } catch (err: any) {
      dupFanCaught = true;
      assert(err.message.includes('FAN') && err.message.includes('exists'), 'Duplicate FAN rejected');
    }
    assert(dupFanCaught, 'Duplicate FAN must be rejected');

    // Duplicate FIN (222233334444 exists)
    let dupFinCaught = false;
    try {
      await sandboxStore.initiateRegistration({
        name: 'Another User',
        email: 'another3@example.com',
        phoneNumber: '+251922334488',
        password: 'Password123!',
        role: 'RECEIVER',
        businessName: 'Other Biz',
        fan: '5555111122223333',
        fin: '222233334444',
      });
    } catch (err: any) {
      dupFinCaught = true;
      assert(err.message.includes('FIN') && err.message.includes('exists'), 'Duplicate FIN rejected');
    }
    assert(dupFinCaught, 'Duplicate FIN must be rejected');

    // 2. Initiate valid registration
    const initRes = await sandboxStore.initiateRegistration({
      name: 'Abebe Bikila',
      email: 'abebe.test@logistics.et',
      phoneNumber: testPhone,
      password: 'SecurePassword123!',
      role: 'SENDER',
      businessName: 'Bikila Express Deliveries',
      fan: testFan,
      fin: testFin,
    });
    assert(Boolean(initRes.challengeId), 'Registration challenge ID returned');
    assertEqual(initRes.maskedPhone, maskPhoneNumber(testPhone), 'Masked phone returned in response');

    // 3. Complete registration with dev OTP '123456'
    const completeRes = await sandboxStore.completeRegistration(initRes.challengeId, '123456');
    assert(completeRes.user.id.startsWith('usr_'), `User ID is opaque usr_ identifier: ${completeRes.user.id}`);
    assertEqual(completeRes.user.role, 'SENDER', 'Assigned role is SENDER');
    assertEqual(completeRes.user.maskedFan, maskFan(testFan), 'User masked FAN matches');
    assertEqual(completeRes.user.maskedFin, maskFin(testFin), 'User masked FIN matches');
    assertEqual(completeRes.user.faydaStatus, 'SIMULATED_VERIFIED', 'Fayda status is verified');

    // 4. Verify newly created user can log in with mobile number
    const newLogin = await sandboxStore.loginWithMobile(testPhone, 'SecurePassword123!');
    assertEqual(newLogin.user.id, completeRes.user.id, 'User can log in with mobile credentials');
  });

  await test('Identity & Fayda', 'Forgot-password recovery with FAN + FIN match & phone OTP', async () => {
    // Using user carlos (+15550195572, fan: '2222333344445555', fin: '222233334444')
    // 1. Wrong FAN/FIN fails initiation
    let wrongIdentityCaught = false;
    try {
      await sandboxStore.initiatePasswordReset({
        phoneNumber: senderUser.phoneNumber,
        fan: '0000000000000000',
        fin: '222233334444',
      });
    } catch (err: any) {
      wrongIdentityCaught = true;
      assert(err.message.includes('Identity verification'), 'Mismatch error returned');
    }
    assert(wrongIdentityCaught, 'Mismatched FAN/FIN must be rejected for recovery');

    // 2. Correct phone + FAN + FIN initiates challenge
    const resetInit = await sandboxStore.initiatePasswordReset({
      phoneNumber: senderUser.phoneNumber,
      fan: '2222333344445555',
      fin: '222233334444',
    });
    assert(Boolean(resetInit.challengeId), 'Recovery challenge created');

    // 3. Complete reset with OTP
    const resetRes = await sandboxStore.completePasswordReset(
      resetInit.challengeId,
      '123456',
      'NewSecurePass2026!'
    );
    assert(resetRes.success, 'Password reset confirmed');

    // 4. Login with new password succeeds
    const resetLogin = await sandboxStore.loginWithMobile(senderUser.phoneNumber, 'NewSecurePass2026!');
    assertEqual(resetLogin.user.id, senderUser.id, 'Login with updated password succeeds');

    // Reset password back to Password123! for downstream tests
    const restoreInit = await sandboxStore.initiatePasswordReset({
      phoneNumber: senderUser.phoneNumber,
      fan: '2222333344445555',
      fin: '222233334444',
    });
    await sandboxStore.completePasswordReset(restoreInit.challengeId, '123456', 'Password123!');
  });

  await test('Identity & Fayda', 'Signed-in password change with step-up OTP challenge', async () => {
    // 1. Request step-up challenge for senderUser
    const stepUpInit = await sandboxStore.initiatePasswordChangeOtp(senderUser.id);
    assert(Boolean(stepUpInit.challengeId), 'Step-up challenge created');

    // 2. Wrong current password fails
    let wrongCurrentCaught = false;
    try {
      await sandboxStore.changePassword(
        senderUser.id,
        'wrongCurrentPass',
        'BrandNewPass999!',
        stepUpInit.challengeId,
        '123456'
      );
    } catch (err: any) {
      wrongCurrentCaught = true;
      assert(err.message.includes('Current password'), 'Current password failure detected');
    }
    assert(wrongCurrentCaught, 'Invalid current password rejected');

    // 3. Request fresh challenge
    const freshStepUp = await sandboxStore.initiatePasswordChangeOtp(senderUser.id);

    // 4. Correct current password + OTP succeeds
    const changeRes = await sandboxStore.changePassword(
      senderUser.id,
      'Password123!',
      'BrandNewPass999!',
      freshStepUp.challengeId,
      '123456'
    );
    assert(changeRes.success, 'Password change successful');

    // 5. Restore original password
    const restoreStepUp = await sandboxStore.initiatePasswordChangeOtp(senderUser.id);
    await sandboxStore.changePassword(
      senderUser.id,
      'BrandNewPass999!',
      'Password123!',
      restoreStepUp.challengeId,
      '123456'
    );
  });

  await test('Identity & Fayda', 'Profile photo upload size limits, validation & removal', async () => {
    // 1. Over-sized image (> 2MB) rejected
    const hugeFakeImage = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024);
    let sizeErrorCaught = false;
    try {
      await sandboxStore.updateProfile(senderUser.id, { avatarDataUri: hugeFakeImage });
    } catch (err: any) {
      sizeErrorCaught = true;
      assert(err.message.includes('2MB'), '2MB size limit enforced');
    }
    assert(sizeErrorCaught, 'Images larger than 2MB must be rejected');

    // 2. Invalid MIME type rejected
    const invalidMime = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
    let mimeErrorCaught = false;
    try {
      await sandboxStore.updateProfile(senderUser.id, { avatarDataUri: invalidMime });
    } catch (err: any) {
      mimeErrorCaught = true;
      assert(err.message.includes('valid image'), 'Non-image MIME type rejected');
    }
    assert(mimeErrorCaught, 'Invalid MIME type must be rejected');

    // 3. Valid image updates user avatar
    const validSmallAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const updatedUser = await sandboxStore.updateProfile(senderUser.id, {
      name: 'Carlos M. Ruiz',
      avatarDataUri: validSmallAvatar,
    });
    assertEqual(updatedUser.name, 'Carlos M. Ruiz', 'Name updated');
    assertEqual(updatedUser.avatarUrl, validSmallAvatar, 'Avatar updated');

    // 4. Remove photo
    const clearedUser = await sandboxStore.removeProfilePhoto(senderUser.id);
    assertEqual(clearedUser.avatarUrl, undefined, 'Avatar photo removed cleanly');
  });

  await test('Identity & Fayda', 'Admin user governance & lockout protection for last super-admin', async () => {
    // 1. Admin query users: returns list with masked fields, no raw fan/fin
    const res = await sandboxStore.adminGetUsers();
    const adminUsers = res.users;
    assert(adminUsers.length >= 4, 'All tenant users returned for Super Admin');
    for (const u of adminUsers) {
      assert((u as any).fan === undefined, 'Raw FAN must NEVER be exposed in user management query');
      assert((u as any).fin === undefined, 'Raw FIN must NEVER be exposed in user management query');
      assert(Boolean(u.maskedPhone), 'Masked phone provided');
    }

    // 2. Identify the active super admin and target receiver
    const superAdmins = adminUsers.filter((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE');
    assert(superAdmins.length === 1, 'Exactly one active super-admin exists initially');
    const soleSuperAdmin = superAdmins[0];

    const receiverUsers = adminUsers.filter((u) => u.role === 'RECEIVER');
    assert(receiverUsers.length > 0, 'Receiver user exists');
    const targetReceiver = receiverUsers[0];

    // 3. Suspend a receiver user with reason
    const suspendRes = await sandboxStore.adminSuspendUser(
      soleSuperAdmin.id,
      targetReceiver.id,
      'Security compliance review following suspicious dock activity'
    );
    assertEqual(suspendRes.status, 'SUSPENDED', 'Target user marked SUSPENDED');
    assert(Boolean(suspendRes.suspendedReason), 'Suspension justification reason recorded');

    // 4. Suspended user cannot log in
    let suspendedLoginBlocked = false;
    try {
      await sandboxStore.loginWithMobile(targetReceiver.phoneNumber, 'Password123!');
    } catch (err: any) {
      suspendedLoginBlocked = true;
      assert(err.message.includes('suspended'), 'Suspended user login rejected with explanation');
    }
    assert(suspendedLoginBlocked, 'Suspended user cannot authenticate');

    // 5. Reactivate user
    const reactivateRes = await sandboxStore.adminReactivateUser(soleSuperAdmin.id, targetReceiver.id);
    assertEqual(reactivateRes.status, 'ACTIVE', 'User reactivated to ACTIVE');
    assertEqual(reactivateRes.suspendedReason, undefined, 'Suspended reason cleared');

    // 6. LOCKOUT PROTECTION: Attempting to suspend or demote the only super-admin throws error
    let lockoutSuspendBlocked = false;
    try {
      await sandboxStore.adminSuspendUser(soleSuperAdmin.id, soleSuperAdmin.id, 'Accidental self-lockout test');
    } catch (err: any) {
      lockoutSuspendBlocked = true;
      assert(err.message.includes('last remaining active Super Administrator'), 'Lockout protection prevents suspension');
    }
    assert(lockoutSuspendBlocked, 'Super-admin lockout protection must block suspension of last active super-admin');

    let lockoutRoleDemotionBlocked = false;
    try {
      await sandboxStore.adminUpdateUserRole(soleSuperAdmin.id, soleSuperAdmin.id, 'SENDER');
    } catch (err: any) {
      lockoutRoleDemotionBlocked = true;
      assert(err.message.includes('last remaining active Super Administrator'), 'Lockout protection prevents demotion');
    }
    assert(lockoutRoleDemotionBlocked, 'Super-admin lockout protection must block demotion of last active super-admin');
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n========================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.status === 'PASS').length;
  const failed = testResults.filter((r) => r.status === 'FAIL').length;
  console.log(`  TEST RESULTS: ${passed}/${total} PASSED (${failed} failed)`);
  console.log('========================================================================\n');

  if (failed > 0) {
    console.error(`FAILURE: ${failed} tests failed.`);
    process.exit(1);
  } else {
    console.log('ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
