/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { Navbar } from './components/layout/Navbar.js';
import { BottomNav } from './components/layout/BottomNav.js';
import { NotificationBanner } from './components/common/NotificationBanner.js';
import { AuthModal } from './pages/auth/AuthModal.js';
import { BusinessOwnerDashboard } from './pages/dashboards/BusinessOwnerDashboard.js';
import { SenderDashboard } from './pages/dashboards/SenderDashboard.js';
import { ReceiverDashboard } from './pages/dashboards/ReceiverDashboard.js';
import { SuperAdminDashboard } from './pages/dashboards/SuperAdminDashboard.js';
import { DispatchListPage } from './pages/dispatches/DispatchListPage.js';
import { DispatchDetailPage } from './pages/dispatches/DispatchDetailPage.js';
import { CreateDispatchModal } from './pages/dispatches/CreateDispatchModal.js';
import { PublicPartnerView } from './pages/dispatches/PublicPartnerView.js';
import { PartnersPage } from './pages/partners/PartnersPage.js';
import { LocationsPage } from './pages/locations/LocationsPage.js';
import { AuditPage } from './pages/audit/AuditPage.js';
import { SystemStatusPage } from './pages/system/SystemStatusPage.js';
import { RecommendationsView } from './components/recommendations/RecommendationsView.js';
import { NotificationDrawer } from './components/notifications/NotificationDrawer.js';
import { ProfileModal } from './components/auth/ProfileModal.js';

import { LoadingSpinner } from './components/common/LoadingSpinner.js';

function MainApp() {
  const { user, isLoading } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('dispatches');
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [publicShareToken, setPublicShareToken] = useState<string | null>(null);

  // Modal & Drawer State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register' | 'forgot' | 'verifyPhone'>('signin');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateDispatchOpen, setIsCreateDispatchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Check URL search params for public delivery share token (?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setPublicShareToken(token);
    }
  }, []);

  // When user logs in and is on dispatches, gently pivot to their dashboard
  useEffect(() => {
    if (user && currentTab === 'dispatches' && !selectedDispatchId && !publicShareToken) {
      setCurrentTab('dashboard');
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Initializing DispatchBridge..." />
      </div>
    );
  }

  // If public token is active, show the partner delivery manifest
  if (publicShareToken) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 antialiased pb-12">
        <PublicPartnerView
          shareToken={publicShareToken}
          onExit={() => {
            setPublicShareToken(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </div>
    );
  }

  // Render role-specific dashboard
  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl max-w-lg mx-auto my-12 space-y-3">
          <h2 className="text-lg font-bold text-white">Sign In Required</h2>
          <p className="text-xs text-slate-400">
            Please sign in to access your role-specific dashboard, or explore the public Dispatches and System Status pages.
          </p>
          <button
            onClick={() => {
              setAuthModalMode('signin');
              setIsAuthModalOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Sign In to Dashboard
          </button>
        </div>
      );
    }

    switch (user.role) {
      case 'SUPER_ADMIN':
        return (
          <SuperAdminDashboard
            onNavigateStatus={() => setCurrentTab('status')}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        );
      case 'BUSINESS_OWNER':
        return (
          <BusinessOwnerDashboard
            onSelectDispatch={(id) => setSelectedDispatchId(id)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            onCreateDispatch={() => setIsCreateDispatchOpen(true)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        );
      case 'SENDER':
        return (
          <SenderDashboard
            onSelectDispatch={(id) => setSelectedDispatchId(id)}
            onCreateDispatch={() => setIsCreateDispatchOpen(true)}
            onOpenPublicLink={(token) => setPublicShareToken(token)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        );
      case 'RECEIVER':
        return (
          <ReceiverDashboard
            onSelectDispatch={(id) => setSelectedDispatchId(id)}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
        );
      default:
        return (
          <DispatchListPage
            onSelectDispatch={(id) => setSelectedDispatchId(id)}
            onCreateDispatch={() => setIsCreateDispatchOpen(true)}
            onOpenPublicLink={(t) => setPublicShareToken(t)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-20 md:pb-8 w-full max-w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedDispatchId(null);
          setCurrentTab(tab);
        }}
        onOpenAuth={() => {
          setAuthModalMode('signin');
          setIsAuthModalOpen(true);
        }}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* Sandbox Isolation & Notification Banners */}
      <NotificationBanner
        onOpenPhoneVerify={() => {
          setAuthModalMode('verifyPhone');
          setIsAuthModalOpen(true);
        }}
        onNavigateStatus={() => {
          setSelectedDispatchId(null);
          setCurrentTab('status');
        }}
      />

      {/* Main View Area - With max-w-full and overflow containment */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 max-w-full overflow-x-hidden">
        {selectedDispatchId ? (
          <DispatchDetailPage
            dispatchId={selectedDispatchId}
            onBack={() => setSelectedDispatchId(null)}
            onOpenPublicLink={(token) => setPublicShareToken(token)}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && renderDashboard()}
            {currentTab === 'dispatches' && (
              <DispatchListPage
                onSelectDispatch={(id) => setSelectedDispatchId(id)}
                onCreateDispatch={() => setIsCreateDispatchOpen(true)}
                onOpenPublicLink={(token) => setPublicShareToken(token)}
              />
            )}
            {currentTab === 'locations' && <LocationsPage />}
            {currentTab === 'partners' && (
              <PartnersPage
                onCreateDispatchWithPartner={(partnerId) => {
                  setIsCreateDispatchOpen(true);
                }}
              />
            )}
            {currentTab === 'recommendations' && (
              <RecommendationsView
                onCreateDispatchWithItem={(item) => {
                  setIsCreateDispatchOpen(true);
                }}
              />
            )}
            {currentTab === 'audit' && <AuditPage />}
            {currentTab === 'status' && <SystemStatusPage />}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedDispatchId(null);
          setCurrentTab(tab);
        }}
      />

      {/* In-app Notification Alerts Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectDispatch={(id) => {
          setSelectedDispatchId(id);
          setIsNotificationsOpen(false);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* User Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Create Dispatch Manifest Modal */}
      <CreateDispatchModal
        isOpen={isCreateDispatchOpen}
        onClose={() => setIsCreateDispatchOpen(false)}
        onSuccess={(createdId) => {
          setSelectedDispatchId(createdId);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
