import type { ExecutionFormValues } from '@domain/execution-rule/types';
import type { ExecutionEvent, PurchaseOrderItem, SapSyncStatus } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';
import dayjs from 'dayjs';

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

export const submitExecution = (item: PurchaseOrderItem, values: ExecutionFormValues, requestKey: string) =>
  apiClient<{ businessDocumentNo: string; sapStatus: SapSyncStatus }>('/api/executions', {
    method: 'POST', body: JSON.stringify({ requestKey, orderRevisionId: item.orderRevisionId, itemId: item.id, scenario: item.executionScenario, values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, dayjs.isDayjs(value) ? value.format('YYYY-MM-DD') : Array.isArray(value) ? value.map((entry) => dayjs.isDayjs(entry) ? entry.format('YYYY-MM-DD') : entry) : value])) }),
  });
