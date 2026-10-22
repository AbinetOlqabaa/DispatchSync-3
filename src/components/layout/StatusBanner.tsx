import React, { useState } from 'react';
import { AlertTriangle, Smartphone, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { AppView } from '../../services/authorization';

interface StatusBannerProps {
  onNavigate: (view: AppView) => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ onNavigate }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-b border-indigo-500/20 px-4 py-2 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">Kernel Active:</span>
          <span className="flex items-center gap-1.5 text-slate-200">
            <Smartphone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-medium">Mobile Web PWA</span>
            <span className="hidden sm:inline text-slate-500 font-mono">(No Native Android APK in container)</span>
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:flex items-center gap-1 text-amber-300/90">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Sandbox Persistence Adapter</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SYSTEM_CONFIG')}
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium hover:underline focus:outline-none"
          >
            <span>View Architecture & Status</span>
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
