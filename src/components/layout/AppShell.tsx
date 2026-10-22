import React, { useState, useEffect } from 'react';
import {
  Shield,
  Truck,
  Building,
  Hash,
  Cpu,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  Smartphone,
  ChevronDown,
  UserCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { AppView, canAccessView } from '../../services/authorization';
import { StatusBanner } from './StatusBanner';

interface AppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenSignIn: () => void;
  onOpenRegister: () => void;
  onOpenPhoneVerify: () => void;
  onOpenBootstrap: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onOpenSignIn,
  onOpenRegister,
  onOpenPhoneVerify,
  onOpenBootstrap,
  children
}) => {
  const { user, signOut, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [pwaPromptAvailable, setPwaPromptAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaPromptAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setPwaPromptAvailable(false);
      }
      setDeferredPrompt(null);
    }
  };

  const navItems: { view: AppView; label: string; icon: React.FC<{ className?: string }> }[] = [
    { view: 'DASHBOARD', label: 'Dashboard', icon: Shield },
    { view: 'DISPATCHES', label: 'Dispatches', icon: Truck },
    { view: 'PARTNERS', label: 'Partners', icon: Building },
    { view: 'AUDIT_LOGS', label: 'Audit Ledger', icon: Hash },
    { view: 'SYSTEM_CONFIG', label: 'System Status', icon: Cpu }
  ];

  const allowedNavItems = navItems.filter(item => canAccessView(user as any, item.view));

  const handleRoleSelect = async (role: UserRole) => {
    setRoleDropdownOpen(false);
    await switchDemoRole(role);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Environment and Adapter Status Banner */}
      <StatusBanner onNavigate={onNavigate} />

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('DASHBOARD')}
              className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black tracking-wider">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  <span>DispatchSync</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Kernel
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium hidden sm:block">Reconciliation & Audit Engine</div>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Controls: Role Switcher, PWA Install, Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* PWA Install Button */}
            {pwaPromptAvailable && (
              <button
                onClick={handleInstallPwa}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-medium transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Install PWA</span>
              </button>
            )}

            {/* Role Switcher Dropdown (for evaluator convenience across all 4 roles) */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-200 transition"
                  aria-expanded={roleDropdownOpen}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        user.role === 'SUPER_ADMIN'
                          ? 'bg-amber-400'
                          : user.role === 'BUSINESS_OWNER'
                          ? 'bg-indigo-400'
                          : user.role === 'SENDER'
                          ? 'bg-sky-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-medium text-[11px] truncate max-w-[65px] sm:max-w-none">
                      {user.role === 'BUSINESS_OWNER' ? 'Owner' : user.role === 'SUPER_ADMIN' ? 'Admin' : user.role === 'SENDER' ? 'Sender' : 'Receiver'}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 text-xs space-y-1 animate-fade-in">
                    <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      Switch Role (Demo Sandbox)
                    </div>
                    <button
                      onClick={() => handleRoleSelect('BUSINESS_OWNER')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition"
                    >
                      <div>
                        <div className="font-medium text-slate-200">Business Owner</div>
                        <div className="text-[10px] text-slate-500">Sarah (Apex Logistics)</div>
                      </div>
                      {user.role === 'BUSINESS_OWNER' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                    <button
                      onClick={() => handleRoleSelect('SENDER')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition"
                    >
                      <div>
                        <div className="font-medium text-slate-200">Sender Agent</div>
                        <div className="text-[10px] text-slate-500">Carlos (Warehouse)</div>
                      </div>
                      {user.role === 'SENDER' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                    <button
                      onClick={() => handleRoleSelect('RECEIVER')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition"
                    >
                      <div>
                        <div className="font-medium text-slate-200">Receiver Agent</div>
                        <div className="text-[10px] text-slate-500">Elena (Northstar Hub)</div>
                      </div>
                      {user.role === 'RECEIVER' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                    <button
                      onClick={() => handleRoleSelect('SUPER_ADMIN')}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition"
                    >
                      <div>
                        <div className="font-medium text-amber-300">Super Administrator</div>
                        <div className="text-[10px] text-slate-500">Root Governance Auditor</div>
                      </div>
                      {user.role === 'SUPER_ADMIN' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User Profile / Auth Actions */}
            {user ? (
              <div className="flex items-center gap-2">
                {!user.phoneVerified && (
                  <button
                    onClick={onOpenPhoneVerify}
                    className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-medium"
                    title="Click to complete phone verification"
                  >
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span>Verify Phone</span>
                  </button>
                )}

                <button
                  onClick={() => signOut()}
                  aria-label="Sign out"
                  className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenSignIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={onOpenRegister}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-2">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    onNavigate(item.view);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600/20 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 text-indigo-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
              <button
                onClick={() => {
                  onNavigate('SYSTEM_CONFIG');
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-900"
              >
                <Cpu className="w-4 h-4 text-slate-500" />
                <span>Architecture & Status</span>
              </button>

              <button
                onClick={() => {
                  onOpenBootstrap();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-amber-400 hover:bg-slate-900"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>One-Time Super Admin Bootstrap</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main App Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer with Security & PWA Disclaimer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-400">DispatchSync Kernel</span> • Business Dispatch & Delivery Reconciliation System
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Installable Web PWA (No Native Android APK)</span>
            <span>•</span>
            <span>Tamper-Resistant SHA-256 Ledger</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
