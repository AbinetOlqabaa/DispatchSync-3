import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Trash2,
  ShieldCheck,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  CreditCard,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../services/api.js';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, removeProfilePhoto } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // OTP state for step-up
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Invalid format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Profile photo size exceeds 2MB limit. Please select a smaller image.');
      return;
    }

    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Url = reader.result as string;
        await updateProfile({ avatarUrl: base64Url });
      } catch (err: any) {
        setPhotoError(err.message || 'Failed to upload profile photo.');
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file.');
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      await removeProfilePhoto();
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to remove profile photo.');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdatingName(true);
    setNameSuccess(false);
    try {
      await updateProfile({ name: name.trim() });
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to update name.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  // Request Step-Up OTP
  const handleRequestOtp = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password first.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsRequestingOtp(true);
    try {
      const challenge = await api.initiatePasswordChangeOtp();
      setOtpChallengeId(challenge.challengeId);
      if (challenge.simulatedCode) {
        setSimulatedCode(challenge.simulatedCode);
        setOtpCode(challenge.simulatedCode);
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to request step-up verification code.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Submit Password Change with OTP
  const handleSubmitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpChallengeId || !otpCode.trim()) {
      setPasswordError('Please provide the 6-digit verification code.');
      return;
    }

    setIsChangingPassword(true);
    setPasswordError(null);
    try {
      const res = await api.changePasswordWithOtp(
        currentPassword,
        newPassword,
        otpChallengeId,
        otpCode.trim()
      );
      setPasswordSuccess(res.message || 'Password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOtpChallengeId(null);
      setOtpCode('');
      setSimulatedCode(null);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="profile-modal-title" className="text-lg font-bold tracking-tight text-white leading-tight">
                User Profile & Identity
              </h2>
              <p className="text-xs text-slate-400">Verified credentials, photo, and security controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile modal"
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 scrollbar-thin">
          {photoError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{photoError}</span>
            </div>
          )}

        {/* Profile Avatar & Quick Stats */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 mb-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative group shrink-0">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40 shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-700 to-sky-600 flex items-center justify-center text-white text-xl font-bold border-2 border-indigo-500/30 shadow-md">
                {initials}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-base font-semibold text-white">{user.name}</h3>
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
              <Building className="w-3 h-3 text-slate-500" />
              <span>{user.businessName}</span>
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                {user.role}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                <span>Verified Account</span>
              </span>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="text-xs px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3 h-3" />
                <span>{user.avatarUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoLoading}
                  className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-medium flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Identity & Fayda Verification Badges */}
        <div className="space-y-3 mb-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verified Identity & Credentials
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
            {/* Phone */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                <span>Mobile Number:</span>
              </span>
              <span className="font-mono font-medium text-slate-200">
                {user.maskedPhone || user.phoneNumber}
              </span>
            </div>

            {/* Fayda FAN */}
            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                <span>Fayda Account (FAN):</span>
              </span>
              <span className="font-mono font-medium text-sky-300">
                {user.maskedFan || '•••• •••• •••• 4444'}
              </span>
            </div>

            {/* Fayda FIN */}
            <div className="flex items-center justify-between text-xs border-t border-slate-800/80 pt-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Fayda Identification (FIN):</span>
              </span>
              <span className="font-mono font-medium text-emerald-300">
                {user.maskedFin || '•••• •••• 3333'}
              </span>
            </div>

            {/* Fayda Verification Status Chip */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">National e-ID Verification:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                <span>Fayda Verified (Simulation / Dev Mode)</span>
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Sensitive national ID numbers (FAN/FIN) are strictly masked and encrypted. Raw values are never returned to clients or displayed on dashboard manifest cards.
          </p>
        </div>

        {/* Edit Full Name Form */}
        <form onSubmit={handleSaveName} className="mb-6 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Display Name
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isUpdatingName || name === user.name}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-40"
            >
              {isUpdatingName ? 'Saving...' : 'Save'}
            </button>
          </div>
          {nameSuccess && (
            <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Name updated successfully!</span>
            </p>
          )}
        </form>

        {/* Change Password Section (with Step-Up OTP) */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">Security & Password</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowPasswordSection(!showPasswordSection);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              {showPasswordSection ? 'Hide' : 'Change Password'}
            </button>
          </div>

          {showPasswordSection && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
              {passwordError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {!otpChallengeId ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        New Password (min 8 chars)
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={isRequestingOtp || !currentPassword || newPassword.length < 8}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isRequestingOtp ? 'Dispatching Step-Up OTP...' : 'Request Step-Up OTP Verification'}</span>
                  </button>
                </>
              ) : (
                <form onSubmit={handleSubmitPasswordChange} className="space-y-3">
                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs">
                    <p className="font-semibold text-sky-200">Step-Up Verification Code Dispatched</p>
                    <p className="text-slate-300 mt-1">
                      An OTP has been sent to your verified mobile number <span className="font-mono text-white">{user.maskedPhone || user.phoneNumber}</span>.
                    </p>
                    {simulatedCode && (
                      <div className="mt-2 p-1.5 rounded bg-sky-950/80 border border-sky-700/50 flex items-center justify-between">
                        <span className="text-[10px] text-sky-300 font-mono">Dev Mode Simulated Code:</span>
                        <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                          {simulatedCode}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpChallengeId(null)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isChangingPassword || otpCode.length < 6}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50"
                    >
                      {isChangingPassword ? 'Verifying...' : 'Confirm Update'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
