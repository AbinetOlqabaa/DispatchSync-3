import React, { useEffect, useState } from 'react';
import {
  Truck,
  PlusCircle,
  Search,
  Filter,
  Eye,
  CheckCircle,
  Copy,
  ExternalLink,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch, DispatchStatus, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { DispatchSummaryCards } from '../../components/dispatches/DispatchSummaryCards.js';
import { BulkUploadModal } from '../../components/dispatches/BulkUploadModal.js';
import { exportDispatchesToCsv, exportDispatchesToPdf } from '../../utils/dispatchListExport.js';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface DispatchListPageProps {
  onSelectDispatch: (id: string) => void;
  onCreateDispatch: () => void;
  onOpenPublicLink: (token: string) => void;
}

export const DispatchListPage: React.FC<DispatchListPageProps> = ({
  onSelectDispatch,
  onCreateDispatch,
  onOpenPublicLink,
}) => {
  const { user, quickLoginDemoRole } = useAuth();
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bulk Upload & Data Export state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadDispatches();
      loadPartners();
    } else {
      setDispatches([]);
      setPartners([]);
      setLoading(false);
    }
  }, [statusFilter, user]);

  const loadPartners = async () => {
    try {
      const pList = await api.getPartners();
      setPartners(pList);
    } catch {
      // ignore
    }
  };

  const loadDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const filter = statusFilter === 'ALL' ? undefined : statusFilter;
      const data = await api.getDispatches(filter);
      setDispatches(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to load shipments.');
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

  const handleExportCsv = () => {
    exportDispatchesToCsv(filteredDispatches);
    setExportDropdownOpen(false);
    setExportSuccessMsg(`Exported ${filteredDispatches.length} dispatches to CSV.`);
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const handleExportPdf = () => {
    exportDispatchesToPdf(filteredDispatches, statusFilter);
    setExportDropdownOpen(false);
    setExportSuccessMsg(`Generated official reconciliation report PDF (${filteredDispatches.length} records).`);
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const filteredDispatches = dispatches.filter((d) => {
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      d.dispatchNumber.toLowerCase().includes(query) ||
      d.partnerName.toLowerCase().includes(query) ||
      d.senderBusinessName.toLowerCase().includes(query) ||
      d.driverName?.toLowerCase().includes(query);
    return matchesQuery;
  });

  const canCreate = user && ['SENDER', 'BUSINESS_OWNER', 'SUPER_ADMIN'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-400 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800">
              {t('app.subtitle')}
            </span>
            <span className="text-xs text-slate-400">{filteredDispatches.length} {t('metric.manifests_active')}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t('nav.dispatches')}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('app.enterprise')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!user ? (
            <button
              onClick={() => quickLoginDemoRole('SENDER')}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('nav.signin')}</span>
            </button>
          ) : canCreate ? (
            <>
              {/* Bulk Upload CSV Button */}
              <button
                onClick={() => setIsBulkUploadOpen(true)}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
                title="Bulk upload dispatches via CSV format"
              >
                <Upload className="w-4 h-4 text-sky-400" />
                <span>Bulk Upload CSV</span>
              </button>

              {/* Create Dispatch Button */}
              <button
                onClick={onCreateDispatch}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('action.create_dispatch')}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Summary Cards with Recharts (Requirement 8) */}
      <DispatchSummaryCards dispatches={dispatches} />

      {/* Guest Explorer Banner if not authenticated */}
      {!user && (
        <div className="bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border border-indigo-800/40 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                {t('banner.public_exploration')}
              </span>
              <span className="text-xs text-slate-300 font-medium">{t('banner.viewing_sandbox')}</span>
            </div>
            <p className="text-xs text-slate-400">
              {t('banner.sandbox_mode')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => quickLoginDemoRole('BUSINESS_OWNER')}
              className="px-3 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-700/50 text-xs font-semibold cursor-pointer transition-colors"
            >
              {t('banner.demo_owner')}
            </button>
            <button
              onClick={() => quickLoginDemoRole('SENDER')}
              className="px-3 py-1.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-300 border border-blue-700/50 text-xs font-semibold cursor-pointer transition-colors"
            >
              {t('banner.demo_sender')}
            </button>
            <button
              onClick={() => quickLoginDemoRole('RECEIVER')}
              className="px-3 py-1.5 rounded-xl bg-amber-900/60 hover:bg-amber-800 text-amber-300 border border-amber-700/50 text-xs font-semibold cursor-pointer transition-colors"
            >
              {t('banner.demo_receiver')}
            </button>
          </div>
        </div>
      )}

      {/* Error Banner if API error occurs */}
      {error && (
        <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-3 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDispatches()}
            className="px-2.5 py-1 bg-red-900/50 hover:bg-red-800 rounded-lg text-[11px] font-semibold text-red-200 cursor-pointer"
          >
            {t('action.retry')}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: t('status.all') },
              { id: 'DISPATCHED', label: t('status.dispatched') },
              { id: 'VIEWED', label: t('status.viewed') },
              { id: 'PARTIALLY_RECEIVED', label: t('status.shortfall_damage') },
              { id: 'RECEIVED', label: t('status.received_complete') },
              { id: 'RECONCILED', label: t('status.reconciled') },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Export */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`${t('action.search')}...`}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Export Dropdown (Requirement 9) */}
            <div className="relative">
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-xl cursor-pointer transition-colors shadow-sm"
                title="Export filtered dispatches"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {exportDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-30 py-1 text-xs">
                  <button
                    onClick={handleExportCsv}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-700 text-left cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-medium">Export CSV</div>
                      <div className="text-[10px] text-slate-400">Excel / Spreadsheet</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-200 hover:bg-slate-700 text-left cursor-pointer border-t border-slate-700/60"
                  >
                    <FileText className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-medium">Export PDF</div>
                      <div className="text-[10px] text-slate-400">Reconciliation Report</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Success Banner */}
        {exportSuccessMsg && (
          <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-xl p-2.5 text-xs text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
        )}

        {/* Content Table / Cards */}
        {loading ? (
          <LoadingSpinner label="Fetching manifests..." />
        ) : filteredDispatches.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Truck className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No dispatches match this filter</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusFilter !== 'ALL'
                ? `No shipments found with status "${statusFilter}". Try selecting "${t('status.all')}".`
                : 'No delivery manifests registered yet. Click "Create Dispatch" to send your first shipment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">{t('table.dispatch_number')}</th>
                  <th className="pb-3 font-semibold">{t('table.sender_supplier')}</th>
                  <th className="pb-3 font-semibold">{t('table.destination_partner')}</th>
                  <th className="pb-3 font-semibold">{t('table.status')}</th>
                  <th className="pb-3 font-semibold">{t('table.view_tracking')}</th>
                  <th className="pb-3 font-semibold">{t('table.quantity_loss')}</th>
                  <th className="pb-3 font-semibold text-right">{t('table.share_link')}</th>
                  <th className="pb-3 font-semibold text-right">{t('table.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 font-mono font-semibold text-indigo-300">
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
                    <td className="py-3.5 text-slate-300">
                      <div className="font-medium text-slate-200">{d.senderBusinessName}</div>
                      <div className="text-[10px] text-slate-500">By {d.senderName}</div>
                    </td>
                    <td className="py-3.5 text-slate-200">
                      <div className="font-semibold">{d.partnerName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">{d.destinationSnapshot?.address || 'Partner Destination'}</div>
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={d.status} size="sm" />
                    </td>
                    <td className="py-3.5">
                      {d.firstViewedAt ? (
                        <div className="flex items-center gap-1.5 text-indigo-300">
                          <Eye className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <div>
                            <div className="text-[11px] font-medium">Viewed</div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(d.firstViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Unviewed</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <div className="font-mono text-slate-200">
                        {d.totalQuantityDispatched} units
                      </div>
                      {d.totalQuantityLost !== undefined && d.totalQuantityLost > 0 ? (
                        <span className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Loss: {d.totalQuantityLost} units
                        </span>
                      ) : d.totalQuantityReceived !== undefined ? (
                        <span className="text-[10px] text-emerald-400 font-medium">100% Intact</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleCopyLink(d.shareToken, d.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Copy delivery tracking link"
                        >
                          {copiedId === d.id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
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
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => onSelectDispatch(d.id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                      >
                        {t('action.inspect')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal (Requirement 3) */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          loadDispatches();
        }}
        partners={partners}
      />
    </div>
  );
};
