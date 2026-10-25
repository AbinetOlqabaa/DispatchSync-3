import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Smartphone,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/dispatch.js';
import { SUPPORTED_COUNTRIES, normalizeToE164 } from '../../utils/phoneUtils.js';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onOpenForgotPassword: () => void;
  onOpenBootstrap: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
  onOpenForgotPassword,
  onOpenBootstrap,
}) => {
  const { signIn, quickLoginDemoRole } = useAuth();
  const [authMode, setAuthMode] = useState<'MOBILE' | 'EMAIL'>('MOBILE');
  const [selectedCountry, setSelectedCountry] = useState(SUPPORTED_COUNTRIES[0]); // Ethiopia (+251)
  const [phoneNumber, setPhoneNumber] = useState('911019283');
  const [email, setEmail] = useState('owner@apexsupply.com');
  const [password, setPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    let identifier = '';
    if (authMode === 'MOBILE') {
      if (!phoneNumber.trim()) {
        setLocalError('Please enter your mobile phone number.');
        return;
      }
      identifier = normalizeToE164(phoneNumber, selectedCountry.dialCode);
    } else {
      if (!email.trim() || !email.includes('@')) {
        setLocalError('Please enter a valid work email address.');
        return;
      }
      identifier = email.trim();
    }

    if (!password) {
      setLocalError('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(identifier, password);
      onClose();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRole = async (role: UserRole) => {
    setIsSubmitting(true);
    setLocalError(null);
    try {
      await quickLoginDemoRole(role);
      onClose();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Role switch failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8">
        <button
          onClick={onClose}
          aria-label="Close sign in dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Dispatch Gateway</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Sign In</h2>
          <p className="text-sm text-slate-400 mt-1">
            Access dispatches, partner receipts, and reconciliation ledger.
          </p>
        </div>

        {/* Tab Toggle: Mobile (Default) vs Email */}
        <div className="flex rounded-xl bg-slate-950 p-1 mb-5 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setAuthMode('MOBILE');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === 'MOBILE'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile Number</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('EMAIL');
              setLocalError(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === 'EMAIL'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Work Email</span>
          </button>
        </div>

        {localError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'MOBILE' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mobile Number <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                {/* Country Code Selector */}
                <select
                  aria-label="Country dial code"
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const found = SUPPORTED_COUNTRIES.find((c) => c.code === e.target.value);
                    if (found) setSelectedCountry(found);
                  }}
                  className="bg-slate-950/80 border border-slate-700 rounded-xl px-2.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
                >
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                      {c.flag} {c.dialCode} ({c.name})
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder={selectedCountry.samplePlaceholder}
                    required
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                E.164 preview: {normalizeToE164(phoneNumber, selectedCountry.dialCode) || '—'}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={onOpenForgotPassword}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Remember session securely</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-800">
          <p className="text-center text-xs text-slate-400">
            Don't have an enrolled business account?{' '}
            <button
              type="button"
              onClick={onOpenRegister}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer ml-1"
            >
              Enroll with Fayda e-ID
            </button>
          </p>
        </div>

        {/* Demo Quick Role Switcher */}
        <div className="mt-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Quick Sandbox Switch</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickRole('BUSINESS_OWNER')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="font-semibold text-emerald-400 block text-[11px]">Business Owner</span>
              <span className="text-[10px] text-slate-400 truncate block">Eleanor Vance</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole('SENDER')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="font-semibold text-blue-400 block text-[11px]">Sender Agent</span>
              <span className="text-[10px] text-slate-400 truncate block">Carlos Ruiz</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole('RECEIVER')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="font-semibold text-amber-400 block text-[11px]">Receiver Agent</span>
              <span className="text-[10px] text-slate-400 truncate block">David Miller</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole('SUPER_ADMIN')}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-left border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              <span className="font-semibold text-purple-400 block text-[11px]">Super Admin</span>
              <span className="text-[10px] text-slate-400 truncate block">System Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
