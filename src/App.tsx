import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { AppView, canAccessView } from './services/authorization';
import { Dispatch } from './types';
import { sandboxAdapter } from './services/local-adapter';

// Dashboards
import { SuperAdminDashboard } from './components/dashboard/SuperAdminDashboard';
import { BusinessOwnerDashboard } from './components/dashboard/BusinessOwnerDashboard';
import { SenderDashboard } from './components/dashboard/SenderDashboard';
import { ReceiverDashboard } from './components/dashboard/ReceiverDashboard';

// Features
import { DispatchList } from './components/dispatches/DispatchList';
import { CreateDispatchForm } from './components/dispatches/CreateDispatchForm';
import { DispatchDetailModal } from './components/dispatches/DispatchDetailModal';
import { ConfigStatusPage } from './components/config/ConfigStatusPage';
import { AuditLogViewer } from './components/audit/AuditLogViewer';
import { PartnersList } from './components/partners/PartnersList';

// Auth Modals
import { SignInModal } from './components/auth/SignInModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { PasswordResetModal } from './components/auth/PasswordResetModal';
import { PhoneVerificationModal } from './components/auth/PhoneVerificationModal';
import { SuperAdminBootstrapModal } from './components/auth/SuperAdminBootstrapModal';

const MainAppContent: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null);
  const [isLoadingDispatches, setIsLoadingDispatches] = useState<boolean>(true);

  // Modal controls
  const [signInOpen, setSignInOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);

  // Check URL query parameters (e.g. ?view=dispatches or ?autostart=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get('view')?.toUpperCase() as AppView;
      if (requestedView && ['DASHBOARD', 'DISPATCHES', 'SYSTEM_CONFIG'].includes(requestedView)) {
        setCurrentView(requestedView);
      }
    }
  }, []);

  const refreshDispatches = async () => {
    setIsLoadingDispatches(true);
    try {
      const list = await sandboxAdapter.listDispatches();
      setDispatches(list);
    } finally {
      setIsLoadingDispatches(false);
    }
  };

  useEffect(() => {
    refreshDispatches();
  }, [user]);

  const handleNavigate = (view: AppView) => {
    if (user && !canAccessView(user, view)) {
      setCurrentView('DASHBOARD');
      return;
    }
    setCurrentView(view);
  };

  const handleDispatchUpdated = (updated: Dispatch) => {
    setSelectedDispatch(updated);
    setDispatches(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  const handleCreateSuccess = async (dispatchId: string) => {
    await refreshDispatches();
    const created = await sandboxAdapter.getDispatchById(dispatchId);
    if (created) {
      setSelectedDispatch(created);
    }
    setCurrentView('DISPATCHES');
  };

  // Render role-specific dashboard
  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <h2 className="text-xl font-bold text-white mb-2">Welcome to DispatchSync</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
            Sign in to access your role-specific dashboard, dispatches, and reconciliation tools.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setSignInOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
            >
              Sign In
            </button>
            <button
              onClick={() => setRegisterOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
            >
              Register Account
            </button>
          </div>
        </div>
      );
    }

    switch (user.role) {
      case 'SUPER_ADMIN':
        return (
          <SuperAdminDashboard
            dispatches={dispatches}
            onNavigate={handleNavigate}
          />
        );
      case 'BUSINESS_OWNER':
        return (
          <BusinessOwnerDashboard
            dispatches={dispatches}
            onSelectDispatch={setSelectedDispatch}
            onNavigate={handleNavigate}
          />
        );
      case 'SENDER':
        return (
          <SenderDashboard
            dispatches={dispatches}
            onSelectDispatch={setSelectedDispatch}
            onNavigate={handleNavigate}
          />
        );
      case 'RECEIVER':
        return (
          <ReceiverDashboard
            dispatches={dispatches}
            onSelectDispatch={setSelectedDispatch}
            onNavigate={handleNavigate}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppShell
      currentView={currentView}
      onNavigate={handleNavigate}
      onOpenSignIn={() => setSignInOpen(true)}
      onOpenRegister={() => setRegisterOpen(true)}
      onOpenPhoneVerify={() => setPhoneVerifyOpen(true)}
      onOpenBootstrap={() => setBootstrapOpen(true)}
    >
      {authLoading ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Restoring cryptographic session...</p>
        </div>
      ) : (
        <>
          {currentView === 'DASHBOARD' && renderDashboard()}

          {currentView === 'DISPATCHES' && (
            <DispatchList
              dispatches={dispatches}
              userRole={user?.role || 'BUSINESS_OWNER'}
              onSelectDispatch={setSelectedDispatch}
              onNavigate={handleNavigate}
              isLoading={isLoadingDispatches}
            />
          )}

          {currentView === 'CREATE_DISPATCH' && (
            <CreateDispatchForm
              onBack={() => setCurrentView('DISPATCHES')}
              onSuccess={handleCreateSuccess}
            />
          )}

          {currentView === 'PARTNERS' && (
            <PartnersList onBack={() => setCurrentView('DASHBOARD')} />
          )}

          {currentView === 'AUDIT_LOGS' && (
            <AuditLogViewer onBack={() => setCurrentView('DASHBOARD')} />
          )}

          {currentView === 'SYSTEM_CONFIG' && (
            <ConfigStatusPage onOpenBootstrap={() => setBootstrapOpen(true)} />
          )}
        </>
      )}

      {/* Modals */}
      <DispatchDetailModal
        dispatch={selectedDispatch}
        userRole={user?.role || 'BUSINESS_OWNER'}
        onClose={() => setSelectedDispatch(null)}
        onDispatchUpdated={handleDispatchUpdated}
      />

      <SignInModal
        isOpen={signInOpen}
        onClose={() => setSignInOpen(false)}
        onOpenRegister={() => {
          setSignInOpen(false);
          setRegisterOpen(true);
        }}
        onOpenForgotPassword={() => {
          setSignInOpen(false);
          setResetOpen(true);
        }}
        onOpenBootstrap={() => {
          setSignInOpen(false);
          setBootstrapOpen(true);
        }}
      />

      <RegisterModal
        isOpen={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onOpenSignIn={() => {
          setRegisterOpen(false);
          setSignInOpen(true);
        }}
        onOpenPhoneVerification={() => setPhoneVerifyOpen(true)}
      />

      <PasswordResetModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onBackToSignIn={() => {
          setResetOpen(false);
          setSignInOpen(true);
        }}
      />

      <PhoneVerificationModal
        isOpen={phoneVerifyOpen}
        onClose={() => setPhoneVerifyOpen(false)}
        onSuccess={() => setPhoneVerifyOpen(false)}
      />

      <SuperAdminBootstrapModal
        isOpen={bootstrapOpen}
        onClose={() => setBootstrapOpen(false)}
        onSuccess={() => {
          setBootstrapOpen(false);
          refreshDispatches();
        }}
      />
    </AppShell>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
