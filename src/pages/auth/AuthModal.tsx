import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { UserRole } from '../../types/dispatch.js';
import { api } from '../../services/api.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'register' | 'forgot' | 'verifyPhone';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const { login, register, verifyPhone, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot' | 'verifyPhone'>(initialMode);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regBusiness, setRegBusiness] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('BUSINESS_OWNER');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenPreview, setResetTokenPreview] = useState<string | null>(null);
  const [newPasswordAfterReset, setNewPasswordAfterReset] = useState('');

  // Phone verification state
  const [phoneCode, setPhoneCode] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate submission

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await login(signInEmail.trim(), signInPassword);
      setSuccessMessage('Successfully signed in.');
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhone.trim(),
        businessName: regBusiness.trim(),
        role: regRole,
        password: regPassword,
      });
      setSuccessMessage('Account created successfully! Welcome to DispatchBridge.');
      setMode('verifyPhone');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const res = await api.requestPasswordReset(forgotEmail.trim());
      if (res.resetTokenPreview) {
        setResetTokenPreview(res.resetTokenPreview);
        setSuccessMessage('Password reset requested! In this dev sandbox, your token is shown below.');
      } else {
        setSuccessMessage('If an account exists with this email, a reset link was sent.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTokenPreview || isLoading) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await api.resetPassword(resetTokenPreview, newPasswordAfterReset);
      setSuccessMessage('Password updated successfully! Please sign in with your new password.');
      setMode('signin');
      setResetTokenPreview(null);
      setNewPasswordAfterReset('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      await verifyPhone(phoneCode.trim());
      setSuccessMessage('Phone number verified successfully!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoAccount = (email: string) => {
    setSignInEmail(email);
    setSignInPassword('Password123!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 my-8 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Headers */}
        {mode !== 'verifyPhone' && (
          <div className="flex border-b border-slate-800 mb-6">
            <button
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Register Business
            </button>
          </div>
        )}

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* SIGN IN FORM */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showSignInPassword ? 'text' : 'password'}
                  required
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                >
                  {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick pre-fill for sandbox test accounts */}
            <div className="pt-4 border-t border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">Sandbox Test Accounts:</span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('owner@apexsupply.com')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-300 border border-slate-700 cursor-pointer"
                >
                  Owner (Apex)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('dispatcher@apexsupply.com')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-blue-300 border border-slate-700 cursor-pointer"
                >
                  Sender (Carlos)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('store@metroretail.com')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer"
                >
                  Receiver (Metro)
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@dispatchbridge.internal')}
                  className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer"
                >
                  Super Admin
                </button>
              </div>
            </div>
          </form>
        )}

        {/* REGISTRATION FORM */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Sarah Jenkins"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="sarah@corp.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+1 555-019-2831"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company / Business Name</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={regBusiness}
                  onChange={(e) => setRegBusiness(e.target.value)}
                  placeholder="Pacific Freight & Warehousing Ltd"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Role</label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as UserRole)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="BUSINESS_OWNER">Business Owner (Full management & reports)</option>
                <option value="SENDER">Dispatcher / Sender (Create & send dispatches)</option>
                <option value="RECEIVER">Receiver / Partner (Acknowledge & reconcile deliveries)</option>
              </select>
            </div>

            {/* Passwords with visibility and confirmation match */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Password (min 8)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-slate-800 border rounded-xl pl-8 pr-8 py-2 text-sm text-white focus:outline-none ${
                      regConfirmPassword && regPassword === regConfirmPassword
                        ? 'border-emerald-500'
                        : regConfirmPassword
                        ? 'border-rose-500'
                        : 'border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {regConfirmPassword && regPassword !== regConfirmPassword && (
              <p className="text-[11px] text-rose-400">Passwords do not match yet.</p>
            )}

            <button
              type="submit"
              disabled={isLoading || (regConfirmPassword.length > 0 && regPassword !== regConfirmPassword)}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer mt-3"
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Reset Account Password</h3>
            </div>
            <p className="text-xs text-slate-400">
              Enter your account email. We will generate a secure one-time reset token.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl"
              >
                {isLoading ? 'Generating token...' : 'Request Reset Token'}
              </button>
            </form>

            {resetTokenPreview && (
              <div className="p-3 bg-slate-800/90 border border-indigo-700/60 rounded-xl space-y-3 mt-4">
                <div className="text-xs text-indigo-300 font-semibold">Simulated Reset Token Generated:</div>
                <div className="font-mono text-xs bg-slate-900 p-2 rounded text-slate-300 select-all break-all">
                  {resetTokenPreview}
                </div>
                <form onSubmit={handleExecuteReset} className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Set New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPasswordAfterReset}
                    onChange={(e) => setNewPasswordAfterReset(e.target.value)}
                    placeholder="New password (min 8 chars)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                  >
                    Confirm & Update Password
                  </button>
                </form>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs text-slate-400 hover:text-white underline block text-center mt-3 cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* PHONE VERIFICATION MODAL / FORM */}
        {mode === 'verifyPhone' && (
          <form onSubmit={handleVerifyPhone} className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Verify Phone Number</h3>
            </div>
            <p className="text-xs text-slate-400">
              We simulated sending an SMS 6-digit confirmation code to your phone. In this sandbox environment, check your server console or enter any code generated by the simulator (or enter{' '}
              <span className="font-mono text-indigo-300">code displayed in server log</span>).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={phoneCode}
                onChange={(e) => setPhoneCode(e.target.value)}
                placeholder="123456"
                className="w-full tracking-widest text-center text-lg font-mono bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneCode.length < 6}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
            >
              {isLoading ? 'Verifying...' : 'Verify Phone & Continue'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline block text-center mt-2 cursor-pointer"
            >
              Skip verification for now
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
