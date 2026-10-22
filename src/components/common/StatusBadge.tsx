import React from 'react';
import { DispatchStatus } from '../../types/dispatch.js';

interface StatusBadgeProps {
  status: DispatchStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'DRAFT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Draft
        </span>
      );
    case 'DISPATCHED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
          Dispatched
        </span>
      );
    case 'VIEWED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Viewed by Partner
        </span>
      );
    case 'IN_TRANSIT':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          In Transit
        </span>
      );
    case 'PARTIALLY_RECEIVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          Shortfall / Damaged
        </span>
      );
    case 'RECEIVED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Received Complete
        </span>
      );
    case 'DISCREPANCY_REVIEW':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
          Under Review / Dispute
        </span>
      );
    case 'RECONCILED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-700/60 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          Reconciled & Closed
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-slate-800 text-slate-300 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
