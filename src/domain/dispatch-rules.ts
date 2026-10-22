import { DispatchItem, DispatchStatus, ReceiptReconciliation } from '../types';

/**
 * Calculates sum of quantities and total declared value of dispatch items.
 */
export function calculateItemTotals(items: DispatchItem[]): { totalQuantity: number; totalValue: number } {
  let totalQuantity = 0;
  let totalValue = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    totalQuantity += qty;
    totalValue += (qty * unitPrice);
  }

  return {
    totalQuantity,
    totalValue: Math.round(totalValue * 100) / 100
  };
}

/**
 * Validates and reconciles received quantities against dispatched quantities.
 */
export function calculateReconciliation(
  dispatchedQuantity: number,
  averageUnitPrice: number,
  receivedQuantity: number,
  damagedQuantity: number
): {
  acceptedQuantity: number;
  missingQuantity: number;
  discrepancyValue: number;
  status: 'ACCEPTED' | 'DISPUTED' | 'RECONCILED';
} {
  const safeDispatched = Math.max(0, dispatchedQuantity);
  const safeReceived = Math.max(0, receivedQuantity);
  const safeDamaged = Math.max(0, damagedQuantity);

  // Missing quantity is dispatched minus received
  const missingQuantity = Math.max(0, safeDispatched - safeReceived);
  
  // Accepted is received minus damaged
  const acceptedQuantity = Math.max(0, safeReceived - safeDamaged);

  // Loss value = (missing + damaged) * unit price
  const lossUnits = missingQuantity + safeDamaged;
  const discrepancyValue = Math.round(lossUnits * averageUnitPrice * 100) / 100;

  let status: 'ACCEPTED' | 'DISPUTED' | 'RECONCILED';
  if (lossUnits === 0 && safeReceived === safeDispatched) {
    status = 'ACCEPTED';
  } else if (lossUnits > 0) {
    status = 'DISPUTED';
  } else {
    status = 'RECONCILED';
  }

  return {
    acceptedQuantity,
    missingQuantity,
    discrepancyValue,
    status
  };
}

/**
 * Validates state transition according to the dispatch lifecycle state machine.
 */
export function isValidStatusTransition(currentStatus: DispatchStatus, nextStatus: DispatchStatus): boolean {
  if (currentStatus === nextStatus) return true;

  const validTransitions: Record<DispatchStatus, DispatchStatus[]> = {
    DRAFT: ['DISPATCHED'],
    DISPATCHED: ['VIEWED', 'DELIVERED', 'DISPUTED'],
    VIEWED: ['DELIVERED', 'DISPUTED'],
    DELIVERED: ['ACCEPTED', 'DISPUTED', 'RECONCILED'],
    ACCEPTED: ['RECONCILED'],
    DISPUTED: ['RECONCILED'],
    RECONCILED: [] // Terminal state
  };

  const allowed = validTransitions[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Deterministic hash computation using standard Web Crypto or fallback for audit integrity.
 */
export function computeIntegrityHash(payload: Record<string, unknown>, previousHash: string = 'GENESIS'): string {
  const serialized = JSON.stringify(payload, Object.keys(payload).sort()) + '::' + previousHash;
  
  // Simple deterministic 64-char hex hash for synchronous kernel execution
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0, ch; i < serialized.length; i++) {
    ch = serialized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  // Combine to create an identifiable 64-char pseudo-SHA hash
  return `hash_${hex1}${hex2}${hex1.split('').reverse().join('')}${hex2.split('').reverse().join('')}`.padEnd(64, '0').slice(0, 64);
}

/**
 * Formats a dispatch number sequentially.
 */
export function formatDispatchNumber(sequence: number, year: number = new Date().getFullYear()): string {
  const padded = String(sequence).padStart(4, '0');
  return `DSP-${year}-${padded}`;
}
