import { delay, http, HttpResponse } from 'msw';
import { executionEvents } from '../fixtures/executionEvents';
import { purchaseOrderItems, purchaseOrders } from '../fixtures/purchaseOrders';
import { sapExecutions } from '../fixtures/sapExecutions';

const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });

export const handlers = [
  http.get('/api/purchase-orders', async ({ request }) => {
    await delay(280);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'ALL';
    const purchaseOrganization = url.searchParams.get('purchaseOrganization') ?? '';
    const items = purchaseOrders.filter((order) => {
      const matchesKeyword = !keyword || [order.sapPoNo, order.businessOrderNo, order.supplier].some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = status === 'ALL' || order.status.fulfillmentStatus === status || (status === 'EXCEPTION' && ['FAILED', 'UNKNOWN'].includes(order.status.sapSyncStatus));
      const matchesOrganization = !purchaseOrganization || order.purchaseOrganization === purchaseOrganization;
      return matchesKeyword && matchesStatus && matchesOrganization;
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.get('/api/purchase-orders/:id', async ({ params }) => {
    await delay(220);
    const order = purchaseOrders.find((item) => item.id === params.id);
    return order ? ok(order) : HttpResponse.json({ success: false, data: null, message: '未找到采购订单。' }, { status: 404 });
  }),
  http.get('/api/fulfillment/items', async ({ request }) => {
    await delay(320);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const scenario = url.searchParams.get('scenario') ?? 'ALL';
    const status = url.searchParams.get('status') ?? 'ALL';
    const purchaseOrganization = url.searchParams.get('purchaseOrganization') ?? '';
    const items = purchaseOrderItems.filter((item) => {
      const matchesKeyword = !keyword || [item.sapPoNo, item.supplier, item.content].some((value) => value.toLowerCase().includes(keyword));
      const matchesScenario = scenario === 'ALL' || item.executionScenario === scenario;
      const matchesOrganization = !purchaseOrganization || item.purchaseOrganization === purchaseOrganization;
      const isException = ['FAILED', 'UNKNOWN'].includes(item.status.sapSyncStatus) || item.status.fulfillmentStatus === 'OVERDUE';
      const matchesStatus = status === 'ALL' || item.status.fulfillmentStatus === status || (status === 'EXCEPTION' && isException);
      return matchesKeyword && matchesScenario && matchesOrganization && matchesStatus;
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.get('/api/execution-events', async ({ request }) => {
    await delay(180);
    const poId = new URL(request.url).searchParams.get('poId');
    return ok(poId ? executionEvents.filter((event) => event.poId === poId) : executionEvents);
  }),
  http.get('/api/sap/executions', async () => {
    await delay(260);
    return ok({ items: sapExecutions, page: 1, pageSize: 20, total: sapExecutions.length });
  }),
  http.post('/api/executions', async () => {
    await delay(650);
    return ok({ businessDocumentNo: `EX${Date.now()}`, sapStatus: 'PROCESSING' });
  }),
  http.post('/api/sap/executions/:id/reconcile', async ({ params }) => {
    await delay(700);
    return ok({ id: params.id, status: 'SUCCESS', sapDocumentNo: '5000123999' });
  }),
];
