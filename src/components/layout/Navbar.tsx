import React, { useState, useRef, useEffect } from 'react';
import {
  Boxes,
  Shield,
  Truck,
  Users,
  FileText,
  Activity,
  LogOut,
  LogIn,
  ChevronDown,
  Menu,
  X,
  UserCheck,
  Bell,
  Warehouse,
  Sun,
  Moon,
  Laptop,
  Globe,
  Check,
  Sparkles,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme, ThemeMode } from '../../context/ThemeContext.js';
import { useTranslation } from '../../context/LanguageContext.js';
import { UserRole } from '../../types/dispatch.js';
import { SupportedLanguage } from '../../i18n/translations.js';
import { useOfflineSync } from '../../utils/offlineSync.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  onOpenNotifications,
}) => {
  const { user, logout, quickLoginDemoRole, unreadNotifsCount } = useAuth();
  const { themeMode, setThemeMode, effectiveTheme } = useTheme();
  const { language, setLanguage, t, languages, currentLanguageOption } = useTranslation();
  const { isOnline, queueCount, replayNow } = useOfflineSync();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleSwitchOpen, setRoleSwitchOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Close dropdowns on outside click
  const navRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setRoleSwitchOpen(false);
        setThemeDropdownOpen(false);
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.super_admin', 'Super Admin')}
          </span>
        );
      case 'BUSINESS_OWNER':
        return (
          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.business_owner', 'Business Owner')}
          </span>
        );
      case 'SENDER':
        return (
          <span className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.sender', 'Dispatcher / Sender')}
          </span>
        );
      case 'RECEIVER':
        return (
          <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('role.receiver', 'Receiver / Partner')}
          </span>
        );
    }
  };

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard', 'Dashboard'), icon: Activity, show: !!user },
    { id: 'dispatches', label: t('nav.dispatches', 'Dispatches'), icon: Truck, show: true },
    { id: 'locations', label: t('nav.locations', 'Origins & Docks'), icon: Warehouse, show: !!user && user.role !== 'RECEIVER' },
    { id: 'partners', label: t('nav.partners', 'Partners'), icon: Users, show: !!user && user.role !== 'RECEIVER' },
    { id: 'recommendations', label: 'Recommendations', icon: Sparkles, show: true },
    { id: 'audit', label: t('nav.audit', 'Audit Trail'), icon: FileText, show: !!user && (user.role === 'SUPER_ADMIN' || user.role === 'BUSINESS_OWNER') },
    { id: 'status', label: t('nav.status', 'System Status'), icon: Shield, show: true },
  ];

  return (
    <nav ref={navRef} className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo (B2B KERNEL badge removed for main application development) */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => onSelectTab(user ? 'dashboard' : 'dispatches')}
              className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Boxes className="w-5 h-5 text-sky-400" />
                </div>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white block leading-tight">
                  {t('app.name', 'DispatchBridge')}
                </span>
                <span className="text-[11px] text-slate-400 block -mt-0.5">
                  {t('app.subtitle', 'Delivery & Reconciliation')}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Items - Contained with horizontal overflow protection */}
          <div className="hidden lg:flex items-center gap-1 overflow-x-auto scrollbar-none py-1 max-w-[50%]">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right section: Theme selector, Language selector, Notifications, Role switcher & User menu */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Theme Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setThemeDropdownOpen(!themeDropdownOpen);
                  setLangDropdownOpen(false);
                  setRoleSwitchOpen(false);
                }}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title={`Theme: ${themeMode}`}
                aria-label="Select theme mode"
              >
                {effectiveTheme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                )}
              </button>

              {themeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    {t('nav.theme', 'Theme')}
                  </div>
                  <button
                    onClick={() => {
                      setThemeMode('dark');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      themeMode === 'dark' ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{t('theme.dark', 'Dark Mode')}</span>
                    </span>
                    {themeMode === 'dark' && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('light');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      themeMode === 'light' ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('theme.light', 'Light Mode')}</span>
                    </span>
                    {themeMode === 'light' && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>
                  <button
                    onClick={() => {
                      setThemeMode('system');
                      setThemeDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      themeMode === 'system' ? 'bg-indigo-600/30 text-indigo-300' : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Laptop className="w-3.5 h-3.5 text-sky-400" />
                      <span>{t('theme.system', 'System Default')}</span>
                    </span>
                    {themeMode === 'system' && <Check className="w-3 h-3 text-indigo-400" />}
                  </button>
                </div>
              )}
            </div>

            {/* Language Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setThemeDropdownOpen(false);
                  setRoleSwitchOpen(false);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
                title="Select language"
                aria-label="Select language"
              >
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">
                  {currentLanguageOption.shortLabel}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                  <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    {t('nav.language', 'Language')}
                  </div>
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                        language === l.code ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <span className="block font-medium">{l.nativeName}</span>
                        <span className="block text-[10px] text-slate-500">{l.label}</span>
                      </div>
                      {language === l.code && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

              {/* PWA Offline / Outbox Sync Status Badge */}
              {!isOnline ? (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold">
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span>Offline {queueCount > 0 ? `(${queueCount} queued)` : ''}</span>
                </div>
              ) : queueCount > 0 ? (
                <button
                  onClick={() => replayNow()}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900/80 text-teal-300 border border-teal-800 text-[11px] font-semibold cursor-pointer"
                  title="Click to sync queued actions with server"
                >
                  <RefreshCw className="w-3 h-3 text-teal-400 animate-spin" />
                  <span>Sync ({queueCount})</span>
                </button>
              ) : null}

              {/* Notification Bell */}
              {user && (
                <button
                  onClick={onOpenNotifications}
                className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('nav.notifications', 'In-app notification alerts')}
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                )}
              </button>
            )}

            {/* Demo Role Quick Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setRoleSwitchOpen(!roleSwitchOpen);
                  setThemeDropdownOpen(false);
                  setLangDropdownOpen(false);
                }}
                className="flex items-center gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
                title="Switch simulated role for testing"
              >
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden xl:inline">{t('nav.simulate_role', 'Simulate Role')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleSwitchOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setRoleSwitchOpen(false)}
                >
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                    {t('nav.simulate_role', 'Quick Role Sandbox Switcher')}
                  </div>
                  <button
                    onClick={() => quickLoginDemoRole('BUSINESS_OWNER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-emerald-400">{t('role.business_owner', 'Business Owner')}</span>
                    <span className="text-[11px] text-slate-400">Apex Supply Logistics (Eleanor Vance)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SENDER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-blue-400">{t('role.sender', 'Sender / Dispatcher')}</span>
                    <span className="text-[11px] text-slate-400">Create & dispatch items (Carlos Ruiz)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('RECEIVER')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-semibold text-amber-400">{t('role.receiver', 'Receiver / Partner')}</span>
                    <span className="text-[11px] text-slate-400">Metro Retail Receiving (David Miller)</span>
                  </button>
                  <button
                    onClick={() => quickLoginDemoRole('SUPER_ADMIN')}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-slate-800 flex flex-col gap-0.5 cursor-pointer border-t border-slate-800 mt-1 pt-1.5"
                  >
                    <span className="font-semibold text-purple-400">{t('role.super_admin', 'Super Administrator')}</span>
                    <span className="text-[11px] text-slate-400">System operator, audit & tenant oversight</span>
                  </button>
                </div>
              )}
            </div>

            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user.name}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    {getRoleBadge(user.role)}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
                  title={t('nav.signout', 'Sign Out')}
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('nav.signin', 'Sign In')}</span>
              </button>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex md:hidden items-center gap-1.5">
            {/* Quick theme toggle on mobile */}
            <button
              onClick={() => setThemeMode(effectiveTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              aria-label="Toggle dark/light theme"
            >
              {effectiveTheme === 'dark' ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {user && (
              <button
                onClick={onOpenNotifications}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white relative"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-3">
          {/* Mobile Language Selector */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>{t('nav.language', 'Language')}</span>
            </span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold ${
                    language === l.code ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {l.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {user ? (
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{user.name}</div>
                <div className="text-xs text-slate-400">{user.businessName}</div>
                <div className="mt-1">{getRoleBadge(user.role)}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-700 text-rose-300 hover:bg-slate-600"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow"
            >
              <LogIn className="w-4 h-4" />
              {t('nav.signin', 'Sign In or Create Account')}
            </button>
          )}

          <div className="space-y-1">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-700/50' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-400" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="text-xs text-slate-400 font-medium mb-2">{t('nav.simulate_role', 'Simulate Test Roles')}:</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  quickLoginDemoRole('BUSINESS_OWNER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700"
              >
                {t('role.business_owner', 'Owner')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SENDER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700"
              >
                {t('role.sender', 'Dispatcher')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('RECEIVER');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              >
                {t('role.receiver', 'Receiver')}
              </button>
              <button
                onClick={() => {
                  quickLoginDemoRole('SUPER_ADMIN');
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-left p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700"
              >
                {t('role.super_admin', 'Super Admin')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
