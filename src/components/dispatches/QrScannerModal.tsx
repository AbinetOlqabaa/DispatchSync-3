import React, { useState, useRef, useEffect } from 'react';
import {
  QrCode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  Truck,
  MapPin,
  FileText,
  ScanLine,
  RefreshCw,
  Package,
} from 'lucide-react';
import { Dispatch, DispatchStatus } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { useTranslation } from '../../context/LanguageContext.js';

interface QrScannerModalProps {
  dispatch: Dispatch;
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (updatedDispatch: Dispatch) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  dispatch,
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<DispatchStatus>('IN_TRANSIT');
  const [checkpointLocation, setCheckpointLocation] = useState(
    dispatch.originLocationSnapshot?.label
      ? `En route from ${dispatch.originLocationSnapshot.label}`
      : 'Highway Transit Checkpoint'
  );
  const [driverNotes, setDriverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Initialize camera when modal opens
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen) {
      setScanMessage({
        text: 'Scanner ready. Point camera at manifest barcode or choose a quick-scan package line below.',
        type: 'info',
      });

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((mediaStream) => {
            stream = mediaStream;
            if (videoRef.current) {
              videoRef.current.srcObject = mediaStream;
              videoRef.current.play().catch(() => {});
            }
            setCameraActive(true);
            setCameraError(null);
          })
          .catch((err) => {
            setCameraActive(false);
            setCameraError(
              'Live camera access unavailable or denied in this environment. Quick-scan and manual verification are fully active below.'
            );
          });
      } else {
        setCameraActive(false);
        setCameraError('Web camera API is not available on this device.');
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimulateScan = (code: string, itemName?: string) => {
    setManualCode(code);
    if (!scannedItems.includes(code)) {
      setScannedItems((prev) => [...prev, code]);
    }
    setScanMessage({
      text: `Scanned & verified: ${code} ${itemName ? `(${itemName})` : ''}`,
      type: 'success',
    });
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const trimmed = manualCode.trim().toUpperCase();
    if (!scannedItems.includes(trimmed)) {
      setScannedItems((prev) => [...prev, trimmed]);
    }
    setScanMessage({
      text: `Barcode verified: ${trimmed}`,
      type: 'success',
    });
  };

  const handleApplyTransitUpdate = async () => {
    setIsSubmitting(true);
    try {
      const activeBarcode = manualCode.trim() || dispatch.dispatchNumber;
      // Match scanned items to line IDs
      const matchedLineIds = dispatch.lines
        .filter((l) => scannedItems.includes(l.sku.toUpperCase()) || scannedItems.includes(dispatch.dispatchNumber))
        .map((l) => l.id);

      const updated = await api.recordTransitScan(dispatch.id, {
        barcode: activeBarcode,
        statusUpdate: selectedStatus,
        checkpointLocation: checkpointLocation.trim(),
        driverNotes: driverNotes.trim(),
        scannedLineIds: matchedLineIds,
        actorName: dispatch.driverName || 'Courier Driver',
      });

      setScanMessage({
        text: `Transit milestone recorded: ${selectedStatus.replace(/_/g, ' ')}. Audit logged!`,
        type: 'success',
      });

      setTimeout(() => {
        onScanSuccess(updated);
        onClose();
      }, 700);
    } catch (err: any) {
      setScanMessage({
        text: err.message || 'Failed to record transit scan.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-white my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Driver Package & QR Scanner</h2>
              <p className="text-xs text-slate-400">
                Scan and verify package barcodes during transit for <span className="font-mono text-sky-400">{dispatch.dispatchNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Message / Alert */}
        {scanMessage && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              scanMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : scanMessage.type === 'error'
                ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
            }`}
          >
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : scanMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <ScanLine className="w-4 h-4 shrink-0 text-indigo-400" />
            )}
            <span>{scanMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          {/* Viewfinder Column */}
          <div className="space-y-4">
            <div className="relative aspect-video sm:aspect-square bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  {/* Scanner Reticle Overlay */}
                  <div className="absolute inset-8 border-2 border-indigo-400/60 rounded-xl pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400"></div>
                    <div className="w-full h-0.5 bg-indigo-400/80 shadow-[0_0_8px_#818cf8] animate-pulse my-[45%]"></div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center space-y-2">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">Digital Scanner Emulation</p>
                  <p className="text-[11px] text-slate-500">
                    Use quick package presets or manual barcode input below.
                  </p>
                </div>
              )}
            </div>

            {/* Manual Scan Input */}
            <form onSubmit={handleManualScanSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter or scan SKU / Barcode..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-indigo-300 border border-slate-700 cursor-pointer transition-colors"
              >
                Scan
              </button>
            </form>
          </div>

          {/* Quick Line Item Verification Column */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                  Package Lines in Manifest ({dispatch.lines.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  {scannedItems.length} verified
                </span>
              </div>

              {/* Master Manifest Barcode Button */}
              <div
                onClick={() => handleSimulateScan(dispatch.dispatchNumber, 'Full Shipment Manifest')}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all mb-2 flex items-center justify-between ${
                  scannedItems.includes(dispatch.dispatchNumber)
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  <div>
                    <div className="font-mono font-bold text-white text-[11px]">{dispatch.dispatchNumber}</div>
                    <div className="text-[10px] text-slate-400">Master Waybill QR Code</div>
                  </div>
                </div>
                {scannedItems.includes(dispatch.dispatchNumber) ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> Scanned
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Quick Scan
                  </span>
                )}
              </div>

              {/* Line items quick scan list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {dispatch.lines.map((line) => {
                  const isScanned = scannedItems.includes(line.sku.toUpperCase());
                  return (
                    <div
                      key={line.id}
                      onClick={() => handleSimulateScan(line.sku.toUpperCase(), line.itemName)}
                      className={`p-2 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isScanned
                          ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-white">{line.sku}</span>
                          <span className="text-[10px] text-slate-400">({line.quantitySent} {line.unit})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{line.itemName}</div>
                      </div>

                      {isScanned ? (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                          Scan Line
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Transit Milestone & Status Select */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-400" />
                Transit Status Milestone
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_AT_DOCK'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status as DispatchStatus)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                      selectedStatus === status
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {status === 'IN_TRANSIT'
                      ? 'In Transit'
                      : status === 'OUT_FOR_DELIVERY'
                      ? 'Out for Delivery'
                      : 'Arrived at Dock'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-sky-400" /> Checkpoint Location / Waypoint
                </label>
                <input
                  type="text"
                  value={checkpointLocation}
                  onChange={(e) => setCheckpointLocation(e.target.value)}
                  placeholder="e.g., Chicago North Dock Bay 4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" /> Driver Transit Notes
                </label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="e.g., Cargo verified intact on trailer 4921."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 mt-5 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyTransitUpdate}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Record Scan & Update Status</span>
          </button>
        </div>
      </div>
    </div>
  );
};
