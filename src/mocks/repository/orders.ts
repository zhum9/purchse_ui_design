import { calculateLine, decimal, orderTotals, validateOrder } from '@domain/purchase-order/rules';
import { catalog, refName } from '@domain/purchase-order/catalog';
import type { OrderActionCommand, OrderDocument, OrderDraft, OrderRevision, OrderSaveCommand } from '@domain/purchase-order/types';
import type { PurchaseOrder, PurchaseOrderItem } from '@domain/procurement/types';
import { deduplicate, nextId, type PrototypeStore } from './store';
import { sourceBalance } from './sources';

export const activeRevision = (order: OrderDocument) => order.revisions.find((revision) => revision.id === (order.effectiveRevisionId ?? order.workingRevisionId)) ?? order.revisions.at(-1)!;
export const workingRevision = (order: OrderDocument) => order.revisions.find((revision) => revision.id === order.workingRevisionId);

function validateSources(store: PrototypeStore, draft: OrderDraft) {
  const usage = new Map<string, string>();
  draft.lines.forEach((line) => {
    if (!line.source) return;
    const balance = sourceBalance(store, line.source.relationType, line.source.sourceLineId);
    if (refName('companies', draft.companyId) !== balance.parent.company) throw new Error('来源与订单法人不一致。');
    if (line.content !== balance.line.content || line.specification !== (balance.line.specification ?? '') || refName('units', line.orderUomId) !== balance.line.unit) throw new Error('来源采购内容、规格和计量单位不可直接替换，请先调整上游授权。');
    const used = decimal(usage.get(line.source.sourceLineId)).add(line.orderedQty ?? 0);
    if (used.gt(balance.available)) throw new Error(`${line.content} 的来源余额已变化，当前可用 ${balance.available} ${balance.line.unit}。请保留输入并刷新。`);
    usage.set(line.source.sourceLineId, used.toString());
    line.source.available = balance.available;
  });
}

function allocate(store: PrototypeStore, order: OrderDocument, revision: OrderRevision, kind: 'RESERVE' | 'COMMIT' | 'RELEASE_RESERVE') {
  revision.content.lines.forEach((line) => {
    if (!line.source) return;
    const qty = decimal(line.orderedQty);
    store.allocations.push({ id: nextId(store), sourceLineId: line.source.sourceLineId, targetDocumentId: order.id, targetRevisionId: revision.id, targetLineId: line.lineId, relationType: line.source.relationType, eventKind: kind, reservedQtyDelta: kind === 'RESERVE' ? qty.toString() : qty.neg().toString(), committedQtyDelta: kind === 'COMMIT' ? qty.toString() : '0' });
  });
}

export function saveOrder(store: PrototypeStore, input: OrderSaveCommand): OrderDocument {
  return deduplicate(store, input.requestKey, input, () => {
    const content = structuredClone(input.content);
    let order = store.orders.find((entry) => entry.id === input.id);
    if (input.id && !order) throw new Error('未找到订单。');
    if (order && order.rowVersion !== input.expectedRowVersion) throw new Error('订单已被其他操作更新，请刷新后重试。输入未清空。');
    if (order && workingRevision(order)?.revisionStatus !== 'WORKING') throw new Error('提交后的内容已冻结，不能直接编辑。');
    if (input.submit) {
      const errors = validateOrder(content).filter((issue) => issue.level === 'ERROR');
      if (errors.length) throw new Error(errors[0].message);
      if (!order?.effectiveRevisionId) validateSources(store, content);
    }
    if (!order) {
      const id = nextId(store);
      order = { id, documentNo: `PO${new Date().toISOString().slice(0, 10).replaceAll('-', '')}${id}`, lifecycleStatus: 'DRAFT', rowVersion: 0, workingRevisionId: nextId(store), sapSyncStatus: 'WAITING', updatedAt: new Date().toISOString(), revisions: [], deliveryNotes: [] };
      store.orders.unshift(order);
      order.revisions.push({ id: order.workingRevisionId!, documentId: id, revisionNo: 1, revisionStatus: 'WORKING', approvalStatus: 'NOT_SUBMITTED', content });
    }
    const revision = workingRevision(order)!;
    // Formal amendments currently support dates/notes only; business quantities and prices stay locked.
    if (order.effectiveRevisionId) {
      const original = activeRevision(order).content;
      const stripDelivery = (draft: OrderDraft) => ({ ...draft, notes: '', lines: draft.lines.map((line) => ({ ...line, schedule: { ...line.schedule, requiredDate: '' } })) });
      if (JSON.stringify(stripDelivery(original)) !== JSON.stringify(stripDelivery(content))) throw new Error('当前变更仅开放约定交期与说明；数量、价格等变更需后续差额分配适配，不能直接覆盖正式内容。');
    }
    content.lines.forEach((line, index) => {
      if (!/^\d+$/.test(line.lineId)) line.lineId = nextId(store);
      line.lineNo = String((index + 1) * 10).padStart(5, '0');
    });
    revision.content = content;
    if (input.submit) {
      revision.revisionStatus = 'SUBMITTED'; revision.approvalStatus = 'PENDING'; revision.submittedBy = '801'; revision.submittedAt = new Date().toISOString();
      if (!order.effectiveRevisionId) allocate(store, order, revision, 'RESERVE');
    }
    order.rowVersion++; order.updatedAt = new Date().toISOString();
    return order;
  });
}

