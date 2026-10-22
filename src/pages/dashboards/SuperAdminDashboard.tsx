import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  KeyRound,
  FileText,
  Activity,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { AuditLogEntry, Business, SystemStatusInfo } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

interface SuperAdminDashboardProps {
  onNavigateStatus: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateStatus }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statusInfo, setStatusInfo] = useState<SystemStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditFilter, setAuditFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  // Bootstrap redemption test form
  const [bootstrapTokenInput, setBootstrapTokenInput] = useState('');
  const [bootstrapEmail, setBootstrapEmail] = useState('');
  const [bootstrapName, setBootstrapName] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsData, statusData] = await Promise.all([
        api.getAuditLogs(),
        api.getSystemStatus(),
      ]);
      setLogs(logsData);
      setStatusInfo(statusData);

      // Fetch businesses
      const bRes = await fetch('/api/system/businesses');
      if (bRes.ok) {
        const bData = await bRes.json();
        setBusinesses(bData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBootstrapping) return;

    setBootstrapError(null);
    setBootstrapMessage(null);
    setIsBootstrapping(true);

    try {
      const res = await api.bootstrapSuperAdmin({
        bootstrapSecret: bootstrapTokenInput.trim(),
        email: bootstrapEmail.trim(),
        name: bootstrapName.trim(),
        password: bootstrapPassword,
      });
      setBootstrapMessage(res.message);
      loadData();
    } catch (err: any) {
      setBootstrapError(err.message || 'Bootstrap token redemption failed.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading system oversight logs & telemetry..." />;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.actorName.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.action.toLowerCase().includes(auditFilter.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Super Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-purple-900/40 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              Super Administrator Control Center
            </span>
            <span className="text-xs text-slate-400">Privileged Session</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tenant inspection, tamper-resistant append-only event logs, and security bootstrap oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
          <button
            onClick={onNavigateStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostic Health Page</span>
          </button>
        </div>
      </div>

      {/* System Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Total Audit Events</div>
          <div className="text-xl font-bold text-purple-400">{logs.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Immutable append-only ledger</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Registered Tenants</div>
          <div className="text-xl font-bold text-emerald-400">{businesses.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active business entities</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">System Environment</div>
          <div className="text-xl font-bold text-sky-400">Node / PWA</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Express API + Vite React</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 mb-1">Database Adapter</div>
          <div className="text-xs font-bold text-amber-400 truncate mt-1">
            {statusInfo?.databaseProvider || 'Sandbox In-Memory'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Isolated dev provider</div>
        </div>
      </div>

      {/* Super Admin Bootstrap Validator Box */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">One-Time Super-Admin Bootstrap Verification</h2>
          </div>
          {statusInfo?.superAdminBootstrapAvailable ? (
            <span className="text-[11px] font-semibold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-800">
              One-Time Token Active on Server
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Bootstrap Consumed & Closed
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          In compliance with the security constitution, there are no hardcoded backdoor credentials. The server generates a single-use random token upon initialization (or reads <code className="text-slate-300">SUPERADMIN_BOOTSTRAP_SECRET</code>). It can only be redeemed once via <code className="text-slate-300">POST /api/auth/bootstrap-superadmin</code>.
        </p>

        {statusInfo?.superAdminBootstrapAvailable && (
          <form onSubmit={handleRedeemBootstrap} className="space-y-3 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <input
                type="text"
                required
                value={bootstrapTokenInput}
                onChange={(e) => setBootstrapTokenInput(e.target.value)}
                placeholder="Server Bootstrap Token"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                required
                value={bootstrapName}
                onChange={(e) => setBootstrapName(e.target.value)}
                placeholder="Admin Full Name"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="email"
                required
                value={bootstrapEmail}
                onChange={(e) => setBootstrapEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <input
                type="password"
                required
                minLength={8}
                value={bootstrapPassword}
                onChange={(e) => setBootstrapPassword(e.target.value)}
                placeholder="Set Admin Password"
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {bootstrapError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {bootstrapError}
              </p>
            )}
            {bootstrapMessage && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {bootstrapMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isBootstrapping}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              {isBootstrapping ? 'Verifying...' : 'Redeem & Provision Administrator'}
            </button>
          </form>
        )}
      </div>

      {/* Full Audit Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Tamper-Resistant Audit Trail ({filteredLogs.length})</h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Search audit events..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-white"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
            >
              <option value="ALL">All Actions</option>
              <option value="DISPATCH_CREATED">Dispatch Created</option>
              <option value="DISPATCH_VIEWED">Dispatch Viewed</option>
              <option value="RECEIPT_RECORDED">Receipt Recorded</option>
              <option value="RECEIPT_DISCREPANCY_RECORDED">Discrepancy Recorded</option>
              <option value="RECONCILIATION_FINALIZED">Reconciliation Finalized</option>
              <option value="USER_LOGIN">User Login</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold">Actor / Entity</th>
                <th className="pb-3 font-semibold">Action</th>
                <th className="pb-3 font-semibold">Target Entity</th>
                <th className="pb-3 font-semibold">Details & Integrity Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="font-semibold text-slate-200">{log.actorName}</span>
                    <span className="text-[10px] text-slate-500 block">Role: {log.actorRole}</span>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 text-indigo-300 whitespace-nowrap">
                    {log.entityType}: {log.entityId}
                  </td>
                  <td className="py-2.5 text-slate-300 font-sans text-xs">
                    {log.details}
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
