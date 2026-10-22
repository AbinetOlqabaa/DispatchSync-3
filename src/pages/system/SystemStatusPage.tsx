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
} from 'lucide-react';
import { SystemStatusInfo } from '../../types/dispatch.js';
import { api } from '../../services/api.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';

export const SystemStatusPage: React.FC = () => {
  const [status, setStatus] = useState<SystemStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatus();
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

  if (loading) return <LoadingSpinner label="Running platform diagnostic audit..." />;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-800">
              Diagnostic & Adapter Architecture
            </span>
            <span className="text-xs text-slate-400">Kernel v0.1.0</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Status & Environment Matrix</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time verification of connected adapters, sandbox isolation, platform target, and security policies.
          </p>
        </div>

        <button
          onClick={loadStatus}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Re-scan System</span>
        </button>
      </div>

      {/* Prominent Sandbox Notice */}
      <div className="bg-amber-950/40 border border-amber-800/80 rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2.5 text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Notice: Isolated Development Sandbox Active</span>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          The application is operating with an in-memory development adapter (<code className="text-amber-100">SandboxStore</code>). Dispatches, partner profiles, and audit trails persist during the active server session and are pre-seeded with realistic B2B supply chain records for Apex Supply Logistics and Metro Retail. Production credentials for Firebase Auth and Cloud Firestore have not been provisioned yet.
        </p>
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
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                Sandbox Mock
              </span>
            </div>
            <div className="text-white font-medium">{status?.databaseProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• Total Dispatches: {status?.totalDispatches}</div>
              <div>• Registered Partners: {status?.totalPartners}</div>
              <div>• Audit Ledger Events: {status?.totalAuditEvents}</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Future target: Cloud Firestore (<code className="text-slate-300">IDatabaseAdapter</code>)
            </div>
          </div>

          {/* Auth Adapter */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-400" />
                Auth Adapter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                Sandbox Token
              </span>
            </div>
            <div className="text-white font-medium">{status?.authProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• HMAC-SHA256 Token Sessions</div>
              <div>• Role-Based Guard Middleware</div>
              <div>• Password Reset Tokens & Expiry</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Future target: Firebase Auth / App Check
            </div>
          </div>

          {/* Notifications Adapter */}
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Notification Adapter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                Dev Event Log
              </span>
            </div>
            <div className="text-white font-medium">{status?.notificationProvider}</div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div>• Manifest Dispatch Alerts</div>
              <div>• Partner "Viewed" Real-Time Log</div>
              <div>• Reconciliation Discrepancy Alerts</div>
            </div>
            <div className="pt-2 text-[10px] text-indigo-300">
              Future target: Twilio SMS / WhatsApp Webhooks
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
              COMPLETE
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-300">Phase 2: Cloud Firestore & Firebase Auth</span>
              <p className="text-[11px] text-slate-400">
                Plug real Firebase adapter in <code className="text-slate-400">src/server/adapters/</code> and deploy security rules.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              PENDING CREDENTIALS
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-300">Phase 3: Real-Time Partner SMS / WhatsApp</span>
              <p className="text-[11px] text-slate-400">
                Deliver tracking URLs via SMS when dispatch is triggered; notify sender on receipt view.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              UPCOMING
            </span>
          </div>

          <div className="py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-300">Phase 4: Digital Signature & Photo Damage Claims</span>
              <p className="text-[11px] text-slate-400">
                Canvas receiver signature capture and photographic evidence upload for damaged cargo.
              </p>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              UPCOMING
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
