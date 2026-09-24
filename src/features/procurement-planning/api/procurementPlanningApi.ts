import type {
  DemandPoolItem,
  ProcurementDemand,
  ProcurementDemandStatus,
  ProcurementObjectType,
  ProcurementPlan,
  ProcurementPlanStatus,
  ProcurementPlanType,
  ProcurementPriority,
} from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';

export interface PlanningQuery {
  keyword?: string;
  status?: string;
  department?: string;
  purchaseOrganization?: string;
}

export interface DemandLineInput {
  id?: string;
  objectType: ProcurementObjectType;
  content: string;
  materialCode?: string;
  materialGroup: string;
  suggestedSupplier?: string;
  specification?: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  requiredDate: string;
  plant?: string;
}

export interface DemandUpsertInput {
  id?: string;
  title: string;
  department: string;
  applicant: string;
  company: string;
  costCenter?: string;
  priority: ProcurementPriority;
  requiredDate: string;
  status: Extract<ProcurementDemandStatus, 'DRAFT' | 'SUBMITTED'>;
  notes?: string;
  lines: DemandLineInput[];
}

export interface PlanCreateInput {
  name: string;
  type: ProcurementPlanType;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  owner: string;
  plannedOrderDate: string;
  notes?: string;
  demandLineIds: string[];
}

export interface PlanOrderInput {
  supplier: string;
  company: string;
  purchaseGroup: string;
  orderDate: string;
  planLineIds: string[];
}

export const planningKeys = {
  demands: ['procurement-demands'] as const,
  demandList: (query: PlanningQuery) => [...planningKeys.demands, 'list', query] as const,
  demandPool: (query: PlanningQuery) => [...planningKeys.demands, 'pool', query] as const,
  plans: ['procurement-plans'] as const,
  planList: (query: PlanningQuery) => [...planningKeys.plans, 'list', query] as const,
  planDetail: (id: string) => [...planningKeys.plans, 'detail', id] as const,
};

function toSearchParams(query: PlanningQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => value && params.set(key, value));
  return params;
}

export const getProcurementDemands = (query: PlanningQuery) =>
  apiClient<PageResult<ProcurementDemand>>(`/api/procurement-demands?${toSearchParams(query)}`);

export const saveProcurementDemand = (input: DemandUpsertInput) =>
  apiClient<ProcurementDemand>(input.id ? `/api/procurement-demands/${input.id}` : '/api/procurement-demands', {
    method: input.id ? 'PUT' : 'POST', body: JSON.stringify(input),
  });

export const approveProcurementDemand = (id: string) =>
  apiClient<ProcurementDemand>(`/api/procurement-demands/${id}/approve`, { method: 'POST' });

export const getDemandPool = (query: PlanningQuery) =>
  apiClient<PageResult<DemandPoolItem>>(`/api/procurement-demands/pool?${toSearchParams(query)}`);

export const getProcurementPlans = (query: PlanningQuery) =>
  apiClient<PageResult<ProcurementPlan>>(`/api/procurement-plans?${toSearchParams(query)}`);

export const getProcurementPlan = (id: string) => apiClient<ProcurementPlan>(`/api/procurement-plans/${id}`);

export const createProcurementPlan = (input: PlanCreateInput) =>
  apiClient<ProcurementPlan>('/api/procurement-plans', { method: 'POST', body: JSON.stringify(input) });

export const approveProcurementPlan = (id: string) =>
  apiClient<ProcurementPlan>(`/api/procurement-plans/${id}/approve`, { method: 'POST' });

export const createPurchaseOrderFromPlan = (planId: string, input: PlanOrderInput) =>
  apiClient<{ orderId: string; businessOrderNo: string }>(`/api/procurement-plans/${planId}/purchase-orders`, { method: 'POST', body: JSON.stringify(input) });

export const demandStatusFilters: Array<{ key: 'ALL' | ProcurementDemandStatus; label: string }> = [
  { key: 'ALL', label: '全部需求' }, { key: 'DRAFT', label: '草稿' }, { key: 'SUBMITTED', label: '待审批' },
  { key: 'APPROVED', label: '待纳入计划' }, { key: 'PARTIALLY_PLANNED', label: '部分纳入计划' }, { key: 'PLANNED', label: '已纳入计划' },
];

export const planStatusFilters: Array<{ key: 'ALL' | ProcurementPlanStatus; label: string }> = [
  { key: 'ALL', label: '全部计划' }, { key: 'DRAFT', label: '草稿' }, { key: 'PENDING_APPROVAL', label: '待审批' },
  { key: 'APPROVED', label: '待生成订单' }, { key: 'PARTIALLY_ORDERED', label: '部分生成订单' }, { key: 'ORDERED', label: '已生成订单' },
];
