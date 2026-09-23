import type { ExecutionFormValues } from '@domain/execution-rule/types';
import type { ExecutionEvent, PurchaseOrderItem, SapSyncStatus } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';

export interface FulfillmentQuery {
  keyword?: string;
  scenario?: string;
  status?: string;
  purchaseOrganization?: string;
}

export const fulfillmentKeys = {
  all: ['fulfillment'] as const,
  list: (query: FulfillmentQuery) => [...fulfillmentKeys.all, 'list', query] as const,
  events: (poId?: string) => [...fulfillmentKeys.all, 'events', poId ?? 'all'] as const,
};

export const getFulfillmentItems = (query: FulfillmentQuery) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => value && params.set(key, value));
  return apiClient<PageResult<PurchaseOrderItem>>(`/api/fulfillment/items?${params}`);
};

export const getExecutionEvents = (poId?: string) =>
  apiClient<ExecutionEvent[]>(`/api/execution-events${poId ? `?poId=${poId}` : ''}`);

export const submitExecution = (item: PurchaseOrderItem, values: ExecutionFormValues) =>
  apiClient<{ businessDocumentNo: string; sapStatus: SapSyncStatus }>('/api/executions', {
    method: 'POST', body: JSON.stringify({ itemId: item.id, scenario: item.executionScenario, values }),
  });
