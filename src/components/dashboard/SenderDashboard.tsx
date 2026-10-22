import React from 'react';
import { Truck, Plus, Clock, Eye, CheckCircle2, PackageCheck } from 'lucide-react';
import { Dispatch } from '../../types';
import { AppView } from '../../services/authorization';

interface SenderDashboardProps {
  dispatches: Dispatch[];
  onSelectDispatch: (dispatch: Dispatch) => void;
  onNavigate: (view: AppView) => void;
}

export const SenderDashboard: React.FC<SenderDashboardProps> = ({
  dispatches,
  onSelectDispatch,
  onNavigate
}) => {
  const outgoing = dispatches.filter(d => d.status === 'DISPATCHED');
  const viewedByPartner = dispatches.filter(d => d.status === 'VIEWED');
  const delivered = dispatches.filter(d => d.status === 'DELIVERED' || d.status === 'ACCEPTED' || d.status === 'DISPUTED');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950/50 to-slate-900 border border-sky-500/20 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold mb-2">
            <Truck className="w-3.5 h-3.5" />
            <span>Sender Dispatch Operator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Outbound Freight & Manifests</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Prepare outbound shipments, record unit values, seal manifests, and track partner viewing status.
          </p>
        </div>

        <button
          onClick={() => onNavigate('CREATE_DISPATCH')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Dispatch Manifest</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>In Transit</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{outgoing.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Dispatched from warehouse</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>Viewed by Recipient</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300">{viewedByPartner.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recipient checked manifest</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span>Delivered & Handed Over</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{delivered.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Confirmed at destination dock</div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <h2 className="text-base font-semibold text-white mb-3">Outgoing Shipments</h2>
        <div className="space-y-3">
          {dispatches.map((d) => (
            <div
              key={d.id}
              onClick={() => onSelectDispatch(d)}
              className="p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/30 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">{d.dispatchNumber}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-medium">
                    {d.status}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] mt-1">
                  Destination: {d.receiverPartnerName} ({d.totalQuantity} units)
                </div>
              </div>
              <div className="text-sky-400 font-medium text-[11px]">View Manifest →</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
