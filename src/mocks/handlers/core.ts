import { http, HttpResponse, delay } from 'msw';
import { getExecutionFormSchema } from '@domain/execution-rule/schemas';
import { executionBlockReason, isOverdue } from '@domain/procurement/eligibility';
import { calculateLine, decimal } from '@domain/purchase-order/rules';
import { getLocalAttachment } from '@shared/api/localAttachments';
import type { OrderActionCommand, OrderSaveCommand } from '@domain/purchase-order/types';
import type { ExecutionEvent } from '@domain/procurement/types';
import { allExecutions, allOrders } from '../repository/projections';
import { readStore, transact, nextId, deduplicate } from '../repository/store';
import { sourceDraft } from '../repository/sources';
import { activeRevision, orderAction, saveOrder } from '../repository/orders';

const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });
export const safe = async (work: () => unknown | Promise<unknown>) => {
  try { await delay(120); return ok(await work()); }
  catch (error) { return HttpResponse.json({ success: false, data: null, message: error instanceof Error ? error.message : '业务处理失败，输入已保留。' }, { status: 409 }); }
};
export const coreHandlers = [
  http.get('*/api/order-drafts/source', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams;
    const kind = params.get('kind');
    if (kind !== 'PLAN_ORDER' && kind !== 'DEMAND_ORDER') throw new Error('不支持的来源类型。');
    return sourceDraft(readStore(), kind, (params.get('ids') ?? '').split(',').filter(Boolean));
  })),
  http.get('*/api/order-drafts', () => safe(() => readStore().orders)),
  http.post('*/api/order-drafts', ({ request }) => safe(async () => { const input = await request.json() as OrderSaveCommand; return transact((store) => saveOrder(store, input)); })),
  http.post('*/api/order-drafts/:id/actions', ({ request, params }) => safe(async () => { const input = await request.json() as OrderActionCommand; return transact((store) => orderAction(store, String(params.id), input)); })),
  http.post('*/api/order-drafts/:id/delivery-notes', ({ request, params }) => safe(async () => {
    const input = await request.json() as { requestKey: string; expectedRowVersion: number; revisionId: string; lineId: string; expectedArrivalDate?: string; note: string };
    return transact((store) => deduplicate(store, input.requestKey, input, () => {
      const order = store.orders.find((entry) => entry.id === params.id);
      if (!order || order.rowVersion !== input.expectedRowVersion || order.effectiveRevisionId !== input.revisionId) throw new Error('订单正式版本已变化，请刷新。');
      const line = activeRevision(order).content.lines.find((entry) => entry.lineId === input.lineId);
      if (!line || line.productKind !== 'GOODS') throw new Error('到货备注仅适用于当前订单货物行。');
      order.deliveryNotes.push({ id: nextId(store), revisionId: input.revisionId, lineId: input.lineId, expectedArrivalDate: input.expectedArrivalDate, note: input.note, occurredAt: new Date().toISOString(), actorId: '801' });
      order.rowVersion++;
      return order;
    }));
  })),
  http.get('*/api/purchase-orders', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams, keyword = (params.get('keyword') ?? '').toLowerCase(), status = params.get('status') ?? 'ALL', org = params.get('purchaseOrganization');
    const items = allOrders(readStore()).filter((order) => {
      const match = status === 'ALL' || order.revisionStatus === status || (status === 'PENDING' && order.status.approvalStatus === 'PENDING') || (status === 'OPEN' && order.status.documentStatus === 'ACTIVE' && order.status.fulfillmentStatus === 'OPEN') || (['PARTIAL', 'COMPLETE'].includes(status) && order.status.fulfillmentStatus === status) || (status === 'EXCEPTION' && ['FAILED', 'UNKNOWN'].includes(order.status.sapSyncStatus));
      return match && (!keyword || [order.businessOrderNo, order.sapPoNo, order.supplier].some((text) => text.toLowerCase().includes(keyword))) && (!org || order.purchaseOrganization === org);
    });
    return { items, total: items.length, page: 1, pageSize: 20 };
  })),
  http.get('*/api/purchase-orders/:id', ({ params }) => safe(() => { const order = allOrders(readStore()).find((entry) => entry.id === params.id); if (!order) throw new Error('未找到采购订单。'); return order; })),
  http.post('*/api/purchase-orders', () => safe(() => { throw new Error('请使用统一订单编制页面，旧建单接口已停用。'); })),
  http.put('*/api/purchase-orders/:id', () => safe(() => { throw new Error('正式版本不可覆盖，请使用统一草稿或变更命令。'); })),
  http.post('*/api/procurement-plans/:id/purchase-orders', () => safe(() => { throw new Error('请从计划进入统一订单编制，确认价格和本次转单量后提交。'); })),
  http.get('*/api/fulfillment/items', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams, keyword = (params.get('keyword') ?? '').toLowerCase(), scenario = params.get('scenario'), status = params.get('status') ?? 'ALL', org = params.get('purchaseOrganization');
    const items = allOrders(readStore()).flatMap((order) => order.items).filter((item) =>
      (!keyword || [item.sapPoNo, item.businessOrderNo ?? '', item.supplier, item.content].some((text) => text.toLowerCase().includes(keyword))) &&
      (!scenario || scenario === 'ALL' || item.executionScenario === scenario) && (!org || org === item.purchaseOrganization) &&
      (status === 'ALL' || (status === 'OVERDUE' && isOverdue(item)) || (status === 'EXCEPTION' && Boolean(executionBlockReason(item))) || (item.status.fulfillmentStatus === status && !executionBlockReason(item))));
    return { items, total: items.length, page: 1, pageSize: 20 };
  })),
  http.get('*/api/execution-events', ({ request }) => safe(() => { const poId = new URL(request.url).searchParams.get('poId'); return allExecutions(readStore()).filter((event) => !poId || event.poId === poId); })),
  http.post('*/api/executions', ({ request }) => safe(async () => {
    const input = await request.json() as { requestKey: string; itemId: string; orderRevisionId?: string; type?: string; values: Record<string, unknown> };
    const attachments = input.values?.attachments as Array<{ status?: string; response?: { attachmentId?: string } }> | undefined;
    if (attachments) for (const attachment of attachments) {
      if (attachment.status !== 'done' || !attachment.response?.attachmentId || !await getLocalAttachment(attachment.response.attachmentId)) throw new Error('附件尚未成功保存到本机，请重新选择附件。');
    }
    return transact((store) => deduplicate(store, input.requestKey, input, () => {
      if (input.type) throw new Error('该历史记录的库存/发票依赖尚未核验，不能模拟无条件退货或冲销。请先完成依赖适配。');
      const item = allOrders(store).flatMap((order) => order.items).find((entry) => entry.id === input.itemId);
      if (!item) throw new Error('订单行不存在。');
      const blocked = executionBlockReason(item);
      if (blocked) throw new Error(blocked);
      if (item.orderRevisionId && item.orderRevisionId !== input.orderRevisionId) throw new Error('订单正式版本已变化，请刷新后重新确认。');
      const schema = getExecutionFormSchema(item);
      const values = Object.fromEntries(schema.fields.filter((field) => !['HIDDEN', 'DISPLAY', 'AUTO'].includes(field.state)).map((field) => [field.key, input.values[field.key]]));
      for (const field of schema.fields.filter((entry) => entry.state === 'REQUIRED')) {
        const value = values[field.key];
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) throw new Error(`请填写${field.label}。`);
      }
      if (values.acceptanceResult && values.acceptanceResult !== 'PASS') throw new Error('验收不通过不能累计履约；本期异常登记尚未接入，请保留材料。');
      const money = item.unit === '元';
      const value = Number(money ? values.confirmedAmount : values.quantity);
      if (!Number.isFinite(value) || value <= 0 || value > (item.overallLimit ?? item.orderedValue) - item.executedValue - (item.reservedValue ?? 0)) throw new Error('本次数量/金额必须大于0且不超过最新可执行余额。');
      if (Array.isArray(values.servicePeriod) && (values.servicePeriod.length !== 2 || String(values.servicePeriod[1]) < String(values.servicePeriod[0]))) throw new Error('请检查服务期间。');
      const order = store.orders.find((entry) => entry.id === item.poId);
      const line = order && activeRevision(order).content.lines.find((entry) => entry.lineId === item.id);
      if (line?.productKind === 'SERVICE' && line.pricingMethod === 'UNIT_PRICE') {
        if (Array.isArray(values.servicePeriod) && (String(values.servicePeriod[0]) < line.serviceStart || String(values.servicePeriod[1]) > line.serviceEnd)) throw new Error(`本次服务期间必须在订单约定期间 ${line.serviceStart} 至 ${line.serviceEnd} 内。`);
        const quantity = Number(values.completedQuantity);
        const executedQty = store.executions.filter((event) => event.itemId === item.id).reduce((sum, event) => sum.add(event.quantity ?? 0), decimal(0));
        if (!Number.isFinite(quantity) || quantity <= 0 || executedQty.add(quantity).gt(line.orderedQty ?? 0)) throw new Error('本次服务数量超出订单剩余工作量。');
        const amount = calculateLine({ ...line, orderedQty: String(quantity) });
        if (!amount || !decimal(amount.gross).eq(value)) throw new Error(`按量服务本次数量应对应含税金额 ${amount?.gross ?? '待确认'} 元，请检查数量和金额。`);
      }
      const id = nextId(store);
      const event: ExecutionEvent = { id, type: item.executionScenario === 'SERVICE' ? 'SERVICE_ACCEPTANCE' : item.executionScenario === 'SERVICE_LIMIT' ? 'LIMIT_CONFIRMATION' : 'GOODS_RECEIPT', poId: item.poId, itemId: item.id, businessDocumentNo: `EX${id}`, title: item.content, occurredAt: new Date().toISOString(), quantity: money ? values.completedQuantity ? Number(values.completedQuantity) : undefined : value, amount: money ? value : undefined, unit: money ? item.commercialUnit : item.unit, operator: '张敏', status: 'EFFECTIVE', sapStatus: 'WAITING', requestKey: input.requestKey, inputSnapshot: values };
      store.executions.unshift(event);
      return { businessDocumentNo: event.businessDocumentNo, sapStatus: 'WAITING' };
    }));
  })),
  http.post('*/api/sap/executions/:id/reconcile', () => safe(() => ({ status: 'UNKNOWN', message: '未连接 SAP 查询接口，暂无可验证的执行证据；状态保持待核对，不自动转成功。' }))),
];
