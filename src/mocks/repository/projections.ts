import { decimal } from '@domain/purchase-order/rules';
import type { ProcurementDemand, ProcurementPlan } from '@domain/procurement/types';
import { purchaseOrders } from '../fixtures/purchaseOrders';
import { executionEvents } from '../fixtures/executionEvents';
import { projectOrder } from './orders';
import { sourceBalance } from './sources';
import type { PrototypeStore } from './store';

export function allOrders(store: PrototypeStore) {
  return [...store.orders.map((order) => projectOrder(order, store)), ...purchaseOrders.map((order) => {
    const next = structuredClone(order);
    next.items.forEach((item) => {
      item.businessOrderNo = order.businessOrderNo;
      if (store.executions.some((event) => event.itemId === item.id && event.type === 'PURCHASE_RETURN' && event.status === 'EFFECTIVE' && event.inputSnapshot?.replacementRequired === false)) item.executionDisabledReason = '不补货退货已生效，等待采购员受控关闭/变更；不能直接重新收货';
      const additional = store.executions.filter((event) => event.itemId === item.id && event.status !== 'PROCESSING').reduce((sum, event) => sum.add(item.unit === '元' ? event.amount ?? 0 : event.quantity ?? 0), decimal(0));
      item.executedValue = decimal(item.executedValue).add(additional).toNumber();
      item.status.fulfillmentStatus = item.executedValue >= (item.overallLimit ?? item.orderedValue) ? 'COMPLETE' : item.executedValue > 0 ? 'PARTIAL' : 'OPEN';
    });
    next.status.fulfillmentStatus = next.items.every((item) => item.status.fulfillmentStatus === 'COMPLETE') ? 'COMPLETE' : next.items.some((item) => item.executedValue > 0) ? 'PARTIAL' : 'OPEN';
    if (next.id === 'PO-003') next.amount = 100000;
    return next;
  })];
}
export const allExecutions = (store: PrototypeStore) => [...store.executions, ...executionEvents];
export function projectDemands(store: PrototypeStore): ProcurementDemand[] {
  return store.demands.map((demand) => {
    const result = structuredClone(demand);
    if (demand.approvalStatus === 'APPROVED') {
      result.lines = demand.lines.map((line) => {
        const balance = sourceBalance(store, 'DEMAND_ORDER', line.id);
        const total = decimal(balance.committed).add(balance.reserved).toNumber();
        return { ...line, plannedQuantity: total, committedQuantity: Number(balance.committed), reservedQuantity: Number(balance.reserved), status: total >= line.quantity ? 'PLANNED' : total > 0 ? 'PARTIALLY_PLANNED' : 'OPEN' };
      });
      result.status = result.lines.every((line) => line.plannedQuantity >= line.quantity) ? 'PLANNED' : result.lines.some((line) => line.plannedQuantity > 0) ? 'PARTIALLY_PLANNED' : 'APPROVED';
    }
    return result;
  });
}
export function projectPlans(store: PrototypeStore): ProcurementPlan[] {
  return store.plans.map((plan) => {
    const result = structuredClone(plan);
    if (plan.approvalStatus === 'APPROVED') {
      result.lines = plan.lines.map((line) => {
        const balance = sourceBalance(store, 'PLAN_ORDER', line.id);
        return { ...line, orderedQuantity: Number(balance.committed), reservedQuantity: Number(balance.reserved) };
      });
      result.status = result.lines.every((line) => line.orderedQuantity >= line.plannedQuantity) ? 'ORDERED' : result.lines.some((line) => line.orderedQuantity > 0) ? 'PARTIALLY_ORDERED' : 'APPROVED';
    }
    return result;
  });
}
