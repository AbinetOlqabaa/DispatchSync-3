import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Package,
  Truck,
  Users,
  ArrowRight,
  ShieldAlert,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ExecutiveAnalyticsCharts } from '../../components/dashboards/ExecutiveAnalyticsCharts.js';

interface BusinessOwnerDashboardProps {
  onSelectDispatch: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onCreateDispatch: () => void;
}

export const BusinessOwnerDashboard: React.FC<BusinessOwnerDashboardProps> = ({
  onSelectDispatch,
  onNavigateTab,
  onCreateDispatch,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dList, pList] = await Promise.all([api.getDispatches(), api.getPartners()]);
      setDispatches(dList);
      setPartners(pList);
    } catch (err: any) {
      setError(err.message || 'Failed to load business overview.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Compiling executive dispatch metrics..." />;
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-rose-400 mb-3">{error}</p>
        <button onClick={loadData} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm">
          {t('action.retry')}
        </button>
      </div>
    );
  }

  // Calculations
  const totalDispatches = dispatches.length;
  const activeDispatches = dispatches.filter((d) => ['DISPATCHED', 'VIEWED', 'IN_TRANSIT'].includes(d.status)).length;
  const totalItemsSent = dispatches.reduce((sum, d) => sum + d.totalQuantityDispatched, 0);
  const totalItemsReceived = dispatches.reduce((sum, d) => sum + (d.totalQuantityReceived || 0), 0);
  const totalItemsLost = dispatches.reduce((sum, d) => sum + (d.totalQuantityLost || 0), 0);
  const reconciliationRate = totalItemsSent > 0 ? (((totalItemsReceived) / totalItemsSent) * 100).toFixed(1) : '100.0';

  // Group losses by reason
  const lossReasonBreakdown: Record<string, number> = {};
  dispatches.forEach((d) => {
    d.lines.forEach((line) => {
      if (line.lossQty && line.lossQty > 0) {
        const reason = line.discrepancyType || 'OTHER';
        lossReasonBreakdown[reason] = (lossReasonBreakdown[reason] || 0) + line.lossQty;
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
              {t('role.business_owner')}
            </span>
            <span className="text-xs text-slate-400">Company ID: {user?.businessId}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{user?.businessName}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('app.enterprise')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onCreateDispatch}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>{t('action.create_dispatch')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('metric.in_transit')}</span>
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeDispatches}</div>
          <div className="text-[11px] text-slate-500 mt-1">Out of {totalDispatches} {t('metric.total_dispatches')}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('metric.units_dispatched')}</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalItemsSent.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all manifests</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('metric.recorded_losses')}</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{totalItemsLost.toLocaleString()}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">Requiring credit notes / audit</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">{t('metric.reconciliation_rate')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{reconciliationRate}%</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Fulfilled to receiving partner</div>
        </div>
      </div>

      {/* Visual Analytics & Summary Charts */}
      <ExecutiveAnalyticsCharts dispatches={dispatches} />

      {/* Middle Section: Loss Breakdown & Partner Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loss Analysis */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Loss Categorization
            </h2>
            <span className="text-xs text-slate-400">Total: {totalItemsLost} units</span>
          </div>

          {Object.keys(lossReasonBreakdown).length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs">
              No cargo losses or transit damages reported. Clean reconciliation record!
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(lossReasonBreakdown).map(([reason, count]) => {
                const percentage = totalItemsLost > 0 ? Math.round((count / totalItemsLost) * 100) : 0;
                return (
                  <div key={reason} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">{reason.replace(/_/g, ' ')}</span>
                      <span className="text-slate-400 font-mono">
                        {count} units ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-rose-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Partner Directory Summary */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Registered Receiving Partners ({partners.length})
            </h2>
            <button
              onClick={() => onNavigateTab('partners')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              Manage Partners <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {partners.slice(0, 4).map((p) => {
              const partnerDispatches = dispatches.filter((d) => d.partnerId === p.id);
              const partnerLosses = partnerDispatches.reduce((s, d) => s + (d.totalQuantityLost || 0), 0);
              return (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-slate-400 text-[11px]">{p.contactPerson} • {p.phone}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-slate-300">{partnerDispatches.length} dispatches</span>
                    {partnerLosses > 0 ? (
                      <span className="block text-[10px] text-rose-400 font-semibold">{partnerLosses} units lost</span>
                    ) : (
                      <span className="block text-[10px] text-emerald-400">100% Intact</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dispatches Awaiting Action / Recent Dispatches */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Recent Outbound Dispatches
          </h2>
          <button
            onClick={() => onNavigateTab('dispatches')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            View All Dispatches <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Dispatch Number</th>
                <th className="pb-3 font-semibold">Partner Destination</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Items</th>
                <th className="pb-3 font-semibold">Reconciliation Outcome</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dispatches.slice(0, 5).map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 font-mono font-semibold text-indigo-300">{d.dispatchNumber}</td>
                  <td className="py-3.5 text-slate-200">
                    <div>{d.partnerName}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{d.destinationSnapshot.address}</div>
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="py-3.5 text-slate-300">
                    {d.totalQuantityDispatched} {d.lines[0]?.unit || 'units'}
                  </td>
                  <td className="py-3.5">
                    {d.totalQuantityLost !== undefined ? (
                      d.totalQuantityLost > 0 ? (
                        <span className="text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Shortfall: {d.totalQuantityLost} units
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Reconciled (100%)
                        </span>
                      )
                    ) : (
                      <span className="text-slate-500">Pending Receipt</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      onClick={() => onSelectDispatch(d.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                    >
                      Details
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
