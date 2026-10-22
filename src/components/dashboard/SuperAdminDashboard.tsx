import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Server,
  Lock,
  Building2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Hash,
  Database
} from 'lucide-react';
import { AuditLogEntry, Dispatch } from '../../types';
import { sandboxAdapter } from '../../services/local-adapter';
import { AppView } from '../../services/authorization';

interface SuperAdminDashboardProps {
  dispatches: Dispatch[];
  onNavigate: (view: AppView) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ dispatches, onNavigate }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [integrityState, setIntegrityState] = useState<{
    valid: boolean;
    verifiedCount: number;
    checking: boolean;
  }>({
    valid: true,
    verifiedCount: 0,
    checking: false
  });

  useEffect(() => {
    async function loadData() {
      const logs = await sandboxAdapter.getAuditLogs(10);
      setAuditLogs(logs);
      setIntegrityState(prev => ({ ...prev, verifiedCount: logs.length }));
    }
    loadData();
  }, []);

  const handleVerifyIntegrity = async () => {
    setIntegrityState(prev => ({ ...prev, checking: true }));
    try {
      const res = await sandboxAdapter.verifyLedgerIntegrity();
      setIntegrityState({
        valid: res.valid,
        verifiedCount: res.verifiedCount,
        checking: false
      });
    } catch {
      setIntegrityState(prev => ({ ...prev, checking: false, valid: false }));
    }
  };

  const disputedDispatches = dispatches.filter(d => d.status === 'DISPUTED');
  const totalValueTracked = dispatches.reduce((acc, d) => acc + d.totalValue, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 text-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
            <Lock className="w-3 h-3" />
            <span>Super Administrator Root Session</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">System Governance & Cryptographic Ledger</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Super Administrator console overseeing cross-business tenant operations, immutable audit hash chaining, and system security integrity.
          </p>
        </div>

        <button
          onClick={handleVerifyIntegrity}
          disabled={integrityState.checking}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${integrityState.checking ? 'animate-spin' : ''}`} />
          <span>Verify Ledger Chain Integrity</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Ledger Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
            <span>{integrityState.valid ? 'Verified 100%' : 'Compromised'}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {integrityState.verifiedCount} cryptographic blocks chained
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Tracked Shipments</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white">{dispatches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all registered partners</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Declared Manifest Value</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono">
            ${totalValueTracked.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Total cargo in transit/delivered</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Loss / Disputed Claims</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{disputedDispatches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requires reconciliation signoff</div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400" />
              <span>Immutable Cryptographic Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live tamper-resistant hash ledger recording user sign-ins, dispatches, receipts, and loss reconciliations.
            </p>
          </div>
          <button
            onClick={() => onNavigate('AUDIT_LOGS')}
            className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            View Full Ledger
          </button>
        </div>

        <div className="space-y-2 text-xs">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">{log.action}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {log.actorRole}
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{log.details}</p>
              </div>

              <div className="sm:text-right shrink-0">
                <span className="text-[10px] text-slate-500 block">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="font-mono text-[10px] text-amber-400/80 truncate block max-w-[140px]" title={log.hash}>
                  {log.hash.substring(0, 14)}...
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
