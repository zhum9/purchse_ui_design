import { http, HttpResponse } from 'msw';
import { coreHandlers } from './core';
import { planningHandlers } from './planning';
import { reversalHandlers } from './reversals';
import { sapExecutions } from '../fixtures/sapExecutions';
import { readStore } from '../repository/store';
import { allOrders } from '../repository/projections';
import type { SapExecution } from '@domain/procurement/types';

export const handlers = [
  ...coreHandlers,
  ...planningHandlers,
  ...reversalHandlers,
  http.get('*/api/sap/executions', () => {
    const store = readStore();
    const orders = allOrders(store);
    const created: SapExecution[] = store.executions.map((event) => ({ id: event.id, businessDocumentNo: event.businessDocumentNo, businessAction: event.type, sapPoNo: orders.find((order) => order.id === event.poId)?.sapPoNo ?? '', itemNo: orders.flatMap((order) => order.items).find((item) => item.id === event.itemId)?.itemNo ?? '', executedAt: event.occurredAt, status: event.sapStatus, requestId: event.requestKey ?? event.id, canRetry: false, errorSummary: '原型登记业务事实，尚未连接真实 SAP 发送接口。' }));
    const items = [...created, ...sapExecutions];
    return HttpResponse.json({ success: true, data: { items, total: items.length, page: 1, pageSize: 20 } });
  }),
];
