import { describe, expect, it } from 'vitest';
import { purchaseOrderItems } from '@mocks/fixtures/purchaseOrders';
import { getExecutionFormSchema } from './schemas';

const schemaFor = (scenario: string) => getExecutionFormSchema(purchaseOrderItems.find((item) => item.executionScenario === scenario)!);
const field = (scenario: string, key: string) => schemaFor(scenario).fields.find((item) => item.key === key);

describe('动态履约表单', () => {
  it('批次管理物料要求填写批次', () => expect(field('MAT_STOCK', 'batch')?.state).toBe('REQUIRED'));
  it('无物料号收货不包含物料号选择器', () => expect(field('MAT_FREE', 'materialCode')).toBeUndefined());
  it('服务验收要求服务期间并隐藏库存字段', () => {
    expect(field('SERVICE', 'servicePeriod')?.state).toBe('REQUIRED');
    expect(field('SERVICE', 'storageLocation')).toBeUndefined();
  });
  it('限额服务金额不能超过剩余额度', () => expect(field('SERVICE_LIMIT', 'confirmedAmount')?.max).toBe(86500));
});
