import React from 'react';
import {
  Truck,
  Building,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import { Dispatch, UserRole } from '../../types';
import { AppView } from '../../services/authorization';

interface BusinessOwnerDashboardProps {
  dispatches: Dispatch[];
  onSelectDispatch: (dispatch: Dispatch) => void;
  onNavigate: (view: AppView) => void;
}

export const BusinessOwnerDashboard: React.FC<BusinessOwnerDashboardProps> = ({
  dispatches,
  onSelectDispatch,
  onNavigate
}) => {
  const activeDispatches = dispatches.filter(d => d.status === 'DISPATCHED' || d.status === 'VIEWED');
  const deliveredDispatches = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'ACCEPTED');
  const disputedDispatches = dispatches.filter(d => d.status === 'DISPUTED');

  const totalLoss = dispatches.reduce((acc, d) => acc + (d.reconciliation?.discrepancyValue || 0), 0);
  const totalVolume = dispatches.reduce((acc, d) => acc + d.totalQuantity, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Card & Primary Action */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/20 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Business Owner Command Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Apex Precision Logistics</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Monitor freight movements, partner delivery acknowledgements, receipt reconciliations, and supplier loss claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('CREATE_DISPATCH')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Dispatch</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>In-Transit / Active</span>
            <Truck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{activeDispatches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending delivery receipt</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Reconciled / Accepted</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{deliveredDispatches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verified clean receipts</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Disputed Claims</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{disputedDispatches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">${totalLoss.toLocaleString()} total losses</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Dispatched Cargo Volume</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalVolume.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total units dispatched</div>
        </div>
      </div>

      {/* Dispatches Summary Feed */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Active Dispatches & Movement</h2>
            <p className="text-xs text-slate-400 mt-0.5">Recent dispatches awaiting partner verification.</p>
          </div>
          <button
            onClick={() => onNavigate('DISPATCHES')}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {dispatches.slice(0, 3).map((d) => (
            <div
              key={d.id}
              onClick={() => onSelectDispatch(d)}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/30 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{d.dispatchNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium border border-slate-700">
                    {d.status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  To: <span className="text-slate-200">{d.receiverPartnerName}</span> • {d.totalQuantity} units ($
                  {d.totalValue.toLocaleString()})
                </div>
              </div>

              <div className="text-indigo-400 font-medium hover:underline text-right text-[11px]">
                Inspect Manifest →
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
