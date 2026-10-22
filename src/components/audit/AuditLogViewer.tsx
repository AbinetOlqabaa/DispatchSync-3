import React, { useState, useEffect } from 'react';
import { ShieldCheck, Hash, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AuditLogEntry } from '../../types';
import { sandboxAdapter } from '../../services/local-adapter';

interface AuditLogViewerProps {
  onBack: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    verifiedCount: number;
    brokenAtId?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      const data = await sandboxAdapter.getAuditLogs(100);
      setLogs(data);
    }
    fetchLogs();
  }, []);

  const handleVerifyLedger = async () => {
    setIsVerifying(true);
    try {
      const res = await sandboxAdapter.verifyLedgerIntegrity();
      setVerificationResult(res);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={handleVerifyLedger}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
          <span>Verify Hash Chain Integrity</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-slate-100 shadow-xl">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Hash className="w-3.5 h-3.5" />
            <span>Cryptographic Proof Ledger</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Tamper-Resistant Audit History</h2>
          <p className="text-sm text-slate-400 mt-1">
            Every dispatch lifecycle event is sequentially sealed with a SHA-256 integrity hash chained to the preceding transaction block.
          </p>
        </div>

        {verificationResult && (
          <div
            className={`p-4 mb-6 rounded-xl border text-xs flex items-center justify-between ${
              verificationResult.valid
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {verificationResult.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <div>
                <p className="font-semibold text-white">
                  {verificationResult.valid ? 'Cryptographic Ledger Verified Valid' : 'Ledger Integrity Broken'}
                </p>
                <p className="mt-0.5 text-slate-300">
                  {verificationResult.valid
                    ? `All ${verificationResult.verifiedCount} cryptographic blocks maintain sequential link continuity with zero tampering detected.`
                    : `Discrepancy found at block ID: ${verificationResult.brokenAtId}`}
                </p>
              </div>
            </div>
            <span className="font-mono font-bold text-xs">
              {verificationResult.valid ? 'STATUS: SECURE' : 'STATUS: CORRUPT'}
            </span>
          </div>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{log.action}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                    {log.actorRole} ({log.actorName})
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              <p className="text-slate-300 text-xs">{log.details}</p>

              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-slate-500 block">Block Hash:</span>
                  <code className="text-indigo-300 truncate block bg-slate-900 p-1 rounded">
                    {log.hash}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500 block">Previous Linked Hash:</span>
                  <code className="text-slate-400 truncate block bg-slate-900 p-1 rounded">
                    {log.previousHash}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