export function orderAction(store: PrototypeStore, id: string, input: OrderActionCommand): OrderDocument {
  return deduplicate(store, input.requestKey, input, () => {
    const order = store.orders.find((entry) => entry.id === id);
    if (!order || order.rowVersion !== input.expectedRowVersion) throw new Error('订单版本已变化，请刷新后再处理。');
    const revision = workingRevision(order);
    if (input.action === 'APPROVE' || input.action === 'REJECT') {
      if (revision?.revisionStatus !== 'SUBMITTED') throw new Error('该审批已完成或已撤回。');
      if (input.actorId !== '802' || input.actorId === revision.submittedBy) throw new Error('请使用采购主管演示身份审批；提交人不能自审批。');
      if (input.action === 'REJECT' && !input.reason.trim()) throw new Error('驳回必须填写原因。');
      revision.decisionComment = input.reason; revision.decidedBy = input.actorId;
      revision.revisionStatus = input.action === 'APPROVE' ? 'AUTHORIZED' : 'REJECTED';
      revision.approvalStatus = input.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      if (!order.effectiveRevisionId) allocate(store, order, revision, input.action === 'APPROVE' ? 'COMMIT' : 'RELEASE_RESERVE');
      if (input.action === 'APPROVE') order.sapSyncStatus = 'WAITING';
    } else if (input.action === 'WITHDRAW') {
      if (revision?.revisionStatus !== 'SUBMITTED' || input.actorId !== revision.submittedBy) throw new Error('仅提交人可以撤回待审批版本。');
      revision.revisionStatus = 'WITHDRAWN'; revision.approvalStatus = 'NOT_SUBMITTED';
      if (!order.effectiveRevisionId) allocate(store, order, revision, 'RELEASE_RESERVE');
    } else if (input.action === 'SIMULATE_ERP') {
      if (revision?.revisionStatus !== 'AUTHORIZED') throw new Error('内部授权尚未完成，不能模拟 ERP 生效。');
      const old = order.revisions.find((entry) => entry.id === order.effectiveRevisionId);
      if (old) old.revisionStatus = 'SUPERSEDED';
      revision.revisionStatus = 'EFFECTIVE'; revision.effectiveAt = new Date().toISOString();
      order.effectiveRevisionId = revision.id; order.workingRevisionId = undefined; order.lifecycleStatus = 'ACTIVE'; order.sapSyncStatus = 'SUCCESS'; order.sapPoNo ??= `45${order.id.padStart(8, '0')}`;
    } else {
      if (revision && !['REJECTED', 'WITHDRAWN'].includes(revision.revisionStatus)) throw new Error('已经存在工作/在途版本。');
      if (input.action === 'CHANGE' && !input.reason.trim()) throw new Error('发起正式变更必须填写原因。');
      const base = activeRevision(order);
      const next: OrderRevision = { id: nextId(store), documentId: order.id, revisionNo: order.revisions.length + 1, baseRevisionId: base.id, revisionStatus: 'WORKING', approvalStatus: 'NOT_SUBMITTED', changeReason: input.reason, content: structuredClone(base.content) };
      order.revisions.push(next); order.workingRevisionId = next.id;
    }
    order.rowVersion++; order.updatedAt = new Date().toISOString();
    return order;
  });
}

