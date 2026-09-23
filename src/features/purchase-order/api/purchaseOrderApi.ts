import type { PurchaseOrder } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';

export interface PurchaseOrderQuery { keyword?: string; status?: string; purchaseOrganization?: string }

export const purchaseOrderKeys = {
  all: ['purchase-orders'] as const,
  list: (query: PurchaseOrderQuery) => [...purchaseOrderKeys.all, 'list', query] as const,
  detail: (id: string) => [...purchaseOrderKeys.all, 'detail', id] as const,
};

export const getPurchaseOrders = (query: PurchaseOrderQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => value && params.set(key, value));
  return apiClient<PageResult<PurchaseOrder>>(`/api/purchase-orders?${params}`);
};

export const getPurchaseOrder = (id: string) => apiClient<PurchaseOrder>(`/api/purchase-orders/${id}`);
