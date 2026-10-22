import React, { createContext, useContext, useEffect, useState } from 'react';
import { NotificationItem, User, UserRole } from '../types/dispatch.js';
import { api } from '../services/api.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  notifications: NotificationItem[];
  unreadNotifsCount: number;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  verifyPhone: (code: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  switchBusiness: (businessId: string) => Promise<void>;
  quickLoginDemoRole: (role: UserRole) => Promise<void>;
  signIn: (emailOrPayload: any, maybePassword?: string) => Promise<void>;
  signUp: (payload: any) => Promise<void>;
  signOut: () => void;
  switchDemoRole: (role: any) => Promise<void>;
  verifyPhoneOtp: (code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; resetTokenPreview?: string }>;
  bootstrapSuperAdmin: (secret: string, payload: any) => Promise<{ success: boolean; user: User }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(api.getCurrentUser());
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchNotifs = async () => {
    if (api.getToken()) {
      try {
        const notifs = await api.getNotifications();
        setNotifications(notifs);
      } catch {
        // Silently catch
      }
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (api.getToken()) {
        try {
          const profile = await api.getProfile();
          setUser(profile);
          await fetchNotifs();
        } catch {
          api.clearSession();
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (emailOrPayload: any, maybePassword?: string) => {
    let email = emailOrPayload;
    let password = maybePassword;
    if (typeof emailOrPayload === 'object' && emailOrPayload !== null) {
      email = emailOrPayload.email;
      password = emailOrPayload.password;
    }
    const res = await api.login(email, password || '');
    setUser(res.user);
    setToken(res.token);
    await fetchNotifs();
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    setUser(res.user);
    setToken(res.token);
    await fetchNotifs();
  };

  const logout = () => {
    api.clearSession();
    setUser(null);
    setToken(null);
    setNotifications([]);
  };

  const verifyPhone = async (code: string) => {
    await api.verifyPhone(code);
    if (user) {
      setUser({ ...user, phoneVerified: true });
    }
  };

  const refreshProfile = async () => {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {
      // Ignored
    }
  };

  const refreshNotifications = async () => {
    await fetchNotifs();
  };

  const markNotificationAsRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
    );
  };

  const markAllNotificationsAsRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
    );
  };

  const switchBusiness = async (businessId: string) => {
    const updated = await api.switchActiveBusiness(businessId);
    setUser(updated);
    await fetchNotifs();
  };

  const quickLoginDemoRole = async (role: UserRole) => {
    const roleCreds: Record<UserRole, { email: string }> = {
      BUSINESS_OWNER: { email: 'owner@apexsupply.com' },
      SENDER: { email: 'dispatcher@apexsupply.com' },
      RECEIVER: { email: 'store@metroretail.com' },
      SUPER_ADMIN: { email: 'admin@dispatchbridge.internal' },
    };

    const target = roleCreds[role];
    if (target) {
      await login(target.email, 'Password123!');
    }
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const requestPasswordReset = async (email: string) => {
    return api.requestPasswordReset(email);
  };

  const bootstrapSuperAdmin = async (secret: string, payload: any) => {
    return api.bootstrapSuperAdmin({ bootstrapSecret: secret, ...payload });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        notifications,
        unreadNotifsCount,
        login,
        register,
        logout,
        verifyPhone,
        refreshProfile,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        switchBusiness,
        quickLoginDemoRole,
        signIn: login,
        signUp: register,
        signOut: logout,
        switchDemoRole: quickLoginDemoRole,
        verifyPhoneOtp: verifyPhone,
        requestPasswordReset,
        bootstrapSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
