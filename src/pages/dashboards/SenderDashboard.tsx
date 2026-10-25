import React, { useEffect, useState } from 'react';
import {
  Truck,
  PlusCircle,
  Eye,
  CheckCircle,
  Clock,
  Share2,
  Copy,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ProfileSummaryCard } from '../../components/common/ProfileSummaryCard.js';

interface SenderDashboardProps {
  onSelectDispatch: (id: string) => void;
  onCreateDispatch: () => void;
  onOpenPublicLink: (token: string) => void;
  onOpenProfile?: () => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({
  onSelectDispatch,
  onCreateDispatch,
  onOpenPublicLink,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadDispatches();
  }, []);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await api.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDispatches = dispatches.filter((d) => {
    const query = searchTerm.toLowerCase();
    return (
      d.dispatchNumber.toLowerCase().includes(query) ||
      d.partnerName.toLowerCase().includes(query) ||
      d.driverName?.toLowerCase().includes(query)
    );
  });

  if (loading) return <LoadingSpinner label="Loading active dispatches..." />;

  return (
    <div className="space-y-6">
      {/* Profile Summary Card */}
      <ProfileSummaryCard onOpenProfile={onOpenProfile} />

      {/* Sender Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-950 px-2.5 py-0.5 rounded-full border border-blue-800">
              {t('role.sender')}
            </span>
            <span className="text-xs text-slate-400">Dispatcher: {user?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('nav.dispatches')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('app.enterprise')}
          </p>
        </div>

        <button
          onClick={onCreateDispatch}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('action.create_dispatch')}</span>
        </button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Dispatched (Unviewed)</div>
          <div className="text-xl font-bold text-blue-400">
            {dispatches.filter((d) => d.status === 'DISPATCHED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting partner open</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Partner Viewed</div>
          <div className="text-xl font-bold text-indigo-400">
            {dispatches.filter((d) => d.status === 'VIEWED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">List opened by receiver</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Discrepancy Reported</div>
          <div className="text-xl font-bold text-rose-400">
            {dispatches.filter((d) => d.status === 'PARTIALLY_RECEIVED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Losses recorded</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Fully Reconciled</div>
          <div className="text-xl font-bold text-emerald-400">
            {dispatches.filter((d) => ['RECEIVED', 'RECONCILED'].includes(d.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Confirmed complete</div>
        </div>
      </div>

      {/* Search & Dispatch Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by DSP number, partner, driver..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredDispatches.length} of {dispatches.length} dispatches
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[760px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
              <tr>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Dispatch #</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Destination</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Partner View</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Driver & Cargo</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap">Share Link</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap pr-3.5">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDispatches.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3.5 py-3.5 font-mono font-semibold text-indigo-300 whitespace-nowrap">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="hover:underline text-left cursor-pointer"
                    >
                      {d.dispatchNumber}
                    </button>
                    <div className="text-[10px] text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5 text-slate-200">
                    <div className="font-semibold">{d.partnerName}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.destinationSnapshot.address}</div>
                  </td>
                  <td className="px-3.5 py-3.5 whitespace-nowrap">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="px-3.5 py-3.5 whitespace-nowrap">
                    {d.firstViewedAt ? (
                      <div className="flex items-center gap-1.5 text-indigo-300">
                        <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-medium text-[11px]">Viewed by Partner</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(d.firstViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px]">Unviewed</span>
                      </div>
                    )}
                  </td>
                  <td className="px-3.5 py-3.5 text-slate-300 whitespace-nowrap">
                    <div>{d.driverName ? `${d.driverName} (${d.vehicleReg || 'Truck'})` : 'Carrier Unassigned'}</div>
                    <div className="text-[11px] text-slate-500">
                      {d.lines.length} line items • {d.totalQuantityDispatched} units
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleCopyLink(d.shareToken, d.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Copy receiver access link"
                      >
                        {copiedId === d.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => onOpenPublicLink(d.shareToken)}
                        className="p-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 cursor-pointer"
                        title="Simulate partner viewing delivery list"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                    >
                      Inspect
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
