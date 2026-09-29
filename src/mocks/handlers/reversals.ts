import { http } from 'msw';
import { reverseContext, type ReverseAction } from '@domain/procurement/reversals';
import { allExecutions } from '../repository/projections';
import { deduplicate, nextId, readStore, transact } from '../repository/store';
import { safe } from './core';

export const reversalHandlers = [
  http.get('*/api/executions/:id/reverse-context', ({ params }) => safe(() => {
    const events = allExecutions(readStore()), event = events.find((entry) => entry.id === params.id);
    if (!event) throw new Error('原始记录不存在。');
    return reverseContext(event, events);
  })),
  http.post('*/api/executions/:id/reverse', ({ params, request }) => safe(async () => {
    const input = await request.json() as { requestKey: string; action: ReverseAction; quantity: string; reason: string; businessDate: string; replacementRequired?: boolean };
    return transact((store) => deduplicate(store, input.requestKey, input, () => {
      const all = allExecutions(store), event = all.find((entry) => entry.id === params.id);
      if (!event) throw new Error('原始记录不存在。');
      const context = reverseContext(event, all);
      if (context.blockedReason) throw new Error(context.blockedReason);
      const quantity = Number(input.quantity);
      if (!input.reason.trim() || !input.businessDate || !Number.isFinite(quantity) || quantity <= 0 || quantity > context.available) throw new Error('请填写原因、日期和有效范围内的反向数量/金额。');
      const valid = event.type === 'GOODS_RECEIPT' ? ['PURCHASE_RETURN', 'GR_REVERSAL'] : event.type === 'PURCHASE_RETURN' ? ['RETURN_REVERSAL'] : event.type === 'SERVICE_ACCEPTANCE' ? ['SERVICE_REVERSAL'] : [];
      if (!valid.includes(input.action)) throw new Error('反向业务类型与原单不匹配。');
      if (input.action !== 'PURCHASE_RETURN' && quantity !== context.originalValue) throw new Error('当前适配只允许完整原执行行冲销；存在部分处理时需先处理依赖。');
      if (input.action === 'PURCHASE_RETURN' && input.replacementRequired === undefined) throw new Error('退货必须明确是否补货。');
      const id = nextId(store), sign = input.action === 'RETURN_REVERSAL' ? 1 : -1;
      const record = { id, type: input.action, poId: event.poId, itemId: event.itemId, businessDocumentNo: `RV${id}`, title: input.reason, occurredAt: new Date().toISOString(), quantity: event.quantity === undefined ? undefined : sign * Math.abs(event.quantity), amount: event.amount === undefined ? undefined : sign * Math.abs(event.amount), unit: event.unit, operator: '张敏', status: 'PROCESSING' as const, sapStatus: 'WAITING' as const, parentId: event.id, requestKey: input.requestKey, inputSnapshot: { ...input, dependencyEvidence: '内置演示依赖快照；非实时 SAP 查询' } };
      store.executions.unshift(record);
      return record;
    }));
  })),
  http.post('*/api/executions/:id/simulate-reverse-result', ({ params }) => safe(() => transact((store) => {
    const event = store.executions.find((entry) => entry.id === params.id);
    if (!event || event.status !== 'PROCESSING' || !event.parentId) throw new Error('该请求已处理或不是反向在途业务。');
    event.status = 'EFFECTIVE'; event.sapStatus = 'SUCCESS'; event.sapDocumentNo = `DEMO-${event.id}`;
    return event;
  }))),
];
