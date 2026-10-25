import React from 'react';
import { User, Building, Smartphone, ShieldCheck, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ProfileSummaryCardProps {
  onOpenProfile?: () => void;
  className?: string;
}

export const ProfileSummaryCard: React.FC<ProfileSummaryCardProps> = ({ onOpenProfile, className = '' }) => {
  const { user } = useAuth();
  if (!user) return null;

  const initials = (user.name || user.fullName || 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadgeColor = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'BUSINESS_OWNER':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'SENDER':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      case 'RECEIVER':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-sm p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        {/* Avatar or Default Initials */}
        <div className="relative shrink-0">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/40 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-700 via-sky-600 to-indigo-500 flex items-center justify-center text-white text-base font-bold shadow-sm border border-indigo-400/30">
              {initials}
            </div>
          )}
          {user.phoneVerified && (
            <div
              className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-slate-900"
              title="Verified Identity"
            >
              <CheckCircle2 className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* User Identity Details (Safe: No Raw FAN/FIN) */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-white truncate">{user.name}</h2>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getRoleBadgeColor()}`}
            >
              {user.role}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>Fayda Verified</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1">
            <span className="flex items-center gap-1 truncate">
              <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{user.businessName}</span>
            </span>
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>{user.maskedPhone || user.phoneNumber}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Action to View/Manage Profile */}
      {onOpenProfile && (
        <button
          onClick={onOpenProfile}
          className="self-stretch sm:self-auto px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer shrink-0"
        >
          Manage Profile
        </button>
      )}
    </div>
  );
};
