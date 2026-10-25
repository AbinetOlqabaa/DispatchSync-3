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
  Building2,
  ChevronDown,
  Check,
  Plus,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { Dispatch, Partner } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { StatusBadge } from '../../components/common/StatusBadge.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ExecutiveAnalyticsCharts } from '../../components/dashboards/ExecutiveAnalyticsCharts.js';
import { ProfileSummaryCard } from '../../components/common/ProfileSummaryCard.js';

interface BusinessOwnerDashboardProps {
  onSelectDispatch: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onCreateDispatch: () => void;
  onOpenProfile?: () => void;
}

export const BusinessOwnerDashboard: React.FC<BusinessOwnerDashboardProps> = ({
  onSelectDispatch,
  onNavigateTab,
  onCreateDispatch,
  onOpenProfile,
}) => {
  const { user, switchBusiness, createBusiness } = useAuth();
  const { t } = useTranslation();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Business context switcher state
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showCreateBizModal, setShowCreateBizModal] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [submittingBiz, setSubmittingBiz] = useState(false);
  const [bizModalError, setBizModalError] = useState<string | null>(null);
  const [bizForm, setBizForm] = useState({
    name: '',
    registrationNumber: '',
    countryCode: 'US',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

  useEffect(() => {
    loadData();
  }, [user?.businessId]);

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

  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizForm.name.trim() || !bizForm.contactEmail.trim() || !bizForm.contactPhone.trim() || !bizForm.address.trim()) {
      setBizModalError('Entity Name, Contact Email, Phone, and Address are required.');
      return;
    }
    setSubmittingBiz(true);
    setBizModalError(null);
    try {
      await createBusiness(bizForm);
      setShowCreateBizModal(false);
      setBizForm({
        name: '',
        registrationNumber: '',
        countryCode: 'US',
        contactEmail: '',
        contactPhone: '',
        address: '',
      });
      await loadData();
    } catch (err: any) {
      setBizModalError(err.message || 'Failed to register business entity.');
    } finally {
      setSubmittingBiz(false);
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
      {/* Profile Summary Card */}
      <ProfileSummaryCard onOpenProfile={onOpenProfile} />

      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
              {t('role.business_owner')}
            </span>
            <span className="text-xs text-slate-400">Company ID: {user?.businessId}</span>
          </div>

          <div className="flex items-center gap-2.5 mt-1">
            <button
              onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
              className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
              title="Switch Business Entity"
              aria-label="Switch Business Entity"
            >
              <Building2 className="w-5 h-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              <h1 className="text-2xl font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                {user?.businessName}
              </h1>
              <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform ${showBusinessDropdown ? 'rotate-180' : ''}`} />
            </button>

            {user?.memberships && user.memberships.length > 1 && (
              <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded-full">
                {user.memberships.length} Entities
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('app.enterprise')}
          </p>

          {/* Business Entity Switcher Popover */}
          {showBusinessDropdown && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowBusinessDropdown(false)} />
              <div className="absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-30">
                <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Switch Business Entity</span>
                  {isSwitching && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
                </div>
                <div className="py-1 max-h-56 overflow-y-auto divide-y divide-slate-800/40 scrollbar-thin">
                  {user?.memberships?.map((m) => {
                    const isActive = m.businessId === user?.businessId;
                    return (
                      <button
                        key={m.id}
                        disabled={isSwitching}
                        onClick={async () => {
                          if (isActive) {
                            setShowBusinessDropdown(false);
                            return;
                          }
                          try {
                            setIsSwitching(true);
                            await switchBusiness(m.businessId);
                            setShowBusinessDropdown(false);
                          } catch (e: any) {
                            setError(e.message || 'Failed to switch entity.');
                          } finally {
                            setIsSwitching(false);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-indigo-950/60 text-indigo-200 border border-indigo-800/50'
                            : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold truncate">{m.businessName}</div>
                          <div className="text-[10px] text-slate-400">ID: {m.businessId} • {m.role}</div>
                        </div>
                        {isActive ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowBusinessDropdown(false);
                      setShowCreateBizModal(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-300 hover:text-white hover:bg-indigo-900/40 border border-indigo-900/60 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register New Business Entity</span>
                  </button>
                </div>
              </div>
            </>
          )}
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

        <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
          <table className="w-full text-left text-xs min-w-[760px] lg:min-w-full">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
              <tr>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Dispatch Number</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Partner Destination</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Items</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold whitespace-nowrap">Reconciliation Outcome</th>
                <th className="px-3 sm:px-3.5 py-3 font-semibold text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dispatches.slice(0, 5).map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-3 py-3 font-mono font-semibold text-indigo-300 whitespace-nowrap">{d.dispatchNumber}</td>
                  <td className="px-3 py-3 text-slate-200">
                    <div className="font-medium">{d.partnerName}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{d.destinationSnapshot.address}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                    {d.totalQuantityDispatched} {d.lines[0]?.unit || 'units'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
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
                  <td className="px-3 py-3 text-right whitespace-nowrap">
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

      {/* Register New Business Entity Modal */}
      {showCreateBizModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin">
            <button
              onClick={() => setShowCreateBizModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-indigo-950/70 border border-indigo-800/60 text-indigo-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Register New Business Entity</h3>
                <p className="text-xs text-slate-400">Add an operating entity under your multi-tenant account</p>
              </div>
            </div>

            {bizModalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{bizModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateBusinessSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Legal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Great Lakes Cold Freight Ltd."
                  value={bizForm.name}
                  onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Registration / Tax ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REG-88421-US"
                    value={bizForm.registrationNumber}
                    onChange={(e) => setBizForm({ ...bizForm, registrationNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Country Code
                  </label>
                  <input
                    type="text"
                    value={bizForm.countryCode}
                    onChange={(e) => setBizForm({ ...bizForm, countryCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ops@company.com"
                    value={bizForm.contactEmail}
                    onChange={(e) => setBizForm({ ...bizForm, contactEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dispatch Phone <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+1-555-019-0000"
                    value={bizForm.contactPhone}
                    onChange={(e) => setBizForm({ ...bizForm, contactPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operating Headquarters Address <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. 500 Industrial Parkway, Dock 1, Milwaukee, WI 53202"
                  value={bizForm.address}
                  onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateBizModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBiz}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submittingBiz ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Register & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
