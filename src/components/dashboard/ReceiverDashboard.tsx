import React from 'react';
import { PackageCheck, FileCheck, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Dispatch } from '../../types';
import { AppView } from '../../services/authorization';

interface ReceiverDashboardProps {
  dispatches: Dispatch[];
  onSelectDispatch: (dispatch: Dispatch) => void;
  onNavigate: (view: AppView) => void;
}

export const ReceiverDashboard: React.FC<ReceiverDashboardProps> = ({
  dispatches,
  onSelectDispatch,
  onNavigate
}) => {
  const pendingReceipt = dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'VIEWED');
  const completedReceipt = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'ACCEPTED' || d.status === 'DISPUTED');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/20 text-slate-100">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-2">
          <PackageCheck className="w-3.5 h-3.5" />
          <span>Receiver Inbound Hub</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Inbound Delivery Verification & Reconciliation</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xl">
          Acknowledge delivered cargo, verify physical items against manifest, record damages, and calculate loss claims.
        </p>
      </div>

      {/* Priority Action Card: Pending Shipments requiring receipt */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Pending Inbound Shipments Awaiting Receipt</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any shipment to inspect the manifest, log your physical count, and reconcile losses.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
            {pendingReceipt.length} pending
          </span>
        </div>

        {pendingReceipt.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p>All inbound shipments have been verified and reconciled!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingReceipt.map((d) => (
              <div
                key={d.id}
                onClick={() => onSelectDispatch(d)}
                className="p-4 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">{d.dispatchNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/10 text-sky-400 font-medium border border-sky-500/20">
                      {d.status === 'VIEWED' ? 'Viewed by Partner' : 'En Route'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    From: <span className="text-slate-200">{d.senderName}</span> ({d.businessName}) • {d.totalQuantity} items (${d.totalValue.toLocaleString()})
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition self-start sm:self-center"
                >
                  <span>Record Receipt</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reconciled Shipments */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-base font-semibold text-white mb-3">Reconciled Delivery History</h2>
        <div className="space-y-3">
          {completedReceipt.map((d) => (
            <div
              key={d.id}
              onClick={() => onSelectDispatch(d)}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{d.dispatchNumber}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      d.status === 'DISPUTED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  Received by: {d.reconciliation?.recordedBy || 'Receiving Agent'} • Accepted: {d.reconciliation?.acceptedQuantity || d.totalQuantity} units
                </div>
              </div>
              <div className="text-slate-400 text-[11px]">View Sealed Receipt →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
