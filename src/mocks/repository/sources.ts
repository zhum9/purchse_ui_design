import { decimal, newCommercialLine, newOrderDraft } from '@domain/purchase-order/rules';
import { catalog, refId } from '@domain/purchase-order/catalog';
import type { OrderDraft } from '@domain/purchase-order/types';
import type { PrototypeStore } from './store';
import { procurementPlans } from '../fixtures/procurementPlanning';

export function sourceBalance(store: PrototypeStore, kind: 'PLAN_ORDER' | 'DEMAND_ORDER', lineId: string) {
  const parent = kind === 'PLAN_ORDER' ? store.plans.find((plan) => plan.lines.some((line) => line.id === lineId)) : store.demands.find((demand) => demand.lines.some((line) => line.id === lineId));
  const line = parent?.lines.find((item) => item.id === lineId);
  if (!parent || !line || parent.approvalStatus !== 'APPROVED') throw new Error('来源不存在或尚未审批通过。');
  let baseline = 'orderedQuantity' in line ? line.orderedQuantity : line.plannedQuantity;
  // Known one-source seed plans are explicit commitments. Draft plans never consume demand.
  if (kind === 'DEMAND_ORDER') {
    const known = procurementPlans.filter((plan) => plan.approvalStatus === 'APPROVED')
      .flatMap((plan) => plan.lines).filter((item) => item.sourceDemandLineIds.length === 1 && item.sourceDemandLineIds[0] === lineId)
      .reduce((sum, item) => sum + item.plannedQuantity, 0);
    baseline = Math.max(baseline, known);
  }
  const ledger = store.allocations.filter((entry) => entry.sourceLineId === lineId);
  const reserved = ledger.reduce((sum, entry) => sum.add(entry.reservedQtyDelta), decimal(0));
  const committed = ledger.reduce((sum, entry) => sum.add(entry.committedQtyDelta), decimal(baseline));
  const authorized = 'quantity' in line ? line.quantity : line.plannedQuantity;
  return { parent, line, authorized: String(authorized), reserved: reserved.toString(), committed: committed.toString(), available: decimal(authorized).sub(reserved).sub(committed).toString() };
}

export function sourceDraft(store: PrototypeStore, kind: 'PLAN_ORDER' | 'DEMAND_ORDER', ids: string[]): OrderDraft {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error('请选择不重复的有效来源明细。');
  const sources = ids.map((id) => sourceBalance(store, kind, id));
  if (new Set(sources.map(({ parent }) => parent.company)).size !== 1) throw new Error('不同法人需要分别编制订单，请按公司分组选择。');
  const draft = newOrderDraft();
  const plan = kind === 'PLAN_ORDER' ? store.plans.find((entry) => entry.id === sources[0].parent.id) : undefined;
  draft.purchaseOrgId = refId('organizations', plan?.purchaseOrganization);
  draft.purchaseGroupId = refId('groups', plan?.purchaseGroup);
  draft.lines = sources.map(({ parent, line, available }, index) => {
    if (decimal(available).lte(0)) throw new Error(`${line.content} 已无可分配余额，请刷新来源。`);
    const base = newCommercialLine();
    const service = ['SERVICE', 'LIMIT_SERVICE'].includes(line.objectType);
    // Legacy sources describe quantities, not monetary authorizations. Do not reinterpret 12 months as ¥12.
    return { ...base, lineNo: String((index + 1) * 10).padStart(5, '0'), productKind: service ? 'SERVICE' : 'GOODS', stockMode: service ? 'NOT_APPLICABLE' : line.materialCode ? 'STOCK' : 'NON_STOCK', identificationMode: line.materialCode ? 'CODED' : 'FREE_TEXT',
      itemRefId: catalog.materials.find((entry) => entry.code === line.materialCode)?.id, content: line.content, specification: line.specification ?? '', categoryId: refId('categories', line.materialGroup),
      executionScenario: service ? 'SERVICE' : line.materialCode ? 'MAT_STOCK' : 'MAT_FREE', controlMode: service ? 'QUANTITY_AMOUNT' : 'QUANTITY', originMode: 'SOURCED', orderedQty: available,
      orderUomId: refId('units', line.unit), priceUomId: refId('units', line.unit), plantId: refId('plants', line.plant),
      source: { sourceDocumentId: parent.id, sourceRevisionId: `${parent.id}:V1`, sourceLineId: line.id, sourceDocumentNo: 'planNo' in parent ? parent.planNo : parent.demandNo, relationType: kind, controlDimension: 'QTY', available, referenceUnitPrice: line.estimatedUnitPrice === undefined ? undefined : String(line.estimatedUnitPrice), requiredDate: line.requiredDate, suggestedSuppliers: 'suggestedSuppliers' in line ? line.suggestedSuppliers : line.suggestedSupplier ? [line.suggestedSupplier] : [] },
      schedule: { ...base.schedule, requiredDate: line.requiredDate, addressSnapshot: line.plant ?? '' },
    };
  });
  return draft;
}
