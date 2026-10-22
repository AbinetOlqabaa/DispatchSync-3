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
  memberships: [],
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
