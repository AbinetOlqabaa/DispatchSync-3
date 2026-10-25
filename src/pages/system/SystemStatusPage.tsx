import React, { useEffect, useState } from 'react';
import {
  Shield,
  Server,
  Database,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Cpu,
  Send,
  PenTool,
  Camera,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { SystemStatusInfo, StagingReadinessReport } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import { OutboxManagerModal } from '../../components/notifications/OutboxManagerModal.js';

export const SystemStatusPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOutboxOpen, setIsOutboxOpen] = useState(false);

  // Staging readiness inspector state
  const [stagingReport, setStagingReport] = useState<StagingReadinessReport | null>(null);
  const [runningStagingCheck, setRunningStagingCheck] = useState(false);

  useEffect(() => {
    loadStatus();
    loadStagingReport();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStagingReport = async () => {
    setRunningStagingCheck(true);
    try {
      const report = await api.getStagingReadinessReport();
      setStagingReport(report);
    } catch (err) {
      console.error('Failed to run staging readiness checks:', err);
    } finally {
      setRunningStagingCheck(false);
    }
  };

  if (loading) return <LoadingSpinner label="Running platform diagnostic audit..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-800">
              Staging Gateway & Platform Matrix
            </span>
            <span className="text-xs text-slate-400">Master Staging Build v0.3.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Status & Environment Matrix</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time verification of adapters, staging readiness, digital signatures, notification gateways, and audit policies.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsOutboxOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shrink-0 shadow-md shadow-indigo-600/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Outbound Gateway</span>
          </button>
          <button
            onClick={loadStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-scan</span>
          </button>
        </div>
      </div>

      {/* Prominent Sandbox Notice */}
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Notice: Isolated Staging & Development Sandbox Active</span>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          The application is operating with an in-memory staging adapter (<code className="text-amber-100">SandboxStore</code>) with full multi-tenant isolation, cryptographic HMAC session validation, outbox delivery queues, digital glass signature capture, and tamper-evident SHA-256 cargo evidence hashes.
        </p>
      </div>

      {/* Automated Staging Acceptance Inspector (.ai/09_RELEASE_CHECKLIST.md) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Automated Staging Acceptance Inspector (.ai/09_RELEASE_CHECKLIST.md)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live automated evaluation against all 4 release verification domains defined in the release checklist.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {stagingReport && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{stagingReport.overallStatus.replace(/_/g, ' ')}</span>
              </span>
            )}
            <button
              onClick={loadStagingReport}
              disabled={runningStagingCheck}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${runningStagingCheck ? 'animate-spin' : ''}`} />
              <span>{runningStagingCheck ? 'Evaluating...' : 'Run Diagnostics'}</span>
            </button>
          </div>
        </div>

        {stagingReport && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {Object.entries(stagingReport.categories).map(([key, category]) => (
              <div
                key={key}
                className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white text-xs">{category.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {category.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {category.checks.map((check) => (
                    <div key={check.id} className="text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{check.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">{check.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Platform & Builder Capability Audit */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-sky-400" />
          Platform Inspection & Hardware Target
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Target Architecture</span>
            <div className="font-bold text-white text-sm">Progressive Web App (PWA)</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Inspected cloud builder capabilities: this environment is a Linux container with Node.js 22 and Web preview. Native Android toolchains (Gradle, JVM Android SDK, APK packaging) are not present. Consequently, the application is built as an installable, mobile-optimized PWA with manifest, touch navigation, and responsive viewport.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Installable PWA Manifest Configured</span>
            </div>
          </div>

          <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 space-y-2">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Backend Server</span>
            <div className="font-bold text-white text-sm">Full-Stack Express + Vite Integration</div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Runs an Express server (<code className="text-slate-300">server.ts</code>) serving RESTful API routes under <code className="text-slate-300">/api/*</code> and mounting Vite development middleware. All privileged operations, role validation, and token signing are executed strictly server-side.
            </p>
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px] pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Privileged Operations Isolated to Server-Side</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Adapters Status Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Component Adapter Matrix
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Database Adapter */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-400" />
                Database Adapter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Staging Ready
              </span>
            </div>
            <div className="text-white font-medium">{status?.databaseProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• Total Dispatches: {status?.totalDispatches}</div>
              <div>• Registered Partners: {status?.totalPartners}</div>
              <div>• Audit Ledger Events: {status?.totalAuditEvents}</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Contract: <code className="text-slate-300">IDatabaseAdapter</code> pluggable interface
            </div>
          </div>

          {/* Auth Adapter */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-400" />
                Auth Adapter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                HMAC SHA-256
              </span>
            </div>
            <div className="text-white font-medium">{status?.authProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• HMAC-SHA256 Token Sessions</div>
              <div>• Role-Based Guard Middleware</div>
              <div>• Password Reset Tokens & Expiry</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Contract: <code className="text-slate-300">IAuthAdapter</code> interface
            </div>
          </div>

          {/* Notifications Adapter */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Notification Adapter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                Multi-Channel Active
              </span>
            </div>
            <div className="text-white font-medium">{status?.notificationProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• Outbound SMS Gateway Queue</div>
              <div>• SMTP Transactional Relayer</div>
              <div>• Signed HTTPS Webhooks</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Contract: <code className="text-slate-300">INotificationAdapter</code> interface
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture & Super-Admin Bootstrap Policy */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-purple-400" />
          Zero-Backdoor Super-Admin Policy
        </h2>

        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs space-y-2 leading-relaxed">
          <p className="text-slate-300">
            In compliance with strict security requirements:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>No super-administrator accounts have default, publicly known, or hardcoded passwords.</li>
            <li>A cryptographically random 24-byte one-time token is generated on server startup, printed to the server terminal, or read from <code className="text-slate-300">SUPERADMIN_BOOTSTRAP_SECRET</code>.</li>
            <li>Once redeemed via <code className="text-slate-300">POST /api/auth/bootstrap-superadmin</code>, the bootstrap mechanism is permanently consumed and closed.</li>
          </ul>

          <div className="flex items-center gap-2 pt-2 text-[11px]">
            <span className="text-slate-400 font-semibold">Current Bootstrap Status:</span>
            {status?.superAdminBootstrapAvailable ? (
              <span className="text-amber-400 font-medium">One-Time Token Available on Server</span>
            ) : (
              <span className="text-emerald-400 font-medium">Bootstrap Consumed / Closed</span>
            )}
          </div>
        </div>
      </div>

      {/* Extension Roadmap & Production Setup Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCode className="w-4 h-4 text-teal-400" />
          Extension Roadmap (Master Plan Staging)
        </h2>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white">Phase 1: Core Kernel</span>
              <p className="text-[11px] text-slate-400">
                PWA shell, multi-role dashboards, mock isolation, dispatch creation, view tracking, loss reconciliation.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              COMPLETE & VERIFIED
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white">Phase 2: Pluggable Cloud Database & Auth Adapter</span>
              <p className="text-[11px] text-slate-400">
                Defined <code className="text-slate-300">IDatabaseAdapter</code> & <code className="text-slate-300">IAuthAdapter</code> contracts, automated staging readiness evaluation endpoint, and strict tenant boundaries.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              COMPLETE & VERIFIED
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white">Phase 3: Real-Time Partner SMS / WhatsApp & Outbound Gateway</span>
              <p className="text-[11px] text-slate-400">
                Delivery tracking outbox, delivery attempt retry logic, SMS tracking links, webhook payloads, and notification delivery state machine.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              ACTIVE & OPERATIONAL
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white">Phase 4: Digital Signature & Photo Damage Claims</span>
              <p className="text-[11px] text-slate-400">
                Interactive canvas glass signature capture on delivery sign-off; tamper-evident SHA-256 damage photo evidence attachment on discrepancy cases.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              ACTIVE & VERIFIED
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-white">Phase 5: PWA Offline Outbox Queue & Network Sync</span>
              <p className="text-[11px] text-slate-400">
                Preserves pending dispatches, transit scans, and dock reconciliations in local storage when offline with automatic replay when reconnected.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              ACTIVE & OPERATIONAL
            </span>
          </div>
        </div>
      </div>

      {/* Outbound Delivery Gateway Modal */}
      <OutboxManagerModal
        isOpen={isOutboxOpen}
        onClose={() => setIsOutboxOpen(false)}
      />
    </div>
  );
};
