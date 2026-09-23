import { describe, expect, it } from 'vitest';
import { getExecutionCeiling, getExecutionPercent, getRemainingValue } from './calculations';
import { purchaseOrderItems } from '@mocks/fixtures/purchaseOrders';

describe('采购履约计算', () => {
  it('按订单数量计算库存物料剩余可执行量', () => {
    const item = purchaseOrderItems.find((candidate) => candidate.executionScenario === 'MAT_STOCK')!;
    expect(getRemainingValue(item)).toBe(300);
    expect(getExecutionPercent(item)).toBe(70);
  });

  it('限额服务使用 Overall Limit 作为执行上限', () => {
    const item = purchaseOrderItems.find((candidate) => candidate.executionScenario === 'SERVICE_LIMIT')!;
    expect(getExecutionCeiling(item)).toBe(150000);
    expect(getRemainingValue(item)).toBe(86500);
  });
});
