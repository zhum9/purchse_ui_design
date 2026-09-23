import type { PurchaseOrderItem } from './types';

export const getExecutionCeiling = (item: PurchaseOrderItem) =>
  item.controlMode === 'LIMIT' ? (item.overallLimit ?? item.orderedValue) : item.orderedValue;

export const getRemainingValue = (item: PurchaseOrderItem) =>
  Math.max(0, getExecutionCeiling(item) - item.executedValue);

export const getExecutionPercent = (item: PurchaseOrderItem) => {
  const ceiling = getExecutionCeiling(item);
  return ceiling === 0 ? 0 : Math.min(100, Math.round((item.executedValue / ceiling) * 100));
};
