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
  Users,
  UserCheck,
  UserX,
  CreditCard,
  Smartphone,
  Shield,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { AuditLogEntry, Business, SystemStatusInfo, User, UserRole } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { ProfileSummaryCard } from '../../components/common/ProfileSummaryCard.js';

interface SuperAdminDashboardProps {
  onNavigateStatus: () => void;
  onOpenProfile?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onNavigateStatus, onOpenProfile }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS'>('OVERVIEW');

  // Overview data
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

  // User Management state
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | ''>('');
  const [userStatusFilter, setUserStatusFilter] = useState<'ACTIVE' | 'SUSPENDED' | ''>('');
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionError, setUserActionError] = useState<string | null>(null);
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(null);

  // Suspend modal state
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState(false);

  useEffect(() => {
    loadData();
    loadUsers();
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

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await api.adminGetUsers({
        search: userSearch || undefined,
        role: userRoleFilter || undefined,
        status: userStatusFilter || undefined,
        limit: 50,
      });
      setUsersList(res.users);
    } catch (err: any) {
      console.error('Failed to load users:', err);
    } finally {
      setUsersLoading(false);
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
      loadUsers();
    } catch (err: any) {
      setBootstrapError(err.message || 'Bootstrap token redemption failed.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  // User Actions: Suspend
  const handleConfirmSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendTarget || !suspendReason.trim() || isSubmittingSuspend) return;

    setUserActionError(null);
    setUserActionSuccess(null);
    setIsSubmittingSuspend(true);

    try {
      const res = await api.adminSuspendUser(suspendTarget.id, suspendReason.trim());
      setUserActionSuccess(res.message);
      setSuspendTarget(null);
      setSuspendReason('');
      await loadUsers();
      await loadData();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to suspend user.');
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  // User Actions: Reactivate
  const handleReactivateUser = async (targetUser: User) => {
    setUserActionError(null);
    setUserActionSuccess(null);
    try {
      const res = await api.adminReactivateUser(targetUser.id);
      setUserActionSuccess(res.message);
      await loadUsers();
      await loadData();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to reactivate user.');
    }
  };

  // User Actions: Role Change (with lockout protection)
  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    if (targetUser.role === newRole) return;
    setUserActionError(null);
    setUserActionSuccess(null);

    try {
      const res = await api.adminUpdateUserRole(targetUser.id, newRole);
      setUserActionSuccess(res.message);
      await loadUsers();
      await loadData();
    } catch (err: any) {
      setUserActionError(err.message || 'Failed to update user role.');
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
      {/* Profile Summary Card */}
      <ProfileSummaryCard onOpenProfile={onOpenProfile} />

      {/* Super Admin Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-purple-900/40 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              Super Administrator Control Center
            </span>
            <span className="text-xs text-slate-400">Privileged Session</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Infrastructure & User Governance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-tenant inspection, Fayda identity oversight, user activation controls, and cryptographic audit ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadData();
              loadUsers();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onNavigateStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnostic Health</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher: Overview vs User Administration */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'OVERVIEW'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Platform Overview & Ledger</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('USERS');
            loadUsers();
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'USERS'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Administration & Roles ({usersList.length})</span>
        </button>
      </div>

      {userActionError && (
        <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{userActionError}</span>
          </div>
          <button onClick={() => setUserActionError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {userActionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{userActionSuccess}</span>
          </div>
          <button onClick={() => setUserActionSuccess(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* TAB 1: OVERVIEW & LEDGER */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* System Highlights */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Total Audit Events</div>
              <div className="text-xl font-bold text-purple-400">{logs.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Immutable append-only ledger</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Enrolled Users</div>
              <div className="text-xl font-bold text-emerald-400">{usersList.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Fayda verified accounts</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <div className="text-xs text-slate-400 mb-1">Registered Tenants</div>
              <div className="text-xl font-bold text-sky-400">{businesses.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active business entities</div>
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
              In compliance with the security constitution, there are no hardcoded backdoor credentials. The server generates a single-use random token upon initialization. It can only be redeemed once via <code className="text-slate-300">POST /api/auth/bootstrap-superadmin</code>.
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
                  <option value="USER_REGISTERED">User Registered</option>
                  <option value="ADMIN_USER_SUSPENDED">User Suspended</option>
                  <option value="ADMIN_USER_REACTIVATED">User Reactivated</option>
                  <option value="ADMIN_USER_ROLE_CHANGED">Role Changed</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40 border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Timestamp</th>
                    <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Actor / Entity</th>
                    <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Action</th>
                    <th className="px-3.5 py-3 font-semibold whitespace-nowrap">Target Entity</th>
                    <th className="px-3.5 py-3 font-semibold">Details & Integrity Trail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-200">{log.actorName}</span>
                        <span className="text-[10px] text-slate-500 block">Role: {log.actorRole}</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-indigo-300 whitespace-nowrap">
                        {log.entityType}: {log.entityId}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-300 font-sans text-xs">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: USER ADMINISTRATION */}
      {activeTab === 'USERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Platform User Accounts & Identity Oversight</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage roles, view Fayda identity verification status, and enforce account suspension with audit logs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-60 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  placeholder="Search name, phone, FAN..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter users by role"
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value as UserRole | '');
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">All Roles</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="BUSINESS_OWNER">Business Owner</option>
                  <option value="SENDER">Sender / Dispatcher</option>
                  <option value="RECEIVER">Receiver / Partner</option>
                </select>

                <select
                  aria-label="Filter users by account status"
                  value={userStatusFilter}
                  onChange={(e) => {
                    setUserStatusFilter(e.target.value as 'ACTIVE' | 'SUSPENDED' | '');
                  }}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>

                <button
                  onClick={loadUsers}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition shrink-0"
                  title="Apply Filter"
                >
                  <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* User Accounts Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 scrollbar-thin">
            <table className="w-full text-left text-xs min-w-[860px] lg:min-w-full">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Verified Phone</th>
                  <th className="px-4 py-3 font-semibold">Fayda e-ID (Masked)</th>
                  <th className="px-4 py-3 font-semibold">Business Entity</th>
                  <th className="px-4 py-3 font-semibold">Assigned Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {usersList.map((u) => {
                  const initials = u.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* User Info with Avatar */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {initials}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-slate-300">
                          {u.maskedPhone || u.phoneNumber}
                        </span>
                        {u.phoneVerified && (
                          <span className="block text-[10px] text-emerald-400">Verified</span>
                        )}
                      </td>

                      {/* Fayda National ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-mono text-[11px] text-sky-400">
                            FAN: {u.maskedFan || '•••• •••• •••• 4444'}
                          </div>
                          <div className="font-mono text-[11px] text-emerald-400">
                            FIN: {u.maskedFin || '•••• •••• 3333'}
                          </div>
                        </div>
                      </td>

                      {/* Business Entity */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-300">
                        {u.businessName}
                      </td>

                      {/* Role Selector */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="BUSINESS_OWNER">Business Owner</option>
                          <option value="SENDER">Sender / Dispatcher</option>
                          <option value="RECEIVER">Receiver / Partner</option>
                          <option value="SUPER_ADMIN">Super Administrator</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {u.status === 'ACTIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ACTIVE
                          </span>
                        ) : (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            title={u.suspendedReason ? `Reason: ${u.suspendedReason}` : undefined}
                          >
                            SUSPENDED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {u.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setSuspendTarget(u);
                              setSuspendReason('');
                              setUserActionError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-[11px] transition cursor-pointer"
                          >
                            Suspend...
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateUser(u)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition cursor-pointer"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Suspension Reason Modal */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-900/60 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setSuspendTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-rose-400">
              <UserX className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Suspend User Account</h3>
            </div>

            <p className="text-xs text-slate-300 mb-2 leading-relaxed">
              You are about to suspend <span className="font-semibold text-white">{suspendTarget.name}</span> (<code className="text-slate-400">{suspendTarget.id}</code>).
            </p>
            <p className="text-[11px] text-amber-400/90 mb-4 bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/40">
              Suspended users cannot authenticate, create dispatches, or access tenant ledgers. All active session tokens will be rejected.
            </p>

            <form onSubmit={handleConfirmSuspend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Suspension Justification Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="e.g. Audit policy violation, pending investigation into fraudulent manifest report..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSuspendTarget(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSuspend || !suspendReason.trim()}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSuspend ? 'Suspending...' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
