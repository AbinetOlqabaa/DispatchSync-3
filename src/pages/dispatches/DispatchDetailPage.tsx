import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Truck,
  Building,
  MapPin,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  Package,
  Warehouse,
  MessageSquare,
  ShieldCheck,
  QrCode,
  Download,
  Camera,
  PenTool,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { CargoEvidence, DiscrepancyCase, DiscrepancyType, Dispatch, ItemCondition } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { exportDispatchManifestPdf } from '../../utils/pdfExport.js';
import { QrScannerModal } from '../../components/dispatches/QrScannerModal.js';
import { SignaturePad } from '../../components/dispatches/SignaturePad.js';
import { DamagePhotoUpload } from '../../components/dispatches/DamagePhotoUpload.js';
import { DispatchTrackingMap } from '../../components/dispatches/DispatchTrackingMap.js';

interface DispatchDetailPageProps {
  dispatchId: string;
  onBack: () => void;
  onOpenPublicLink: (token: string) => void;
}

export const DispatchDetailPage: React.FC<DispatchDetailPageProps> = ({
  dispatchId,
  onBack,
  onOpenPublicLink,
}) => {
  const { user, quickLoginDemoRole } = useAuth();
  const { t } = useTranslation();
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reconciliation form state
  const [isReconciling, setIsReconciling] = useState(false);
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
  const [signerRole, setSignerRole] = useState('Receiving Supervisor');
  const [signoffComments, setSignoffComments] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [lineEvidence, setLineEvidence] = useState<Record<number, CargoEvidence[]>>({});

  // Discrepancy response state
  const [respondingCaseId, setRespondingCaseId] = useState<string | null>(null);
  const [discrepancyResponseStatus, setDiscrepancyResponseStatus] = useState<'ACKNOWLEDGED_BY_SENDER' | 'DISPUTED'>('ACKNOWLEDGED_BY_SENDER');
  const [discrepancyResponseNotes, setDiscrepancyResponseNotes] = useState('');

  // Discrepancy resolution state
  const [resolvingCaseId, setResolvingCaseId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');

  // UI submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // QR Scanner & PDF Export state
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = () => {
    if (!dispatch) return;
    setIsExportingPdf(true);
    try {
      exportDispatchManifestPdf(dispatch);
      setActionSuccess('Dispatch manifest PDF exported successfully for offline record-keeping.');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(`PDF generation error: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleScanSuccess = (updated: Dispatch) => {
    setDispatch(updated);
    setActionSuccess(`Transit status updated to ${updated.status.replace(/_/g, ' ')} via driver QR verification.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  useEffect(() => {
    loadDetail();
  }, [dispatchId]);

  const loadDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDispatch(dispatchId);
      setDispatch(data);
      // Initialize reconciliation state
      setLineReceipts(
        data.lines.map((line) => ({
          id: line.id,
          quantityReceived: line.quantityReceived !== undefined ? line.quantityReceived : line.quantitySent,
          condition: line.condition || 'GOOD',
          discrepancyType: line.discrepancyType || 'NONE',
          notes: line.notes || '',
        }))
      );
      if (user) {
        setSignerName(user.name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatch details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!dispatch) return;
    const url = `${window.location.origin}/?token=${dispatch.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLineReceiptChange = (
    index: number,
    field: 'quantityReceived' | 'condition' | 'discrepancyType' | 'notes',
    val: any
  ) => {
    const updated = [...lineReceipts];
    const originalLine = dispatch?.lines[index];
    if (!originalLine) return;

    if (field === 'quantityReceived') {
      const recv = Math.max(0, parseFloat(val) || 0);
      const loss = Math.max(0, originalLine.quantitySent - recv);
      updated[index].quantityReceived = recv;
      if (loss === 0) {
        updated[index].discrepancyType = 'NONE';
      } else if (updated[index].discrepancyType === 'NONE') {
        updated[index].discrepancyType = updated[index].condition === 'DAMAGED' ? 'DAMAGED' : 'SHORTAGE';
      }
    } else {
      updated[index][field] = val;
    }
    setLineReceipts(updated);
  };

  const handleSubmitReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || isSubmitting) return;

    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    try {
      const payloadLines = lineReceipts.map((l, idx) => ({
        ...l,
        evidence: lineEvidence[idx] || l.evidence || [],
      }));

      const updated = await api.recordReceipt(dispatch.id, {
        lines: payloadLines,
        signoff: {
          signerName: signerName.trim() || 'Verified Receiver',
          signerRole: signerRole.trim() || 'Receiving Staff',
          comments: signoffComments.trim(),
          signatureSvgOrBase64: signatureDataUrl || undefined,
        },
      });
      setDispatch(updated);
      setIsReconciling(false);
      setActionSuccess('Delivery receipt verified and reconciliation recorded with digital signature & evidence.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to record reconciliation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || !respondingCaseId || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await api.respondToDiscrepancy(dispatch.id, respondingCaseId, {
        status: discrepancyResponseStatus,
        responseNotes: discrepancyResponseNotes,
      });
      setDispatch(updated);
      setRespondingCaseId(null);
      setDiscrepancyResponseNotes('');
      setActionSuccess('Response to discrepancy case recorded successfully.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to submit response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveDiscrepancy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatch || !resolvingCaseId || isSubmitting) return;

    setIsSubmitting(true);
    setActionError(null);
    try {
      const updated = await api.resolveDiscrepancy(dispatch.id, resolvingCaseId, {
        resolution: resolutionText,
      });
      setDispatch(updated);
      setResolvingCaseId(null);
      setResolutionText('');
      setActionSuccess('Discrepancy case resolved and finalized.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve discrepancy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading dispatch manifest & audit trail..." />;
  if (error || !dispatch) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
        <p className="text-rose-400 mb-4">{error || 'Dispatch not found.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          Return to Dispatch List
        </button>
      </div>
    );
  }

  const canReconcile =
    user &&
    ['RECEIVER', 'BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role) &&
    ['DISPATCHED', 'VIEWED', 'IN_TRANSIT'].includes(dispatch.status);

  const canRespondDiscrepancy =
    user && ['SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role);

  const canResolveDiscrepancy =
    user && ['BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role);

  const shareUrl = `${window.location.origin}/?token=${dispatch.shareToken}`;

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('nav.dispatches')}</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Driver QR Scanner Button */}
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Scan QR barcode to verify transit checkpoints"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR / Transit</span>
          </button>

          {/* Export PDF Manifest Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            title="Export official manifest to PDF for offline records"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingPdf ? 'Exporting...' : 'Export PDF Manifest'}</span>
          </button>

          <button
            onClick={() => onOpenPublicLink(dispatch.shareToken)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 text-xs font-semibold cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{t('table.view_tracking')}</span>
          </button>
        </div>
      </div>

      {/* Guest Mode Notice */}
      {!user && (
        <div className="bg-indigo-950/60 border border-indigo-800/40 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-slate-300">
              Viewing shipment manifest in read-only guest mode. To reconcile quantities or acknowledge discrepancies, switch to a role:
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => quickLoginDemoRole('RECEIVER')}
              className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-300 border border-amber-700/50 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Sign In as Receiver
            </button>
            <button
              onClick={() => quickLoginDemoRole('BUSINESS_OWNER')}
              className="px-2.5 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
            >
              Sign In as Owner
            </button>
          </div>
        </div>
      )}

      {/* Manifest Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="font-mono text-xl font-bold text-white">{dispatch.dispatchNumber}</span>
              <StatusBadge status={dispatch.status} />
            </div>
            <p className="text-xs text-slate-400">
              Dispatched on {new Date(dispatch.dispatchedAt).toLocaleString()} by {dispatch.senderName} ({dispatch.senderBusinessName})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium text-slate-400">Total Cargo Quantity</div>
              <div className="text-lg font-bold text-white font-mono">{dispatch.totalQuantityDispatched} units</div>
            </div>
          </div>
        </div>

        {/* Origin & Destination Snapshots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5 font-semibold">
              <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
              <span>Origin Loading Terminal</span>
            </div>
            <div className="font-semibold text-white text-sm">{dispatch.originLocationSnapshot.label}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">{dispatch.originLocationSnapshot.address}</div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5 font-semibold">
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Receiving Partner Destination</span>
            </div>
            <div className="font-semibold text-white text-sm">{dispatch.destinationSnapshot.partnerName}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">{dispatch.destinationSnapshot.address}</div>
            <div className="text-slate-500 text-[10px] mt-0.5">
              Contact: {dispatch.destinationSnapshot.contactPerson} • {dispatch.destinationSnapshot.phone}
            </div>
          </div>

          <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-800 sm:col-span-2 lg:col-span-1">
            <div className="text-slate-400 mb-1 flex items-center gap-1.5 font-semibold">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Carrier & Driver</span>
            </div>
            <div className="font-semibold text-white text-sm">{dispatch.driverName || 'Standard Freight'}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              {dispatch.vehicleReg ? `Plate: ${dispatch.vehicleReg}` : ''} {dispatch.driverPhone ? `• ${dispatch.driverPhone}` : ''}
            </div>
          </div>
        </div>

        {/* View Receipt Verification Box */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-white">Recipient View Receipt Audit</span>
            </div>
            {dispatch.firstViewedAt ? (
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Verified Partner View Recorded
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Unviewed by Recipient</span>
            )}
          </div>

          {dispatch.firstViewedAt ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
              <div>
                <span className="text-slate-500">First Opened:</span>{' '}
                <span className="font-mono text-white">{new Date(dispatch.firstViewedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">Total Views:</span>{' '}
                <span className="font-mono text-white">{dispatch.viewReceipt?.viewCount || 1} times</span>
              </div>
              <div>
                <span className="text-slate-500">Viewer:</span>{' '}
                <span className="text-indigo-300 font-medium">{dispatch.viewReceipt?.viewerName || dispatch.partnerName}</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              The recipient has not accessed or opened this delivery list. A view timestamp will be recorded the moment an authenticated partner opens this manifest.
            </p>
          )}

          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400 truncate select-all font-mono">{shareUrl}</span>
            <button
              onClick={handleCopyLink}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {dispatch.notes && (
          <div className="text-xs bg-slate-800/30 p-3 rounded-xl text-slate-300 border border-slate-800">
            <span className="font-semibold text-slate-400 block mb-0.5">Instructions & Notes:</span>
            <p className="whitespace-pre-line">{dispatch.notes}</p>
          </div>
        )}
      </div>

      {/* Live Map & Geo-Coordinates Tracking Component */}
      <DispatchTrackingMap
        dispatch={dispatch}
        onTelemetryUpdate={(updated) => setDispatch(updated)}
      />

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Discrepancy Cases (if any exist) */}
      {dispatch.discrepancyCases && dispatch.discrepancyCases.length > 0 && (
        <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Active Discrepancy Cases ({dispatch.discrepancyCases.length})
            </h2>
          </div>

          <div className="space-y-3">
            {dispatch.discrepancyCases.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm mr-2">{c.itemName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                      {c.type}
                    </span>
                  </div>
                  <span className="font-semibold text-xs text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                    Status: {c.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                  <div>
                    <span className="text-slate-500">Sent Qty:</span> {c.expectedQuantity}
                  </div>
                  <div>
                    <span className="text-slate-500">Received Qty:</span> {c.reportedQuantity}
                  </div>
                  <div>
                    <span className="text-slate-500">Shortfall / Loss:</span>{' '}
                    <span className="text-rose-400 font-bold">{c.shortfallQuantity}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Flagged By:</span> {c.openedByName}
                  </div>
                </div>

                {c.notes && (
                  <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded">
                    <strong>Receiver Note:</strong> {c.notes}
                  </div>
                )}

                {c.senderResponseNotes && (
                  <div className="text-[11px] text-blue-300 bg-blue-950/40 border border-blue-900/40 p-2 rounded">
                    <strong>Sender Response:</strong> {c.senderResponseNotes}
                  </div>
                )}

                {c.resolution && (
                  <div className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/40 p-2 rounded">
                    <strong>Final Resolution:</strong> {c.resolution} (by {c.resolvedByName})
                  </div>
                )}

                {/* Evidence Attachments */}
                {c.evidence && c.evidence.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tamper-Evident Cargo Evidence ({c.evidence.length} photos)</span>
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {c.evidence.map((ev) => (
                        <div key={ev.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                          <img src={ev.dataUrl} alt={ev.fileName} className="h-20 w-full object-cover" />
                          <div className="p-1 text-[9px] text-slate-400 truncate">
                            <span className="text-slate-200 font-semibold">{ev.fileName}</span>
                            <div className="font-mono text-[8px] text-emerald-400">SHA: {ev.sha256Hash?.substring(0, 10)}...</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sender response action */}
                {canRespondDiscrepancy && c.status === 'OPEN' && respondingCaseId !== c.id && (
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => setRespondingCaseId(c.id)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Respond to Discrepancy
                    </button>
                  </div>
                )}

                {respondingCaseId === c.id && (
                  <form onSubmit={handleRespondToDiscrepancy} className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-2 mt-2">
                    <div className="font-semibold text-white">Submit Sender Response</div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="respStatus"
                          value="ACKNOWLEDGED_BY_SENDER"
                          checked={discrepancyResponseStatus === 'ACKNOWLEDGED_BY_SENDER'}
                          onChange={() => setDiscrepancyResponseStatus('ACKNOWLEDGED_BY_SENDER')}
                        />
                        <span>Acknowledge Shortage / Damage</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="radio"
                          name="respStatus"
                          value="DISPUTED"
                          checked={discrepancyResponseStatus === 'DISPUTED'}
                          onChange={() => setDiscrepancyResponseStatus('DISPUTED')}
                        />
                        <span>Dispute Discrepancy</span>
                      </label>
                    </div>
                    <textarea
                      required
                      rows={2}
                      value={discrepancyResponseNotes}
                      onChange={(e) => setDiscrepancyResponseNotes(e.target.value)}
                      placeholder="Explain packaging check, carrier inquiry, or shortage reason..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRespondingCaseId(null)}
                        className="px-3 py-1 text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
                      >
                        Submit Response
                      </button>
                    </div>
                  </form>
                )}

                {/* Owner/SuperAdmin Resolution action */}
                {canResolveDiscrepancy && c.status !== 'RESOLVED' && resolvingCaseId !== c.id && (
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => setResolvingCaseId(c.id)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Issue Formal Resolution & Close Case
                    </button>
                  </div>
                )}

                {resolvingCaseId === c.id && (
                  <form onSubmit={handleResolveDiscrepancy} className="p-3 bg-slate-900 rounded-xl border border-purple-800 space-y-2 mt-2">
                    <div className="font-semibold text-white">Record Final Business Resolution</div>
                    <textarea
                      required
                      rows={2}
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      placeholder="e.g. Credit Note #CN-9921 issued for 4 damaged units. Freight claim filed."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setResolvingCaseId(null)}
                        className="px-3 py-1 text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
                      >
                        Resolve & Close Case
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Manifest Lines Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Itemized Manifest Lines ({dispatch.lines.length})
          </h2>
          {canReconcile && !isReconciling && (
            <button
              onClick={() => {
                setIsReconciling(true);
                setTimeout(() => {
                  document.getElementById('reconciliation-form-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-amber-600/20"
            >
              Record Dock Receipt & Reconciliation
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[780px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
              <tr>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">SKU</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Item Description</th>
                <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Dispatched</th>
                <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Received</th>
                <th className="px-3.5 py-3 font-semibold text-right whitespace-nowrap">Shortfall</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Condition</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Discrepancy Category</th>
                <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {dispatch.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-800/30">
                  <td className="px-3.5 py-3 text-slate-400 whitespace-nowrap">{line.sku}</td>
                  <td className="px-3.5 py-3 font-sans font-medium text-slate-200">{line.itemName}</td>
                  <td className="px-3.5 py-3 text-right text-slate-200 font-bold whitespace-nowrap">
                    {line.quantitySent} {line.unit}
                  </td>
                  <td className="px-3.5 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                    {line.quantityReceived !== undefined ? `${line.quantityReceived} ${line.unit}` : '—'}
                  </td>
                  <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap">
                    {line.lossQty && line.lossQty > 0 ? (
                      <span className="text-rose-400">-{line.lossQty} {line.unit}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-sans whitespace-nowrap">
                    {line.condition ? (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        line.condition === 'DAMAGED'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {line.condition}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-sans whitespace-nowrap">
                    {line.discrepancyType && line.discrepancyType !== 'NONE' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800">
                        {line.discrepancyType}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 font-sans text-slate-400 text-[11px]">{line.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receiver Sign-Off Certificate Card */}
      {dispatch.receiverSignoff && (
        <div className="bg-slate-900 border border-emerald-900/60 rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Verified Delivery Sign-Off Certificate</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-500">Signed By:</span>
              <div className="font-semibold text-slate-200">{dispatch.receiverSignoff.signerName}</div>
              <div className="text-[11px] text-slate-400">{dispatch.receiverSignoff.signerRole}</div>
            </div>
            <div>
              <span className="text-slate-500">Verification Timestamp:</span>
              <div className="font-semibold text-slate-200">
                {new Date(dispatch.receiverSignoff.signedAt).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Receiver Comments:</span>
              <div className="text-slate-300">{dispatch.receiverSignoff.comments || 'No remarks provided.'}</div>
            </div>

            {dispatch.receiverSignoff.signatureSvgOrBase64 && (
              <div className="sm:col-span-3 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Verified Digital Signature
                  </span>
                  <div className="mt-1 bg-slate-950 p-2 rounded-xl border border-slate-800 inline-block">
                    <img
                      src={dispatch.receiverSignoff.signatureSvgOrBase64}
                      alt="Receiver Signature"
                      className="h-16 w-auto max-w-xs object-contain"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1.5 rounded-xl">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Legally Enforceable Glass Sign-Off Locked</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form: Record Dock Receipt (if opened by user) */}
      {isReconciling && canReconcile && (
        <div id="reconciliation-form-section" className="bg-slate-900 border border-amber-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Record Dock Receipt & Physical Count</h3>
            </div>
            <button
              onClick={() => setIsReconciling(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitReconciliation} className="space-y-4">
            <p className="text-xs text-slate-400">
              Input the physical count received per line on the dock. If damage or shortage occurred, categorize the discrepancy accordingly.
            </p>

            <div className="space-y-3">
              {dispatch.lines.map((line, idx) => (
                <div
                  key={line.id}
                  className="bg-slate-800/50 p-3.5 rounded-xl border border-slate-700/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-white">
                      {line.sku} - {line.itemName}
                    </span>
                    <span className="text-slate-400 font-mono">Dispatched: {line.quantitySent} {line.unit}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Received Count ({line.unit}) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={lineReceipts[idx]?.quantityReceived || 0}
                        onChange={(e) => handleLineReceiptChange(idx, 'quantityReceived', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Condition
                      </label>
                      <select
                        value={lineReceipts[idx]?.condition || 'GOOD'}
                        onChange={(e) => handleLineReceiptChange(idx, 'condition', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="GOOD">Good / Intact</option>
                        <option value="DAMAGED">Damaged</option>
                        <option value="LOST">Lost / Missing</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Discrepancy Category
                      </label>
                      <select
                        value={lineReceipts[idx]?.discrepancyType || 'NONE'}
                        onChange={(e) => handleLineReceiptChange(idx, 'discrepancyType', e.target.value)}
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
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Inspection Note
                      </label>
                      <input
                        type="text"
                        value={lineReceipts[idx]?.notes || ''}
                        onChange={(e) => handleLineReceiptChange(idx, 'notes', e.target.value)}
                        placeholder="e.g. Pallet seal broken"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Damage & Shortage Photo Evidence Attachment */}
                  <div className="pt-1">
                    <DamagePhotoUpload
                      evidence={lineEvidence[idx] || []}
                      onChange={(ev) => setLineEvidence({ ...lineEvidence, [idx]: ev })}
                      maxFiles={4}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Sign-off inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Receiver Signer Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your Full Name"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supervisor / Role Title *</label>
                <input
                  type="text"
                  required
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  placeholder="Receiving Dock Manager"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Dock Notes & Cargo Comments</label>
              <textarea
                rows={2}
                value={signoffComments}
                onChange={(e) => setSignoffComments(e.target.value)}
                placeholder="Optional carrier remarks, seals intact, driver signature notes..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              />
            </div>

            {/* Interactive Canvas Signature Pad */}
            <div className="pt-2">
              <SignaturePad
                onSignatureChange={setSignatureDataUrl}
                signerName={signerName}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsReconciling(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg shadow-amber-600/30"
              >
                {isSubmitting ? 'Recording receipt...' : 'Confirm Delivery & Submit Sign-Off'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Driver Package & QR Scanner Modal */}
      {dispatch && (
        <QrScannerModal
          dispatch={dispatch}
          isOpen={isQrScannerOpen}
          onClose={() => setIsQrScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
};
