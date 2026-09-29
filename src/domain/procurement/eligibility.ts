import dayjs from 'dayjs';
import type { PurchaseOrderItem } from './types';
import { getRemainingValue } from './calculations';

export function executionBlockReason(item: PurchaseOrderItem): string | undefined {
  if (item.executionDisabledReason) return item.executionDisabledReason;
  if (!['MAT_STOCK', 'MAT_CONSUME', 'MAT_FREE', 'SERVICE', 'SERVICE_LIMIT'].includes(item.executionScenario) || item.controlMode === 'MILESTONE') return '该执行场景尚未适配，不能退化为普通收货';
  if (item.serialNumberManaged) return '序列号追踪尚未适配，暂不可提交';
  if (item.status.documentStatus !== 'ACTIVE') return '仅正式生效订单允许履约';
  if (!['APPROVED', 'NOT_REQUIRED'].includes(item.status.approvalStatus ?? '')) return '内部授权尚未完成';
  if (!item.sapPoNo || item.status.sapSyncStatus === 'WAITING' || item.status.sapSyncStatus === 'PROCESSING') return 'SAP 订单尚未就绪';
  if (item.status.sapSyncStatus === 'FAILED') return 'SAP 订单下发失败，修复同步前不能履约';
  if (item.status.sapSyncStatus === 'UNKNOWN') return 'SAP 状态未知，请先核对，避免重复执行';
  if (item.status.fulfillmentStatus === 'BLOCKED') return '当前订单行已冻结';
  if (getRemainingValue(item) <= 0) return '当前没有可执行余额';
  return undefined;
}
export const executionActionLabel = (item: PurchaseOrderItem) => item.executionScenario === 'SERVICE' ? '服务验收' : item.executionScenario === 'SERVICE_LIMIT' ? '执行确认' : '收货';
export const isOverdue = (item: PurchaseOrderItem) => getRemainingValue(item) > 0 && dayjs(item.plannedDate).isBefore(dayjs(), 'day');
