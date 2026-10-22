/**
 * Core business rules and pure logic calculations for dispatch & delivery reconciliation.
 * Decoupled from UI components for deterministic unit-testing.
 */

export interface ItemReconciliationInput {
  dispatchedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  unitPrice: number;
}

export interface ItemReconciliationResult {
  dispatchedQty: number;
  receivedQty: number;
  damagedQty: number;
  missingQty: number;
  netGoodQty: number;
  quantityVariance: number; // positive = surplus, negative = deficit
  isDiscrepancy: boolean;
  totalLossAmount: number;
  matchStatus: 'MATCH' | 'SHORTAGE' | 'OVERAGE' | 'DAMAGED_ONLY';
}

export interface DispatchTotals {
  totalDispatchedQty: number;
  totalReceivedQty: number;
  totalDamagedQty: number;
  totalMissingQty: number;
  totalLossAmount: number;
  overallMatchRate: number; // percentage 0 - 100
  hasDiscrepancies: boolean;
}

/**
 * Reconciles a single line item given dispatched and reported quantities.
 */
export function calculateItemReconciliation(input: ItemReconciliationInput): ItemReconciliationResult {
  const dispatched = Math.max(0, input.dispatchedQty);
  const received = Math.max(0, input.receivedQty);
  const damaged = Math.max(0, input.damagedQty);
  const missing = Math.max(0, input.missingQty);
  const unitPrice = Math.max(0, input.unitPrice);

  // Accounting balance: accounted for = received (good) + damaged + missing
  const totalAccounted = received + damaged + missing;
  const quantityVariance = totalAccounted - dispatched;

  // Direct loss includes items marked damaged or missing
  const totalLossAmount = Number(((damaged + missing) * unitPrice).toFixed(2));

  let matchStatus: ItemReconciliationResult['matchStatus'] = 'MATCH';
  if (quantityVariance < 0 || missing > 0) {
    matchStatus = 'SHORTAGE';
  } else if (quantityVariance > 0) {
    matchStatus = 'OVERAGE';
  } else if (damaged > 0) {
    matchStatus = 'DAMAGED_ONLY';
  }

  const isDiscrepancy = quantityVariance !== 0 || damaged > 0 || missing > 0;

  return {
    dispatchedQty: dispatched,
    receivedQty: received,
    damagedQty: damaged,
    missingQty: missing,
    netGoodQty: received,
    quantityVariance,
    isDiscrepancy,
    totalLossAmount,
    matchStatus,
  };
}

/**
 * Computes aggregate summary metrics across all items in a dispatch manifest.
 */
export function calculateDispatchTotals(
  items: Array<{
    dispatchedQty: number;
    receivedQty?: number;
    damagedQty?: number;
    missingQty?: number;
    unitPrice?: number;
  }>
): DispatchTotals {
  let totalDispatchedQty = 0;
  let totalReceivedQty = 0;
  let totalDamagedQty = 0;
  let totalMissingQty = 0;
  let totalLossAmount = 0;

  for (const item of items) {
    const itemRecon = calculateItemReconciliation({
      dispatchedQty: item.dispatchedQty,
      receivedQty: item.receivedQty ?? 0,
      damagedQty: item.damagedQty ?? 0,
      missingQty: item.missingQty ?? 0,
      unitPrice: item.unitPrice ?? 0,
    });

    totalDispatchedQty += itemRecon.dispatchedQty;
    totalReceivedQty += itemRecon.receivedQty;
    totalDamagedQty += itemRecon.damagedQty;
    totalMissingQty += itemRecon.missingQty;
    totalLossAmount += itemRecon.totalLossAmount;
  }

  const hasDiscrepancies =
    totalDamagedQty > 0 || totalMissingQty > 0 || totalReceivedQty !== totalDispatchedQty;

  const overallMatchRate =
    totalDispatchedQty > 0
      ? Number(Math.max(0, Math.min(100, (totalReceivedQty / totalDispatchedQty) * 100)).toFixed(1))
      : 100;

  return {
    totalDispatchedQty,
    totalReceivedQty,
    totalDamagedQty,
    totalMissingQty,
    totalLossAmount: Number(totalLossAmount.toFixed(2)),
    overallMatchRate,
    hasDiscrepancies,
  };
}

/**
 * Validates international phone numbers for driver / recipient dispatch communication.
 */
export function validatePhoneNumber(phone: string): { isValid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: '', error: 'Phone number is required.' };
  }

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Must contain only digits, optionally leading with '+'
  const phoneRegex = /^\+?[1-9]\d{6,14}$/;

  if (!phoneRegex.test(cleaned)) {
    return {
      isValid: false,
      normalized: cleaned,
      error: 'Please enter a valid international phone number (e.g., +1234567890 or 10-15 digits).',
    };
  }

  const normalized = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  return { isValid: true, normalized };
}

/**
 * Generates an immutable tracking reference code.
 */
export function generateTrackingCode(prefix = 'DSP'): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${randomSuffix}`;
}

/**
 * Computes a pseudo-cryptographic audit checksum for tamper-evidence verification.
 */
export function computeAuditChecksum(record: {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  payloadSummary: string;
  previousChecksum?: string;
}): string {
  const raw = `${record.previousChecksum || 'GENESIS'}|${record.id}|${record.timestamp}|${record.actorId}|${record.action}|${record.payloadSummary}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `chk_${hex}`;
}
