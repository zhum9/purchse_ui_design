import { http } from 'msw';
import { decimal } from '@domain/purchase-order/rules';
import type { ProcurementDemand, ProcurementPlan, ProcurementPlanLine } from '@domain/procurement/types';
import type { DemandUpsertInput, PlanCreateInput } from '@features/procurement-planning/api/procurementPlanningApi';
import { projectDemands, projectPlans } from '../repository/projections';
import { deduplicate, nextId, readStore, transact, type PrototypeStore } from '../repository/store';
import { sourceBalance } from '../repository/sources';
import { safe } from './core';

function planReserve(store: PrototypeStore, plan: ProcurementPlan) {
  const needed = new Map<string, string>();
  plan.lines.forEach((line) => {
    const shares = line.sourceShares ?? (line.sourceDemandLineIds.length === 1 ? [{ lineId: line.sourceDemandLineIds[0], quantity: String(line.plannedQuantity) }] : []);
    if (line.sourceDemandLineIds.length && !shares.length) throw new Error('旧计划缺少逐来源份额，不能编造分摊。');
    shares.forEach((share) => needed.set(share.lineId, decimal(needed.get(share.lineId)).add(share.quantity).toString()));
  });
  needed.forEach((quantity, lineId) => { if (decimal(quantity).gt(sourceBalance(store, 'DEMAND_ORDER', lineId).available)) throw new Error('来源需求余额不足，请刷新需求池重新编制。'); });
  plan.lines.forEach((line) => (line.sourceShares ?? line.sourceDemandLineIds.map((lineId) => ({ lineId, quantity: String(line.plannedQuantity) }))).forEach((share) => store.allocations.push({ id: nextId(store), sourceLineId: share.lineId, targetLineId: line.id, targetDocumentId: plan.id, targetRevisionId: `${plan.id}:V1`, relationType: 'DEMAND_PLAN', eventKind: 'RESERVE', reservedQtyDelta: share.quantity, committedQtyDelta: '0' })));
  plan.status = 'PENDING_APPROVAL'; plan.approvalStatus = 'PENDING';
}

