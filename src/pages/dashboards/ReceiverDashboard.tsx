import React, { useEffect, useState } from 'react';
import {
  PackageCheck,
  ClipboardCheck,
  AlertOctagon,
  CheckCircle2,
  Calendar,
  Building,
  UserCheck,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface ReceiverDashboardProps {
  onSelectDispatch: (id: string) => void;
}

export const ReceiverDashboard: React.FC<ReceiverDashboardProps> = ({ onSelectDispatch }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [inboundDispatches, setInboundDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInbound();
  }, []);

  const loadInbound = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setInboundDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading partner receiving portal..." />;

  const pendingVerification = inboundDispatches.filter((d) => ['DISPATCHED', 'VIEWED', 'IN_TRANSIT'].includes(d.status));
  const completedReceipts = inboundDispatches.filter((d) => ['PARTIALLY_RECEIVED', 'RECEIVED', 'RECONCILED'].includes(d.status));

  return (
    <div className="space-y-6">
      {/* Receiving Portal Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
            {t('role.receiver')}
          </span>
          <span className="text-xs text-slate-400">Station Lead: {user?.name}</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{user?.businessName}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {t('app.enterprise')}
        </p>
      </div>

      {/* Action Required: Inbound Deliveries to Reconcile */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-amber-400" />
            Deliveries Awaiting Verification ({pendingVerification.length})
          </h2>
          <span className="text-xs text-slate-400">Inspect physical goods on dock</span>
        </div>

        {pendingVerification.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">All Deliveries Verified</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no pending inbound deliveries requiring dock inspection at this time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingVerification.map((d) => (
              <div
                key={d.id}
                className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 hover:border-amber-700/60 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-indigo-300">{d.dispatchNumber}</span>
                  <StatusBadge status={d.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shipper / Supplier:</span>
                    <span className="font-semibold text-slate-200">{d.senderBusinessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Carrier / Driver:</span>
                    <span>{d.driverName || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Manifest Contents:</span>
                    <span>{d.lines.length} lines ({d.totalQuantityDispatched} units)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sent Date:</span>
                    <span>{d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleDateString() : 'Today'}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelectDispatch(d.id)}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Verify Items & Record Receipt</span>
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Receipts History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Completed Receipt Archive
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Dispatch Number</th>
                <th className="pb-3 font-semibold">Supplier</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Sent vs Received</th>
                <th className="pb-3 font-semibold">Signed By</th>
                <th className="pb-3 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {completedReceipts.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40">
                  <td className="py-3 font-mono font-semibold text-indigo-300">{d.dispatchNumber}</td>
                  <td className="py-3 text-slate-300">{d.senderBusinessName}</td>
                  <td className="py-3">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="py-3">
                    <div className="font-mono">
                      {d.totalQuantityReceived ?? 0} / {d.totalQuantityDispatched} units
                    </div>
                    {d.totalQuantityLost && d.totalQuantityLost > 0 ? (
                      <span className="text-[10px] text-rose-400 font-semibold">
                        Loss: {d.totalQuantityLost} units
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-medium">100% Intact</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300">
                    <div>{d.receiverSignoff?.signerName || 'Verified'}</div>
                    <div className="text-[10px] text-slate-500">
                      {d.receivedAt ? new Date(d.receivedAt).toLocaleDateString() : ''}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
                    >
                      View Slip
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
