import type { OrderDocument } from '@domain/purchase-order/types';
import type { ExecutionEvent, ProcurementDemand, ProcurementPlan } from '@domain/procurement/types';
import { procurementDemands, procurementPlans } from '../fixtures/procurementPlanning';

export interface AllocationEntry {
  id: string;
  sourceLineId: string;
  targetDocumentId: string;
  targetRevisionId: string;
  targetLineId: string;
  relationType: 'DEMAND_PLAN' | 'DEMAND_ORDER' | 'PLAN_ORDER';
  eventKind: 'RESERVE' | 'COMMIT' | 'RELEASE_RESERVE';
  reservedQtyDelta: string;
  committedQtyDelta: string;
}
export interface PrototypeStore {
  schemaVersion: 1;
  sequence: number;
  orders: OrderDocument[];
  demands: ProcurementDemand[];
  plans: ProcurementPlan[];
  allocations: AllocationEntry[];
  executions: ExecutionEvent[];
  commands: Record<string, { fingerprint: string; result: unknown }>;
}
const STORAGE_KEY = 'pur-core-prototype-v1';
const seed = (): PrototypeStore => ({ schemaVersion: 1, sequence: 10000, orders: [], demands: structuredClone(procurementDemands), plans: structuredClone(procurementPlans), allocations: [], executions: [], commands: {} });
export function readStore(): PrototypeStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seed();
  const value = JSON.parse(raw) as PrototypeStore;
  if (value.schemaVersion !== 1 || !Array.isArray(value.orders) || !Array.isArray(value.allocations)) throw new Error('本机原型数据格式不兼容，请保留数据并联系开发人员，未自动覆盖。');
  return value;
}
export const nextId = (store: PrototypeStore) => String(++store.sequence);

/** A single persistent snapshot and origin-wide lock, not a substitute for DB transactions. */
export async function transact<T>(work: (store: PrototypeStore) => T): Promise<T> {
  if (!navigator.locks) throw new Error('当前浏览器无法提供安全的本机写入锁，请使用 HTTPS 和新版浏览器。');
  return navigator.locks.request('pur-core-write', () => {
    const store = readStore();
    const result = work(store);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch { throw new Error('本机数据保存失败（可能空间不足）。本次操作未提交，请保留页面输入。'); }
    return result;
  });
}
export function deduplicate<T>(store: PrototypeStore, key: string, payload: unknown, work: () => T): T {
  if (!key) throw new Error('缺少业务请求标识。');
  const fingerprint = JSON.stringify(payload);
  const previous = store.commands[key];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new Error('同一请求标识不能提交不同内容。');
    return structuredClone(previous.result) as T;
  }
  const result = work();
  store.commands[key] = { fingerprint, result: structuredClone(result) };
  return result;
}
