import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Building,
  MapPin,
  Calendar,
  Clock,
  Printer,
  ShieldCheck,
  UserCheck,
  Package,
  Camera,
  PenTool,
} from 'lucide-react';
import { CargoEvidence, DiscrepancyType, Dispatch, ItemCondition } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { SignaturePad } from '../../components/dispatches/SignaturePad.js';
import { DamagePhotoUpload } from '../../components/dispatches/DamagePhotoUpload.js';

interface PublicPartnerViewProps {
  shareToken: string;
  onExit?: () => void;
}

export const PublicPartnerView: React.FC<PublicPartnerViewProps> = ({ shareToken, onExit }) => {
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Receipt verification form
  const [isVerifying, setIsVerifying] = useState(false);
  const [lineReceipts, setLineReceipts] = useState<
    Array<{
      id: string;
      quantityReceived: number;
      condition: ItemCondition;
      discrepancyType: DiscrepancyType;
      notes: string;
      evidence?: CargoEvidence[];
    }>
  >([]);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('Receiving Manager');
  const [comments, setComments] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [evidencePhotos, setEvidencePhotos] = useState<CargoEvidence[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadPublicDispatch();
  }, [shareToken]);

  const loadPublicDispatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPublicDispatch(shareToken);
      setDispatch(data);
      setLineReceipts(
        data.lines.map((l) => ({
          id: l.id,
          quantityReceived: l.quantityReceived !== undefined ? l.quantityReceived : l.quantitySent,
          condition: l.condition || 'GOOD',
          discrepancyType: l.discrepancyType || 'NONE',
          notes: l.notes || '',
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Delivery manifest not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleLineCountChange = (index: number, receivedCount: number) => {
    if (!dispatch) return;
    const original = dispatch.lines[index];
    const recv = Math.max(0, receivedCount);
    const loss = Math.max(0, original.quantitySent - recv);

    const updated = [...lineReceipts];
    updated[index].quantityReceived = recv;
    if (loss === 0) {
      updated[index].discrepancyType = 'NONE';
    } else if (updated[index].discrepancyType === 'NONE') {
      updated[index].discrepancyType = updated[index].condition === 'DAMAGED' ? 'DAMAGED' : 'SHORTAGE';
    }
    setLineReceipts(updated);
  };

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || isSubmitting) return;

    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    try {
      const payloadLines = lineReceipts.map((l) => ({
        ...l,
        evidence:
          evidencePhotos.length > 0 && (l.condition === 'DAMAGED' || (l.discrepancyType && l.discrepancyType !== 'NONE'))
            ? evidencePhotos
            : l.evidence || [],
      }));

      let updated: Dispatch;
      try {
        updated = await api.recordPublicReceipt(shareToken, {
          lines: payloadLines,
          signoff: {
            signerName: signerName.trim() || 'Verified Receiver',
            signerRole: signerRole.trim() || 'Dock Lead',
            comments: comments.trim(),
            signatureSvgOrBase64: signatureDataUrl || undefined,
          },
        });
      } catch (pubErr) {
        // Fallback for authenticated receiver
        updated = await api.recordReceipt(dispatch.id, {
          lines: payloadLines,
          signoff: {
            signerName: signerName.trim() || 'Verified Receiver',
            signerRole: signerRole.trim() || 'Dock Lead',
            comments: comments.trim(),
            signatureSvgOrBase64: signatureDataUrl || undefined,
          },
        });
      }

      setDispatch(updated);
      setIsVerifying(false);
      setSubmitSuccess('Official delivery receipt verified! Shipper has been notified, signature locked, and audit entry recorded.');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit receipt confirmation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Retrieving secure delivery manifest..." />;

  if (error || !dispatch) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Invalid or Expired Link</h2>
        <p className="text-xs text-slate-400">{error || 'This delivery link could not be verified.'}</p>
        {onExit && (
          <button
            onClick={onExit}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Return to App
          </button>
        )}
      </div>
    );
  }

  const isAlreadyReceived = ['PARTIALLY_RECEIVED', 'RECEIVED', 'RECONCILED'].includes(dispatch.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">DispatchBridge Partner Portal</div>
            <div className="text-[10px] text-slate-400">Authenticated Delivery Slip</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Slip</span>
          </button>
          {onExit && (
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Slip Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">
              Supplier Delivery Manifest
            </div>
            <h1 className="text-2xl font-bold font-mono text-white mt-0.5">{dispatch.dispatchNumber}</h1>
            <p className="text-xs text-slate-400">Issued by {dispatch.senderBusinessName}</p>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1">
            <StatusBadge status={dispatch.status} />
            <span className="text-[11px] text-slate-400 font-mono">
              Dispatched: {new Date(dispatch.dispatchedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Shipper & Receiver details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Delivering Shipper:</span>
            <div className="font-bold text-white text-sm">{dispatch.senderBusinessName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">Origin: {dispatch.originLocationSnapshot.label}</div>
            <div className="text-slate-400 text-[11px]">
              Driver: {dispatch.driverName || 'Standard Freight'} ({dispatch.vehicleReg || 'TRK'})
            </div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-semibold block mb-1">Receiving Destination:</span>
            <div className="font-bold text-white text-sm">{dispatch.destinationSnapshot.partnerName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5 flex items-start gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>{dispatch.destinationSnapshot.address}</span>
            </div>
          </div>
        </div>

        {/* Live Tracking Confirmation */}
        <div className="bg-indigo-950/40 border border-indigo-900/60 p-3 rounded-xl flex items-center gap-2.5 text-xs text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <div>
            <span className="font-semibold text-white">Receipt Acknowledged:</span> Opening this delivery manifest confirmed receipt viewing on the shipper's dispatch audit board.
          </div>
        </div>
      </div>

      {submitSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Manifest Lines List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-400" />
            Cargo Checklist ({dispatch.lines.length} items)
          </h2>
          <span className="text-xs font-mono font-semibold text-slate-300">
            Total Dispatched: {dispatch.totalQuantityDispatched} units
          </span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {dispatch.lines.map((line) => (
            <div key={line.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-mono text-[11px] text-indigo-300 font-semibold mr-2">{line.sku}</span>
                <span className="font-semibold text-slate-200">{line.itemName}</span>
                {line.notes && <p className="text-[11px] text-rose-300 mt-0.5">Note: {line.notes}</p>}
              </div>

              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <span className="text-[11px] text-slate-500 block">Sent</span>
                  <span className="font-mono font-bold text-slate-200">
                    {line.quantitySent} {line.unit}
                  </span>
                </div>

                {line.quantityReceived !== undefined && (
                  <div>
                    <span className="text-[11px] text-slate-500 block">Received</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {line.quantityReceived} {line.unit}
                    </span>
                  </div>
                )}

                {line.lossQty && line.lossQty > 0 ? (
                  <div>
                    <span className="text-[11px] text-rose-400 block font-semibold">Short</span>
                    <span className="font-mono font-bold text-rose-400">
                      -{line.lossQty} {line.unit}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Certificate if received */}
      {isAlreadyReceived && dispatch.receiverSignoff && (
        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-5 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Delivery Acknowledged & Signed</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Dock Record Locked</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
            <div>
              <span className="text-slate-500 block text-[11px]">Signer Name & Role:</span>
              <strong className="text-white">{dispatch.receiverSignoff.signerName}</strong>
              <div className="text-[11px] text-slate-400">{dispatch.receiverSignoff.signerRole}</div>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Signed At:</span>
              <span className="text-slate-200">{new Date(dispatch.receiverSignoff.signedAt).toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Comments:</span>
              <span className="text-slate-300 italic">{dispatch.receiverSignoff.comments || 'No remarks recorded.'}</span>
            </div>
          </div>

          {dispatch.receiverSignoff.signatureSvgOrBase64 && (
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Verified Digital Glass Signature
                </span>
                <div className="mt-1 bg-slate-950 p-2 rounded-xl border border-slate-800 inline-block">
                  <img
                    src={dispatch.receiverSignoff.signatureSvgOrBase64}
                    alt="Receiver Signature"
                    className="h-14 w-auto max-w-xs object-contain"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-400">
                Enforceable cryptographic proof-of-delivery captured on receiving glass terminal.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recorded Discrepancies if received with claims */}
      {isAlreadyReceived && dispatch.discrepancyCases && dispatch.discrepancyCases.length > 0 && (
        <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 text-xs space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Recorded Discrepancy & Claims ({dispatch.discrepancyCases.length})</span>
          </div>
          <div className="space-y-2">
            {dispatch.discrepancyCases.map((c) => (
              <div key={c.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{c.itemName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    {c.type} (-{c.shortfallQuantity})
                  </span>
                </div>
                {c.notes && <p className="text-[11px] text-slate-400">Note: {c.notes}</p>}
                {c.evidence && c.evidence.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {c.evidence.map((ev) => (
                      <div key={ev.id} className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
                        <img src={ev.dataUrl} alt={ev.fileName} className="h-16 w-full object-cover" />
                        <div className="p-1 text-[9px] text-slate-400 truncate">
                          <span className="text-slate-200 block truncate">{ev.fileName}</span>
                          <span className="font-mono text-[8px] text-emerald-400">SHA: {ev.sha256Hash?.substring(0, 8)}...</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Verification Form on Dock */}
      {!isAlreadyReceived && !isVerifying && (
        <div className="bg-slate-900 border border-amber-900/60 rounded-2xl p-6 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">Unload & Confirm Delivery on Dock</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Receiving supervisor: Count items offloaded from the carrier truck. Verify physical items match this manifest.
          </p>
          <button
            onClick={() => setIsVerifying(true)}
            className="px-6 py-3 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30 cursor-pointer"
          >
            Start Dock Count & Sign Off
          </button>
        </div>
      )}

      {isVerifying && (
        <div className="bg-slate-900 border border-amber-700/80 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Confirm Dock Count & Sign Off</h3>
            <button onClick={() => setIsVerifying(false)} className="text-xs text-slate-400 hover:text-white cursor-pointer min-h-[44px] px-2 flex items-center">
              Cancel
            </button>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitReceipt} className="space-y-4">
            <div className="space-y-3">
              {dispatch.lines.map((line, idx) => (
                <div key={line.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 text-xs space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-white">{line.itemName}</span>
                    <span className="text-slate-400 font-mono">Dispatched: {line.quantitySent} {line.unit}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Received ({line.unit})</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={lineReceipts[idx]?.quantityReceived || 0}
                        onChange={(e) => handleLineCountChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Condition</label>
                      <select
                        value={lineReceipts[idx]?.condition || 'GOOD'}
                        onChange={(e) => {
                          const updated = [...lineReceipts];
                          updated[idx].condition = e.target.value as ItemCondition;
                          setLineReceipts(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="GOOD">Good / Intact</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="LOST">Lost / Missing</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Discrepancy Category</label>
                      <select
                        value={lineReceipts[idx]?.discrepancyType || 'NONE'}
                        onChange={(e) => {
                          const updated = [...lineReceipts];
                          updated[idx].discrepancyType = e.target.value as DiscrepancyType;
                          setLineReceipts(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="NONE">None (Full Count)</option>
                        <option value="SHORTAGE">Shortage</option>
                        <option value="DAMAGED">Damaged in Transit</option>
                        <option value="OVERAGE">Overage (Excess)</option>
                        <option value="NOT_RECEIVED">Not Received</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Inspection Note</label>
                      <input
                        type="text"
                        value={lineReceipts[idx]?.notes || ''}
                        onChange={(e) => {
                          const updated = [...lineReceipts];
                          updated[idx].notes = e.target.value;
                          setLineReceipts(updated);
                        }}
                        placeholder="e.g. 2 boxes crushed"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Evidence photos if any discrepancy is indicated */}
            {lineReceipts.some((l) => l.condition === 'DAMAGED' || (l.discrepancyType && l.discrepancyType !== 'NONE')) && (
              <div className="pt-2">
                <DamagePhotoUpload
                  evidence={evidencePhotos}
                  onChange={(ev) => setEvidencePhotos(ev)}
                  maxFiles={4}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Signer Full Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. David Miller"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Role *</label>
                <input
                  type="text"
                  required
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="e.g. Receiving Dock Lead"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dock Comments & Seal Inspection</label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional comments regarding vehicle cleanliness, pallet condition..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Digital Dock Sign-off Canvas */}
            <div className="pt-2">
              <SignaturePad
                signerName={signerName || 'Receiving Dock Lead'}
                onSignatureChange={(sig) => setSignatureDataUrl(sig)}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsVerifying(false)}
                className="px-4 py-2.5 text-xs text-slate-400 hover:text-white cursor-pointer min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-800/60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-emerald-600/30 flex items-center justify-center"
              >
                {isSubmitting ? 'Submitting receipt...' : 'Submit Official Dock Sign-Off'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
