import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateItemTotals,
  calculateReconciliation,
  isValidStatusTransition,
  computeIntegrityHash,
  formatDispatchNumber
} from './dispatch-rules';
import { DispatchItem } from '../types';

test('calculateItemTotals correctly sums quantity and value', () => {
  const items: DispatchItem[] = [
    {
      id: 'item-1',
      name: 'Industrial Widget A',
      skuOrBatch: 'BAT-001',
      quantity: 10,
      unit: 'crates',
      unitPrice: 25.5,
      totalValue: 255.0
    },
    {
      id: 'item-2',
      name: 'Hydraulic Seal Kit',
      skuOrBatch: 'BAT-002',
      quantity: 5,
      unit: 'packs',
      unitPrice: 40.0,
      totalValue: 200.0
    }
  ];

  const result = calculateItemTotals(items);
  assert.equal(result.totalQuantity, 15);
  assert.equal(result.totalValue, 455.0);
});

test('calculateReconciliation handles perfect delivery outcome', () => {
  // Dispatched 100, received 100, damaged 0 -> accepted 100, loss 0
  const result = calculateReconciliation(100, 15.0, 100, 0);
  assert.equal(result.acceptedQuantity, 100);
  assert.equal(result.missingQuantity, 0);
  assert.equal(result.discrepancyValue, 0);
  assert.equal(result.status, 'ACCEPTED');
});

test('calculateReconciliation correctly computes missing items and loss value', () => {
  // Dispatched 100, received 90, damaged 5 -> missing 10, accepted 85, lossUnits = 15
  const result = calculateReconciliation(100, 20.0, 90, 5);
  assert.equal(result.missingQuantity, 10);
  assert.equal(result.acceptedQuantity, 85);
  assert.equal(result.discrepancyValue, 300.0); // 15 * 20.0
  assert.equal(result.status, 'DISPUTED');
});

test('isValidStatusTransition enforces state machine integrity', () => {
  assert.equal(isValidStatusTransition('DRAFT', 'DISPATCHED'), true);
  assert.equal(isValidStatusTransition('DISPATCHED', 'VIEWED'), true);
  assert.equal(isValidStatusTransition('VIEWED', 'DELIVERED'), true);
  assert.equal(isValidStatusTransition('DELIVERED', 'RECONCILED'), true);
  
  // Invalid backwards transition
  assert.equal(isValidStatusTransition('DELIVERED', 'DRAFT'), false);
  assert.equal(isValidStatusTransition('RECONCILED', 'DISPATCHED'), false);
});

test('computeIntegrityHash produces deterministic 64-char hash', () => {
  const payload = { dispatchId: 'DSP-001', amount: 500 };
  const hash1 = computeIntegrityHash(payload, 'GENESIS');
  const hash2 = computeIntegrityHash(payload, 'GENESIS');
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 64);

  const hashModified = computeIntegrityHash({ dispatchId: 'DSP-001', amount: 501 }, 'GENESIS');
  assert.notEqual(hash1, hashModified);
});

test('formatDispatchNumber pads sequence with year', () => {
  assert.equal(formatDispatchNumber(7, 2026), 'DSP-2026-0007');
  assert.equal(formatDispatchNumber(125, 2026), 'DSP-2026-0125');
});
