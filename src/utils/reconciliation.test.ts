import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemReconciliation,
  calculateDispatchTotals,
  validatePhoneNumber,
  generateTrackingCode,
  computeAuditChecksum,
} from './reconciliation.ts';

test('reconciliation matches exact quantity without loss', () => {
  const result = calculateItemReconciliation({
    dispatchedQty: 50,
    receivedQty: 50,
    damagedQty: 0,
    missingQty: 0,
    unitPrice: 12.5,
  });

  assert.equal(result.isDiscrepancy, false);
  assert.equal(result.quantityVariance, 0);
  assert.equal(result.totalLossAmount, 0);
  assert.equal(result.matchStatus, 'MATCH');
});

test('reconciliation detects shortage with missing units and calculates financial loss', () => {
  const result = calculateItemReconciliation({
    dispatchedQty: 100,
    receivedQty: 90,
    damagedQty: 2,
    missingQty: 8,
    unitPrice: 25.0,
  });

  assert.equal(result.isDiscrepancy, true);
  assert.equal(result.matchStatus, 'SHORTAGE');
  // Loss = (2 damaged + 8 missing) * 25 = 250
  assert.equal(result.totalLossAmount, 250);
});

test('reconciliation flags damaged-only variance when all units arrive but some damaged', () => {
  const result = calculateItemReconciliation({
    dispatchedQty: 40,
    receivedQty: 35,
    damagedQty: 5,
    missingQty: 0,
    unitPrice: 10.0,
  });

  assert.equal(result.isDiscrepancy, true);
  assert.equal(result.matchStatus, 'DAMAGED_ONLY');
  assert.equal(result.totalLossAmount, 50.0);
});

test('calculateDispatchTotals aggregates correctly across multi-item manifest', () => {
  const items = [
    { dispatchedQty: 100, receivedQty: 100, damagedQty: 0, missingQty: 0, unitPrice: 10 },
    { dispatchedQty: 50, receivedQty: 40, damagedQty: 5, missingQty: 5, unitPrice: 20 },
  ];

  const totals = calculateDispatchTotals(items);

  assert.equal(totals.totalDispatchedQty, 150);
  assert.equal(totals.totalReceivedQty, 140);
  assert.equal(totals.totalDamagedQty, 5);
  assert.equal(totals.totalMissingQty, 5);
  // Loss = (5+5)*20 = 200
  assert.equal(totals.totalLossAmount, 200);
  assert.equal(totals.hasDiscrepancies, true);
});

test('validatePhoneNumber validates and normalizes phone numbers', () => {
  const valid1 = validatePhoneNumber('+1 (555) 234-5678');
  assert.equal(valid1.isValid, true);
  assert.equal(valid1.normalized, '+15552345678');

  const valid2 = validatePhoneNumber('251911234567');
  assert.equal(valid2.isValid, true);
  assert.equal(valid2.normalized, '+251911234567');

  const invalid = validatePhoneNumber('abc123');
  assert.equal(invalid.isValid, false);
});

test('generateTrackingCode produces structured non-empty code', () => {
  const code = generateTrackingCode();
  assert.match(code, /^DSP-\d{8}-[A-Z0-9]{4}$/);
});

test('computeAuditChecksum generates deterministic tamper-evident hash', () => {
  const record = {
    id: 'evt_1',
    timestamp: '2026-10-21T12:00:00Z',
    actorId: 'usr_admin',
    action: 'DISPATCH_CREATED',
    payloadSummary: 'Created DSP-001 with 2 items',
  };

  const hash1 = computeAuditChecksum(record);
  const hash2 = computeAuditChecksum(record);
  assert.equal(hash1, hash2);
  assert.ok(hash1.startsWith('chk_'));

  // Changing payload produces different checksum
  const alteredHash = computeAuditChecksum({ ...record, payloadSummary: 'Tampered' });
  assert.notEqual(hash1, alteredHash);
});
