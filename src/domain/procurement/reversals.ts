import type { ExecutionEvent } from './types';

export type ReverseAction = 'PURCHASE_RETURN' | 'GR_REVERSAL' | 'RETURN_REVERSAL' | 'SERVICE_REVERSAL';
export interface ReverseContext { event: ExecutionEvent; originalValue: number; effectiveReversed: number; pending: number; available: number; unit: string; dependencyStatus: 'ALLOWED' | 'UNKNOWN'; blockedReason?: string }
export function reverseContext(event: ExecutionEvent, all: ExecutionEvent[]): ReverseContext {
  const related = all.filter((item) => item.parentId === event.id);
  const amountOf = (item: ExecutionEvent) => Math.abs(item.amount ?? item.quantity ?? 0);
  // A return subsequently reversed no longer reduces the original receipt's returnable balance.
  const effectiveReversed = related.filter((item) => item.status !== 'PROCESSING').reduce((sum, item) => sum + Math.max(0, amountOf(item) - all.filter((child) => child.parentId === item.id && child.type === 'RETURN_REVERSAL' && child.status !== 'PROCESSING').reduce((total, child) => total + amountOf(child), 0)), 0);
  const pending = related.filter((item) => item.status === 'PROCESSING').reduce((sum, item) => sum + amountOf(item), 0);
  const originalValue = amountOf(event), available = Math.max(0, originalValue - effectiveReversed - pending);
  // Only supplied demo fixtures have a known dependency snapshot; new real dependencies are never inferred.
  const known = ['EV-001', 'EV-002', 'EV-004', 'EV-005', 'EV-006'].includes(event.id);
  return { event, originalValue, effectiveReversed, pending, available, unit: event.amount !== undefined ? '元' : event.unit ?? '', dependencyStatus: known ? 'ALLOWED' : 'UNKNOWN', blockedReason: !known ? '缺少库存/发票等外部依赖证据，暂不允许反向处理' : event.sapStatus !== 'SUCCESS' ? '原业务 SAP 结果尚未确认' : !available ? '该原记录已被反向处理或全部占用' : undefined };
}
