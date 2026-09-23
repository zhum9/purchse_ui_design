import type { ExecutionScenario, ProcurementObjectType, PurchaseOrder } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';

export interface PurchaseOrderQuery { keyword?: string; status?: string; purchaseOrganization?: string }

export interface DirectOrderLineInput {
  id?: string;
  objectType: ProcurementObjectType;
  executionScenario: ExecutionScenario;
  content: string;
  materialCode?: string;
  materialGroup: string;
  specification?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  plannedDate: string;
  plant?: string;
  storageLocation?: string;
}

export interface DirectOrderUpsertInput {
  id?: string;
  supplier: string;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  orderDate: string;
  submit: boolean;
  items: DirectOrderLineInput[];
}

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

export const saveDirectPurchaseOrder = (input: DirectOrderUpsertInput) => apiClient<PurchaseOrder>(input.id ? `/api/purchase-orders/${input.id}` : '/api/purchase-orders', {
  method: input.id ? 'PUT' : 'POST', body: JSON.stringify(input),
});
