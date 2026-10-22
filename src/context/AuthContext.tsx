import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { sandboxAdapter } from '../services/local-adapter';
import { AuthCredentials, RegisterPayload } from '../services/types';
import { requestServerBootstrap } from '../services/api-client';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (credentials: AuthCredentials) => Promise<User>;
  signUp: (payload: RegisterPayload) => Promise<User>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyPhoneOtp: (otp: string) => Promise<{ success: boolean; message: string }>;
  bootstrapSuperAdmin: (secretToken: string, payload: { email: string; fullName: string; password: string }) => Promise<User>;
  switchDemoRole: (role: UserRole) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      try {
        const current = await sandboxAdapter.getCurrentUser();
        setUser(current);
      } catch (err: unknown) {
        console.error('Failed to restore auth session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    initAuth();
  }, []);

  const clearError = () => setError(null);

  const signIn = async (credentials: AuthCredentials): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticated = await sandboxAdapter.signIn(credentials);
      setUser(authenticated);
      return authenticated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (payload: RegisterPayload): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await sandboxAdapter.signUp(payload);
      setUser(created);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await sandboxAdapter.signOut();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    return sandboxAdapter.requestPasswordReset(email);
  };

  const verifyPhoneOtp = async (otp: string) => {
    if (!user) throw new Error('No user is currently signed in to verify.');
    const result = await sandboxAdapter.verifyPhoneOtp(user.phoneNumber, otp);
    setUser(prev => prev ? { ...prev, phoneVerified: true, status: 'ACTIVE' } : null);
    return result;
  };

  const bootstrapSuperAdmin = async (
    secretToken: string,
    payload: { email: string; fullName: string; password: string }
  ): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      // First attempt server-side verification if server available
      try {
        await requestServerBootstrap({
          secretToken,
          email: payload.email,
          fullName: payload.fullName
        });
      } catch (serverErr) {
        console.warn('Server bootstrap sync skipped/offline, continuing with local adapter:', serverErr);
      }

      const adminUser = await sandboxAdapter.bootstrapSuperAdmin(secretToken, payload);
      setUser(adminUser);
      return adminUser;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bootstrap failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const switchDemoRole = async (role: UserRole): Promise<User> => {
    setIsLoading(true);
    setError(null);
    try {
      const switched = await sandboxAdapter.switchDemoRole(role);
      setUser(switched);
      return switched;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Role switch failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        clearError,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        verifyPhoneOtp,
        bootstrapSuperAdmin,
        switchDemoRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