function saveDemand(store: PrototypeStore, input: DemandUpsertInput, id?: string) {
  const current = store.demands.find((entry) => entry.id === id);
  if (id && !current) throw new Error('需求单不存在。');
  if (current && current.status !== 'DRAFT') throw new Error('已提交需求内容冻结，不能覆盖正式或待审版本。');
  if (!input.title || !input.lines.length) throw new Error('需求标题和明细不能为空。');
  input.lines.forEach((line) => { if (!line.content || line.quantity <= 0 || !Number.isFinite(line.quantity) || !line.unit) throw new Error('请补全采购内容、正数需求量和单位。'); });
  const documentId = current?.id ?? nextId(store), now = new Date().toISOString();
  const lines = input.lines.map((line, index) => ({ ...line, id: line.id ?? nextId(store), demandId: documentId, lineNo: String((index + 1) * 10).padStart(4, '0'), plannedQuantity: 0, estimatedAmount: line.estimatedUnitPrice === undefined ? undefined : decimal(line.quantity).mul(line.estimatedUnitPrice).toNumber(), status: 'OPEN' as const }));
  const demand: ProcurementDemand = { ...input, id: documentId, demandNo: current?.demandNo ?? `PR${now.slice(0, 10).replaceAll('-', '')}${documentId}`, createdAt: current?.createdAt ?? now, updatedAt: now, approvalStatus: input.status === 'DRAFT' ? 'NOT_SUBMITTED' : 'PENDING', estimatedAmount: lines.some((line) => line.estimatedAmount === undefined) ? undefined : lines.reduce((sum, line) => sum + (line.estimatedAmount ?? 0), 0), lines };
  if (current) store.demands[store.demands.indexOf(current)] = demand; else store.demands.unshift(demand);
  return demand;
}
export const planningHandlers = [
  http.get('*/api/procurement-demands/pool', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams, keyword = params.get('keyword') ?? '', department = params.get('department');
    const items = projectDemands(readStore()).filter((demand) => demand.approvalStatus === 'APPROVED').flatMap((demand) => demand.lines.filter((line) => line.quantity > line.plannedQuantity).map((line) => ({ ...line, demandNo: demand.demandNo, demandTitle: demand.title, department: demand.department, applicant: demand.applicant, priority: demand.priority }))).filter((line) => (!department || line.department === department) && [line.content, line.demandNo, line.demandTitle, line.materialCode ?? ''].some((value) => value.includes(keyword)));
    return { items, total: items.length, page: 1, pageSize: 50 };
  })),
  http.get('*/api/procurement-demands', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams, keyword = params.get('keyword') ?? '', status = params.get('status'), department = params.get('department');
    const items = projectDemands(readStore()).filter((demand) => (!status || status === 'ALL' || status === demand.status) && (!department || department === demand.department) && [demand.demandNo, demand.title, demand.applicant].some((text) => text.includes(keyword)));
    return { items, total: items.length, page: 1, pageSize: 20 };
  })),
  http.post('*/api/procurement-demands', ({ request }) => safe(async () => { const input = await request.json() as DemandUpsertInput; return transact((store) => saveDemand(store, input)); })),
  http.put('*/api/procurement-demands/:id', ({ request, params }) => safe(async () => { const input = await request.json() as DemandUpsertInput; return transact((store) => saveDemand(store, input, String(params.id))); })),
  http.post('*/api/procurement-demands/:id/approve', ({ params }) => safe(() => transact((store) => {
    const demand = store.demands.find((entry) => entry.id === params.id);
    if (!demand || demand.status !== 'SUBMITTED') throw new Error('仅已提交需求允许审批。');
    demand.status = 'APPROVED'; demand.approvalStatus = 'APPROVED'; demand.updatedAt = new Date().toISOString(); return demand;
  }))),
  http.get('*/api/procurement-plans', ({ request }) => safe(() => {
    const params = new URL(request.url).searchParams, keyword = params.get('keyword') ?? '', status = params.get('status'), org = params.get('purchaseOrganization');
    const items = projectPlans(readStore()).filter((plan) => (!status || status === 'ALL' || status === plan.status) && (!org || org === plan.purchaseOrganization) && [plan.planNo, plan.name, plan.owner].some((text) => text.includes(keyword)));
    return { items, total: items.length, page: 1, pageSize: 20 };
  })),
  http.get('*/api/procurement-plans/:id', ({ params }) => safe(() => { const plan = projectPlans(readStore()).find((entry) => entry.id === params.id); if (!plan) throw new Error('未找到计划。'); return plan; })),
  http.post('*/api/procurement-plans', ({ request }) => safe(async () => {
    const input = await request.json() as PlanCreateInput;
    return transact((store) => deduplicate(store, input.requestKey!, input, () => {
      if (!input.name || !input.purchaseOrganization || !input.company || !input.owner) throw new Error('请补全计划名称、法人、采购组织和负责人。');
      const id = nextId(store), lines: ProcurementPlanLine[] = [], now = new Date().toISOString();
      // Preserve separate dates/specifications/source shares; no unsafe automatic grouping.
      [...new Set(input.demandLineIds)].forEach((sourceId) => {
        const { parent, line, available } = sourceBalance(store, 'DEMAND_ORDER', sourceId);
        if (parent.company !== input.company) throw new Error('请选择同一法人的需求编制计划。');
        const quantity = input.sourceQuantities?.[sourceId] ?? available;
        if (!decimal(quantity).gt(0) || decimal(quantity).gt(available)) throw new Error('本次计划量超出需求余额。');
        lines.push({ id: nextId(store), planId: id, lineNo: String((lines.length + 1) * 10).padStart(4, '0'), sourceDemandLineIds: [sourceId], sourceDemandNos: ['demandNo' in parent ? parent.demandNo : ''], sourceShares: [{ lineId: sourceId, quantity }], objectType: line.objectType, content: line.content, materialCode: line.materialCode, materialGroup: line.materialGroup, suggestedSuppliers: 'suggestedSupplier' in line && line.suggestedSupplier ? [line.suggestedSupplier] : [], specification: line.specification, plannedQuantity: Number(quantity), orderedQuantity: 0, unit: line.unit, estimatedUnitPrice: line.estimatedUnitPrice, estimatedAmount: line.estimatedUnitPrice === undefined ? undefined : decimal(quantity).mul(line.estimatedUnitPrice).toNumber(), requiredDate: line.requiredDate, plant: line.plant });
      });
      if (input.independentLines?.length && !input.notes?.trim()) throw new Error('独立计划需说明采购依据。');
      input.independentLines?.forEach((line) => {
        if (!line.content || !(line.quantity > 0) || !line.unit || !line.requiredDate) throw new Error('独立计划明细需要采购内容、数量/单位和需要日期。');
        lines.push({ ...line, id: nextId(store), planId: id, lineNo: String((lines.length + 1) * 10).padStart(4, '0'), sourceDemandLineIds: [], sourceDemandNos: [], suggestedSuppliers: line.suggestedSupplier ? [line.suggestedSupplier] : [], plannedQuantity: line.quantity, orderedQuantity: 0, estimatedAmount: line.estimatedUnitPrice === undefined ? undefined : decimal(line.quantity).mul(line.estimatedUnitPrice).toNumber() });
      });
      if (!lines.length) throw new Error('计划至少需要一行采购明细。');
      const plan: ProcurementPlan = { ...input, id, planNo: `PP${now.slice(0, 10).replaceAll('-', '')}${id}`, status: 'DRAFT', approvalStatus: 'NOT_SUBMITTED', createdAt: now, updatedAt: now, estimatedAmount: lines.some((line) => line.estimatedAmount === undefined) ? undefined : lines.reduce((sum, line) => sum + (line.estimatedAmount ?? 0), 0), lines };
      if (input.submit !== false) planReserve(store, plan);
      store.plans.unshift(plan); return plan;
    }));
  })),
  http.post('*/api/procurement-plans/:id/submit', ({ params }) => safe(() => transact((store) => {
    const plan = store.plans.find((entry) => entry.id === params.id); if (!plan || plan.status !== 'DRAFT') throw new Error('只能提交计划草稿。'); planReserve(store, plan); return plan;
  }))),
  http.post('*/api/procurement-plans/:id/approve', ({ params }) => safe(() => transact((store) => {
    const plan = store.plans.find((entry) => entry.id === params.id); if (!plan || plan.status !== 'PENDING_APPROVAL') throw new Error('计划需先提交，不能从草稿直接生效。');
    store.allocations.filter((entry) => entry.targetDocumentId === plan.id && entry.eventKind === 'RESERVE').forEach((entry) => store.allocations.push({ ...entry, id: nextId(store), eventKind: 'COMMIT', reservedQtyDelta: decimal(entry.reservedQtyDelta).neg().toString(), committedQtyDelta: entry.reservedQtyDelta }));
    plan.status = 'APPROVED'; plan.approvalStatus = 'APPROVED'; plan.updatedAt = new Date().toISOString(); return plan;
  }))),
];
