import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Truck,
  Building,
  Calendar,
  Hash
} from 'lucide-react';
import { Dispatch, DispatchStatus, UserRole } from '../../types';
import { AppView } from '../../services/authorization';

interface DispatchListProps {
  dispatches: Dispatch[];
  userRole: UserRole;
  onSelectDispatch: (dispatch: Dispatch) => void;
  onNavigate: (view: AppView) => void;
  isLoading?: boolean;
}

const STATUS_CONFIG: Record<
  DispatchStatus,
  { label: string; bg: string; text: string; border: string; icon: React.FC<{ className?: string }> }
> = {
  DRAFT: { label: 'Draft', bg: 'bg-slate-800/80', text: 'text-slate-300', border: 'border-slate-700', icon: Clock },
  DISPATCHED: { label: 'Dispatched', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', icon: Truck },
  VIEWED: { label: 'Viewed by Partner', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20', icon: Eye },
  DELIVERED: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle },
  ACCEPTED: { label: 'Accepted (Reconciled)', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', icon: CheckCircle },
  DISPUTED: { label: 'Disputed / Loss', bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', icon: AlertTriangle },
  RECONCILED: { label: 'Fully Reconciled', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', icon: CheckCircle }
};

export const DispatchList: React.FC<DispatchListProps> = ({
  dispatches,
  userRole,
  onSelectDispatch,
  onNavigate,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = dispatches.filter((d) => {
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      d.dispatchNumber.toLowerCase().includes(q) ||
      d.receiverPartnerName.toLowerCase().includes(q) ||
      d.originLocation.toLowerCase().includes(q) ||
      d.destinationLocation.toLowerCase().includes(q) ||
      d.items.some((it) => it.name.toLowerCase().includes(q) || it.skuOrBatch.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const canCreate = userRole === 'SUPER_ADMIN' || userRole === 'BUSINESS_OWNER' || userRole === 'SENDER';

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by DSP #, partner, origin, SKU..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="VIEWED">Viewed</option>
              <option value="DELIVERED">Delivered</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DISPUTED">Disputed / Loss</option>
            </select>
          </div>

          {canCreate && (
            <button
              onClick={() => onNavigate('CREATE_DISPATCH')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>New Dispatch</span>
            </button>
          )}
        </div>
      </div>

      {/* Dispatches List / Empty state */}
      {isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Loading verified dispatches...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No Dispatches Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'ALL'
              ? 'No dispatch records matched your search query or filter.'
              : 'No dispatches have been registered in this ledger yet.'}
          </p>
          {canCreate && (
            <button
              onClick={() => onNavigate('CREATE_DISPATCH')}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Dispatch</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((dispatch) => {
            const StatusIcon = STATUS_CONFIG[dispatch.status]?.icon || Clock;
            const statusStyle = STATUS_CONFIG[dispatch.status] || STATUS_CONFIG.DRAFT;

            return (
              <div
                key={dispatch.id}
                onClick={() => onSelectDispatch(dispatch)}
                className="group p-4 sm:p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800/90 hover:border-indigo-500/30 transition cursor-pointer shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white group-hover:text-indigo-400 transition">
                      {dispatch.dispatchNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      <span>{statusStyle.label}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(dispatch.createdAt).toLocaleDateString()}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                      hash:{dispatch.auditHash.substring(0, 10)}...
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Receiving Partner</span>
                    <div className="font-medium text-slate-200 flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dispatch.receiverPartnerName}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Route Path</span>
                    <div className="text-slate-300 truncate mt-0.5" title={`${dispatch.originLocation} → ${dispatch.destinationLocation}`}>
                      {dispatch.originLocation} → {dispatch.destinationLocation}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] text-slate-500 block">Manifest Total</span>
                    <div className="font-semibold text-slate-100 mt-0.5">
                      {dispatch.totalQuantity} units{' '}
                      <span className="text-emerald-400">(${dispatch.totalValue.toLocaleString()})</span>
                    </div>
                  </div>
                </div>

                {/* Discrepancy Alert Tag if disputed */}
                {dispatch.status === 'DISPUTED' && dispatch.reconciliation && (
                  <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        Loss detected: {dispatch.reconciliation.damagedQuantity} damaged,{' '}
                        {dispatch.reconciliation.missingQuantity} missing (${dispatch.reconciliation.discrepancyValue})
                      </span>
                    </div>
                    <span className="text-[10px] text-rose-400 underline font-medium">Review Audit</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