/** Legacy presentation projection only. Canonical NUMBER strings remain in revision.content. */
export function projectOrder(order: OrderDocument, store: PrototypeStore): PurchaseOrder {
  const revision = activeRevision(order), draft = revision.content;
  const status: PurchaseOrder['status'] = { documentStatus: order.lifecycleStatus, fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', approvalStatus: revision.approvalStatus, sapSyncStatus: order.sapSyncStatus };
  const items: PurchaseOrderItem[] = draft.lines.map((line) => {
    const money = line.productKind === 'SERVICE';
    const amount = calculateLine(line);
    const netExecution = store.executions.filter((event) => event.itemId === line.lineId && event.status !== 'PROCESSING').reduce((sum, event) => sum.add(money ? event.amount ?? 0 : event.quantity ?? 0), decimal(0));
    const ceiling = money ? (line.pricingMethod === 'LIMIT' ? line.overallLimit : amount?.gross) : line.orderedQty;
    const currentWork = workingRevision(order);
    const changed = currentWork && !['REJECTED', 'WITHDRAWN'].includes(currentWork.revisionStatus) && order.effectiveRevisionId && currentWork.content.lines.find((entry) => entry.lineId === line.lineId)?.schedule.requiredDate !== line.schedule.requiredDate;
    const noReplacementReturn = store.executions.some((event) => event.itemId === line.lineId && event.type === 'PURCHASE_RETURN' && event.status === 'EFFECTIVE' && event.inputSnapshot?.replacementRequired === false);
    const blocked = !order.effectiveRevisionId ? '订单尚未完成审批及 SAP 生效' : changed ? '该行正式交期变更在途，暂不可新增履约' : noReplacementReturn ? '不补货退货已生效，等待采购员受控关闭/变更；不能直接重新收货' : undefined;
    return { id: line.lineId, poId: order.id, businessOrderNo: order.documentNo, orderRevisionId: revision.id, sapPoNo: order.sapPoNo ?? '', itemNo: line.lineNo, supplier: refName('suppliers', draft.supplierId), purchaseOrganization: refName('organizations', draft.purchaseOrgId), objectType: line.productKind === 'SERVICE' ? line.pricingMethod === 'LIMIT' ? 'LIMIT_SERVICE' : 'SERVICE' : line.itemRefId ? 'MATERIAL' : 'FREE_TEXT', executionScenario: line.executionScenario, controlMode: money ? line.pricingMethod === 'LIMIT' ? 'LIMIT' : 'AMOUNT' : 'QUANTITY', content: line.content, specification: line.specification, materialCode: catalog.materials.find((entry) => entry.id === line.itemRefId)?.code, materialGroup: refName('categories', line.categoryId), orderedValue: Number(ceiling ?? 0), executedValue: netExecution.toNumber(), unit: money ? '元' : refName('units', line.orderUomId), currency: 'CNY', overallLimit: line.overallLimit ? Number(line.overallLimit) : undefined, expectedValue: line.expectedAmount ? Number(line.expectedAmount) : undefined, plannedDate: line.schedule.requiredDate, plant: line.plantId ? refName('plants', line.plantId) : undefined, storageLocation: line.schedule.deliveryLocationId ? refName('locations', line.schedule.deliveryLocationId) : undefined, commercialQuantity: line.orderedQty, commercialUnit: line.orderUomId ? refName('units', line.orderUomId) : undefined, serviceStart: line.serviceStart, serviceEnd: line.serviceEnd, executionDisabledReason: blocked, status: { ...status, fulfillmentStatus: netExecution.gte(ceiling ?? '0') && decimal(ceiling).gt(0) ? 'COMPLETE' : netExecution.gt(0) ? 'PARTIAL' : 'OPEN' } };
  });
  status.fulfillmentStatus = items.length && items.every((item) => item.status.fulfillmentStatus === 'COMPLETE') ? 'COMPLETE' : items.some((item) => item.executedValue > 0) ? 'PARTIAL' : 'OPEN';
  const source = draft.lines.find((line) => line.source)?.source;
  return { id: order.id, businessOrderNo: order.documentNo, sapPoNo: order.sapPoNo ?? '', source: source?.relationType === 'PLAN_ORDER' ? 'PLAN' : source ? 'REQUISITION' : 'DIRECT', sourceDocumentNo: source?.sourceDocumentNo, supplier: refName('suppliers', draft.supplierId), purchaseOrganization: refName('organizations', draft.purchaseOrgId), purchaseGroup: refName('groups', draft.purchaseGroupId), company: refName('companies', draft.companyId), orderDate: draft.orderDate, currency: 'CNY', amount: Number(orderTotals(draft).gross), updatedAt: order.updatedAt, status, items, revisionStatus: revision.revisionStatus, revisionNo: revision.revisionNo, commercial: order };
}
