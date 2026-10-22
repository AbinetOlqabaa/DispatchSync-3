import { UserRole } from '../types';

export interface PasswordValidationResult {
  isValid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const errors: string[] = [];
  if (!hasMinLength) errors.push('Password must be at least 8 characters long.');
  if (!hasUppercase) errors.push('Password must contain at least one uppercase letter.');
  if (!hasLowercase) errors.push('Password must contain at least one lowercase letter.');
  if (!hasNumber) errors.push('Password must contain at least one number.');
  if (!hasSpecialChar) errors.push('Password must contain at least one special character.');

  return {
    isValid: errors.length === 0,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    errors
  };
}

export function validatePhoneNumber(phone: string): { isValid: boolean; formatted: string; error?: string } {
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  // Accepts international or local format: e.g. +1234567890 or 10-15 digits
  const regex = /^\+?[1-9]\d{8,14}$/;
  if (!regex.test(cleaned)) {
    return {
      isValid: false,
      formatted: phone,
      error: 'Please enter a valid phone number (e.g., +1 555-0199 or 10-15 digits with country code).'
    };
  }
  return {
    isValid: true,
    formatted: cleaned.startsWith('+') ? cleaned : `+${cleaned}`
  };
}

export type Permission =
  | 'VIEW_ALL_BUSINESSES'
  | 'MANAGE_SYSTEM'
  | 'VIEW_AUDIT_LOGS'
  | 'CREATE_DISPATCH'
  | 'EDIT_DISPATCH'
  | 'VIEW_DISPATCHES'
  | 'RECEIVE_DISPATCH'
  | 'RECONCILE_DISPATCH'
  | 'MANAGE_PARTNERS';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'VIEW_ALL_BUSINESSES',
    'MANAGE_SYSTEM',
    'VIEW_AUDIT_LOGS',
    'CREATE_DISPATCH',
    'EDIT_DISPATCH',
    'VIEW_DISPATCHES',
    'RECEIVE_DISPATCH',
    'RECONCILE_DISPATCH',
    'MANAGE_PARTNERS'
  ],
  BUSINESS_OWNER: [
    'CREATE_DISPATCH',
    'EDIT_DISPATCH',
    'VIEW_DISPATCHES',
    'RECEIVE_DISPATCH',
    'RECONCILE_DISPATCH',
    'MANAGE_PARTNERS',
    'VIEW_AUDIT_LOGS'
  ],
  SENDER: [
    'CREATE_DISPATCH',
    'VIEW_DISPATCHES',
    'EDIT_DISPATCH'
  ],
  RECEIVER: [
    'VIEW_DISPATCHES',
    'RECEIVE_DISPATCH',
    'RECONCILE_DISPATCH'
  ]
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
