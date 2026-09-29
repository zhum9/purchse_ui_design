import { apiClient } from '@shared/api/client';
import type { OrderActionCommand, OrderDocument, OrderDraft, OrderSaveCommand } from '@domain/purchase-order/types';
export const orderDraftKeys = {
  all: ['order-drafts'] as const,
  source: (kind: string, ids: string) => ['order-drafts', 'source', kind, ids] as const,
};
export const getOrderSourceDraft = (kind: string, ids: string) => apiClient<OrderDraft>(`/api/order-drafts/source?kind=${kind}&ids=${encodeURIComponent(ids)}`);
export const saveOrderDraft = (input: OrderSaveCommand) => apiClient<OrderDocument>('/api/order-drafts', { method: 'POST', body: JSON.stringify(input) });
export const executeOrderAction = (id: string, command: OrderActionCommand) => apiClient<OrderDocument>(`/api/order-drafts/${id}/actions`, { method: 'POST', body: JSON.stringify(command) });
export const getCoreOrders = () => apiClient<OrderDocument[]>('/api/order-drafts');
export const saveDeliveryNote = (id: string, input: { lineId: string; revisionId: string; expectedArrivalDate?: string; note: string; expectedRowVersion: number; requestKey: string }) => apiClient<OrderDocument>(`/api/order-drafts/${id}/delivery-notes`, { method: 'POST', body: JSON.stringify(input) });
