import type { ReactNode } from 'react';

const currentPermissions = new Set(['receipt:create', 'service:accept', 'return:create', 'reversal:create', 'sap:reconcile', 'config:view']);

export function PermissionGuard({ permission, children }: { permission: string; children: ReactNode }) {
  return currentPermissions.has(permission) ? children : null;
}
