import React, { useState } from 'react';
import {
  X,
  Truck,
  Building,
  MapPin,
  Calendar,
  Hash,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Share2,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { Dispatch, UserRole, ReceiptReconciliation } from '../../types';
import { sandboxAdapter } from '../../services/local-adapter';
import { calculateReconciliation } from '../../domain/dispatch-rules';
import { useAuth } from '../../context/AuthContext';

interface DispatchDetailModalProps {
  dispatch: Dispatch | null;
  userRole: UserRole;
  onClose: () => void;
  onDispatchUpdated: (updated: Dispatch) => void;
}

export const DispatchDetailModal: React.FC<DispatchDetailModalProps> = ({
  dispatch,
  userRole,
  onClose,
  onDispatchUpdated
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'MANIFEST' | 'RECONCILIATION' | 'AUDIT'>('MANIFEST');

  // Receipt form states
  const [receivedQty, setReceivedQty] = useState<number>(dispatch ? dispatch.totalQuantity : 0);
  const [damagedQty, setDamagedQty] = useState<number>(0);
  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>('');
  const [signerName, setSignerName] = useState<string>(user?.name || (user as any)?.fullName || 'Receiver Agent');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  if (!dispatch) return null;

  const avgUnitPrice = dispatch.totalQuantity > 0 ? dispatch.totalValue / dispatch.totalQuantity : 0;
  const reconMath = calculateReconciliation(dispatch.totalQuantity, avgUnitPrice, receivedQty, damagedQty);

  const canReconcile =
    (userRole === 'RECEIVER' || userRole === 'BUSINESS_OWNER' || userRole === 'SUPER_ADMIN') &&
    dispatch.status !== 'RECONCILED';

  const handleSimulatePartnerView = async () => {
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const updated = await sandboxAdapter.markAsViewed(dispatch.id, `${dispatch.receiverPartnerName} (via Secure Share Link)`);
      onDispatchUpdated(updated);
      setActionNotice('Status updated to VIEWED: Partner access timestamp has been recorded in the tamper-resistant ledger.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const reconciliationPayload: ReceiptReconciliation = {
        recordedAt: new Date().toISOString(),
        recordedBy: signerName,
        receivedQuantity: receivedQty,
        acceptedQuantity: reconMath.acceptedQuantity,
        damagedQuantity: damagedQty,
        missingQuantity: reconMath.missingQuantity,
        discrepancyValue: reconMath.discrepancyValue,
        notes: discrepancyNotes,
        signedByName: signerName
      };

      const updated = await sandboxAdapter.recordReceipt(dispatch.id, reconciliationPayload);
      onDispatchUpdated(updated);
      setActionNotice('Receipt & reconciliation sealed. Status updated in the immutable audit ledger.');
      setActiveTab('RECONCILIATION');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        <button
          onClick={onClose}
          aria-label="Close dispatch details dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-lg font-bold text-white">{dispatch.dispatchNumber}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {dispatch.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sender: <span className="text-slate-200">{dispatch.senderName}</span> ({dispatch.businessName})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dispatch.status === 'DISPATCHED' && (
              <button
                onClick={handleSimulatePartnerView}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-xs transition"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Simulate Partner View</span>
              </button>
            )}
          </div>
        </div>

        {actionNotice && (
          <div className="my-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-slate-800 my-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('MANIFEST')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'MANIFEST'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Manifest & Routing
          </button>
          <button
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'RECONCILIATION'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Receipt & Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-2.5 px-3 border-b-2 transition ${
              activeTab === 'AUDIT'
                ? 'border-indigo-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Integrity Hash & Cryptography
          </button>
        </div>

        {/* Tab 1: Manifest */}
        {activeTab === 'MANIFEST' && (
          <div className="space-y-4 text-xs">
            {/* Route Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">Origin Location</span>
                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{dispatch.originLocation}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-0.5">Destination Partner</span>
                <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                  <Building className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{dispatch.receiverPartnerName}</span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5">{dispatch.destinationLocation}</div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-200">Declared Manifest Items</span>
                <span className="text-slate-400">
                  {dispatch.items.length} items • {dispatch.totalQuantity} total units
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5">SKU / Batch</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {dispatch.items.map((it) => (
                      <tr key={it.id}>
                        <td className="p-2.5 font-medium text-slate-100">{it.name}</td>
                        <td className="p-2.5 font-mono text-slate-400">{it.skuOrBatch}</td>
                        <td className="p-2.5 text-right font-medium text-slate-200">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2.5 text-right text-slate-300">${it.unitPrice.toFixed(2)}</td>
                        <td className="p-2.5 text-right font-mono font-semibold text-emerald-400">
                          ${it.totalValue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950/90 font-semibold border-t border-slate-800 text-slate-200">
                    <tr>
                      <td colSpan={2} className="p-2.5">Total Declared Shipment Value</td>
                      <td className="p-2.5 text-right">{dispatch.totalQuantity} units</td>
                      <td colSpan={2} className="p-2.5 text-right font-mono text-emerald-400 text-sm">
                        ${dispatch.totalValue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {dispatch.notes && (
              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                <span className="text-slate-500 block text-[11px] mb-0.5">Special Instructions</span>
                <p className="text-slate-300">{dispatch.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reconciliation */}
        {activeTab === 'RECONCILIATION' && (
          <div className="space-y-4 text-xs">
            {dispatch.reconciliation ? (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-white">Receipt Sealed by Receiver</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(dispatch.reconciliation.recordedAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Received</span>
                    <span className="text-sm font-bold text-slate-100">{dispatch.reconciliation.receivedQuantity}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Accepted</span>
                    <span className="text-sm font-bold text-emerald-400">{dispatch.reconciliation.acceptedQuantity}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Damaged</span>
                    <span className="text-sm font-bold text-amber-400">{dispatch.reconciliation.damagedQuantity}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Missing</span>
                    <span className="text-sm font-bold text-rose-400">{dispatch.reconciliation.missingQuantity}</span>
                  </div>
                </div>

                {dispatch.reconciliation.discrepancyValue > 0 && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total Net Loss Value Disputed:</span>
                      <span className="font-mono">${dispatch.reconciliation.discrepancyValue.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {dispatch.reconciliation.notes && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">Agent Notes:</span>
                    <p className="text-slate-300 italic mt-0.5">"{dispatch.reconciliation.notes}"</p>
                  </div>
                )}
              </div>
            ) : canReconcile ? (
              <form onSubmit={handleRecordReceipt} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                <div>
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-400" />
                    <span>Record Partner Delivery Receipt</span>
                  </h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Enter the count of physically received and damaged items. Discrepancies are computed automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">
                      Total Units Physically Received (Dispatched: {dispatch.totalQuantity})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={receivedQty}
                      onChange={(e) => setReceivedQty(Number(e.target.value) || 0)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Damaged / Defective Units</label>
                    <input
                      type="number"
                      min="0"
                      value={damagedQty}
                      onChange={(e) => setDamagedQty(Number(e.target.value) || 0)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Real-time Reconciliation Calculator Outcome */}
                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Accepted Clean Units:</span>
                    <span className="font-bold text-emerald-400">{reconMath.acceptedQuantity} units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Missing Units:</span>
                    <span className="font-bold text-rose-400">{reconMath.missingQuantity} units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Calculated Loss Discrepancy:</span>
                    <span className="font-bold font-mono text-rose-300">
                      ${reconMath.discrepancyValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-500/20 text-[11px]">
                    <span className="text-slate-400">Post-Receipt Status:</span>
                    <span className="font-bold uppercase tracking-wider text-amber-300">{reconMath.status}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Discrepancy / Inspection Notes</label>
                  <textarea
                    rows={2}
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    placeholder="Describe any damaged packaging or missing batch items..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Authorized Signer Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Sealing Receipt...' : 'Confirm Receipt & Seal Reconciliation'}
                </button>
              </form>
            ) : (
              <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400">
                Receipt has not yet been recorded for this dispatch.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audit Hashes */}
        {activeTab === 'AUDIT' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Tamper-Resistant SHA-256 Ledger Node</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Each state transition cryptographically seals the dispatch payload with the previous block's hash. Any tampering with quantities or declared values invalidates the chain.
              </p>

              <div className="space-y-1.5 pt-2">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Current Dispatch Integrity Hash</span>
                  <code className="text-xs font-mono text-indigo-300 bg-slate-900 p-1.5 rounded block overflow-x-auto">
                    {dispatch.auditHash}
                  </code>
                </div>

                {dispatch.previousHash && (
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Previous Linked Hash</span>
                    <code className="text-xs font-mono text-slate-400 bg-slate-900 p-1.5 rounded block overflow-x-auto">
                      {dispatch.previousHash}
                    </code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            Close Detail
          </button>
        </div>
      </div>
    </div>
  );
};
