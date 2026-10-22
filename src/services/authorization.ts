import { User, UserRole } from '../types';
import { Permission, hasPermission } from '../domain/auth-rules';

export type AppView =
  | 'DASHBOARD'
  | 'DISPATCHES'
  | 'CREATE_DISPATCH'
  | 'DISPATCH_DETAILS'
  | 'PARTNERS'
  | 'AUDIT_LOGS'
  | 'SYSTEM_CONFIG';

interface RoutePolicy {
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  label: string;
}

export const ROUTE_POLICIES: Record<AppView, RoutePolicy> = {
  DASHBOARD: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER', 'RECEIVER'],
    label: 'Dashboard'
  },
  DISPATCHES: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER', 'RECEIVER'],
    requiredPermission: 'VIEW_DISPATCHES',
    label: 'Dispatch Ledger'
  },
  CREATE_DISPATCH: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER'],
    requiredPermission: 'CREATE_DISPATCH',
    label: 'New Dispatch'
  },
  DISPATCH_DETAILS: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER', 'RECEIVER'],
    label: 'Dispatch Details'
  },
  PARTNERS: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    requiredPermission: 'MANAGE_PARTNERS',
    label: 'Partners & Recipients'
  },
  AUDIT_LOGS: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    requiredPermission: 'VIEW_AUDIT_LOGS',
    label: 'Audit Trail & Hashes'
  },
  SYSTEM_CONFIG: {
    allowedRoles: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'SENDER', 'RECEIVER'],
    label: 'System Status & Setup'
  }
};

export function canAccessView(user: User | null, view: AppView): boolean {
  if (!user) return false;
  const policy = ROUTE_POLICIES[view];
  if (!policy) return false;

  if (!policy.allowedRoles.includes(user.role)) {
    return false;
  }

  if (policy.requiredPermission && !hasPermission(user.role, policy.requiredPermission)) {
    return false;
  }

  return true;
}
