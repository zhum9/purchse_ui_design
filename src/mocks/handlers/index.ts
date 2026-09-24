import { delay, http, HttpResponse } from 'msw';
import { executionEvents } from '../fixtures/executionEvents';
import { purchaseOrderItems, purchaseOrders } from '../fixtures/purchaseOrders';
import { getDemandPoolItems, procurementDemands, procurementPlans } from '../fixtures/procurementPlanning';
import { sapExecutions } from '../fixtures/sapExecutions';
import type { DemandUpsertInput, PlanCreateInput, PlanOrderInput } from '@features/procurement-planning/api/procurementPlanningApi';
import type { DirectOrderUpsertInput } from '@features/purchase-order/api/purchaseOrderApi';
import type { ExecutionControlMode, ExecutionScenario, ProcurementObjectType, ProcurementPlanLine, PurchaseOrderItem } from '@domain/procurement/types';

const ok = <T,>(data: T) => HttpResponse.json({ success: true, data });
const apiPath = (path: string) => `*${path}`;

export const handlers = [
  http.get(apiPath('/api/procurement-demands/pool'), async ({ request }) => {
    await delay(220);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const department = url.searchParams.get('department') ?? '';
    const items = getDemandPoolItems().filter((item) => {
      const matchesKeyword = !keyword || [item.demandNo, item.demandTitle, item.content, item.materialCode ?? '', item.materialGroup].some((value) => value.toLowerCase().includes(keyword));
      return matchesKeyword && (!department || item.department === department);
    });
    return ok({ items, page: 1, pageSize: 50, total: items.length });
  }),
  http.get(apiPath('/api/procurement-demands'), async ({ request }) => {
    await delay(240);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'ALL';
    const department = url.searchParams.get('department') ?? '';
    const items = procurementDemands.filter((demand) => {
      const matchesKeyword = !keyword || [demand.demandNo, demand.title, demand.applicant, demand.department].some((value) => value.toLowerCase().includes(keyword));
      return matchesKeyword && (status === 'ALL' || demand.status === status) && (!department || demand.department === department);
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.post(apiPath('/api/procurement-demands'), async ({ request }) => {
    await delay(420);
    const input = await request.json() as DemandUpsertInput;
    const timestamp = Date.now();
    const id = `DEM-${timestamp}`;
    const createdAt = new Date().toISOString();
    const lines = input.lines.map((line, index) => ({
      ...line,
      id: `${id}-${String((index + 1) * 10).padStart(2, '0')}`,
      demandId: id,
      lineNo: String((index + 1) * 10).padStart(4, '0'),
      plannedQuantity: 0,
      estimatedAmount: line.quantity * line.estimatedUnitPrice,
      status: 'OPEN' as const,
    }));
    const demand = {
      ...input,
      id,
      demandNo: `PR${new Date().toISOString().slice(0, 10).replaceAll('-', '')}${String(procurementDemands.length + 1).padStart(3, '0')}`,
      approvalStatus: 'PENDING' as const,
      estimatedAmount: lines.reduce((sum, line) => sum + line.estimatedAmount, 0),
      createdAt,
      updatedAt: createdAt,
      lines,
    };
    procurementDemands.unshift(demand);
    return ok(demand);
  }),
  http.put(apiPath('/api/procurement-demands/:id'), async ({ params, request }) => {
    await delay(360);
    const input = await request.json() as DemandUpsertInput;
    const index = procurementDemands.findIndex((item) => item.id === params.id);
    if (index < 0) return HttpResponse.json({ success: false, data: null, message: '未找到采购需求。' }, { status: 404 });
    const current = procurementDemands[index];
    const lines = input.lines.map((line, lineIndex) => ({
      ...line,
      id: line.id ?? `${current.id}-${String((lineIndex + 1) * 10).padStart(2, '0')}`,
      demandId: current.id,
      lineNo: String((lineIndex + 1) * 10).padStart(4, '0'),
      plannedQuantity: 0,
      estimatedAmount: line.quantity * line.estimatedUnitPrice,
      status: 'OPEN' as const,
    }));
    const demand = { ...current, ...input, approvalStatus: 'PENDING' as const, estimatedAmount: lines.reduce((sum, line) => sum + line.estimatedAmount, 0), updatedAt: new Date().toISOString(), lines };
    procurementDemands[index] = demand;
    return ok(demand);
  }),
  http.post(apiPath('/api/procurement-demands/:id/approve'), async ({ params }) => {
    await delay(300);
    const demand = procurementDemands.find((item) => item.id === params.id);
    if (!demand) return HttpResponse.json({ success: false, data: null, message: '未找到采购需求。' }, { status: 404 });
    demand.status = 'APPROVED';
    demand.approvalStatus = 'APPROVED';
    demand.updatedAt = new Date().toISOString();
    return ok(demand);
  }),
  http.get(apiPath('/api/procurement-plans'), async ({ request }) => {
    await delay(240);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'ALL';
    const purchaseOrganization = url.searchParams.get('purchaseOrganization') ?? '';
    const items = procurementPlans.filter((plan) => {
      const matchesKeyword = !keyword || [plan.planNo, plan.name, plan.owner].some((value) => value.toLowerCase().includes(keyword));
      return matchesKeyword && (status === 'ALL' || plan.status === status) && (!purchaseOrganization || plan.purchaseOrganization === purchaseOrganization);
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.get(apiPath('/api/procurement-plans/:id'), async ({ params }) => {
    await delay(180);
    const plan = procurementPlans.find((item) => item.id === params.id);
    return plan ? ok(plan) : HttpResponse.json({ success: false, data: null, message: '未找到采购计划。' }, { status: 404 });
  }),
  http.post(apiPath('/api/procurement-plans'), async ({ request }) => {
    await delay(460);
    const input = await request.json() as PlanCreateInput;
    const selected = getDemandPoolItems().filter((item) => input.demandLineIds.includes(item.id));
    if (!selected.length) return HttpResponse.json({ success: false, data: null, message: '请选择需求明细。' }, { status: 400 });
    const timestamp = Date.now();
    const id = `PLAN-${timestamp}`;
    const grouped = new Map<string, ProcurementPlanLine>();
    selected.forEach((item) => {
      const remaining = item.quantity - item.plannedQuantity;
      const key = [item.objectType, item.materialCode ?? item.content, item.unit, item.plant ?? ''].join('|');
      const existing = grouped.get(key);
      if (existing) {
        existing.plannedQuantity += remaining;
        existing.estimatedAmount += remaining * item.estimatedUnitPrice;
        existing.sourceDemandLineIds.push(item.id);
        if (!existing.sourceDemandNos.includes(item.demandNo)) existing.sourceDemandNos.push(item.demandNo);
        if (item.suggestedSupplier && !existing.suggestedSuppliers.includes(item.suggestedSupplier)) existing.suggestedSuppliers.push(item.suggestedSupplier);
      } else {
        grouped.set(key, {
          id: `${id}-${String((grouped.size + 1) * 10).padStart(2, '0')}`, planId: id, lineNo: String((grouped.size + 1) * 10).padStart(4, '0'),
          sourceDemandLineIds: [item.id], sourceDemandNos: [item.demandNo], objectType: item.objectType, content: item.content,
          materialCode: item.materialCode, materialGroup: item.materialGroup, suggestedSuppliers: item.suggestedSupplier ? [item.suggestedSupplier] : [], specification: item.specification, plannedQuantity: remaining,
          orderedQuantity: 0, unit: item.unit, estimatedUnitPrice: item.estimatedUnitPrice, estimatedAmount: remaining * item.estimatedUnitPrice,
          requiredDate: item.requiredDate, plant: item.plant,
        });
      }
      const demand = procurementDemands.find((entry) => entry.id === item.demandId);
      const demandLine = demand?.lines.find((entry) => entry.id === item.id);
      if (demandLine) {
        demandLine.plannedQuantity = demandLine.quantity;
        demandLine.status = 'PLANNED';
        demand!.status = demand!.lines.every((line) => line.status === 'PLANNED') ? 'PLANNED' : 'PARTIALLY_PLANNED';
      }
    });
    const lines = [...grouped.values()];
    const now = new Date().toISOString();
    const plan = {
      ...input,
      id,
      planNo: `PP${now.slice(0, 10).replaceAll('-', '')}${String(procurementPlans.length + 1).padStart(3, '0')}`,
      status: 'PENDING_APPROVAL' as const,
      approvalStatus: 'PENDING' as const,
      estimatedAmount: lines.reduce((sum, line) => sum + line.estimatedAmount, 0),
      createdAt: now,
      updatedAt: now,
      lines,
    };
    procurementPlans.unshift(plan);
    return ok(plan);
  }),
  http.post(apiPath('/api/procurement-plans/:id/approve'), async ({ params }) => {
    await delay(320);
    const plan = procurementPlans.find((item) => item.id === params.id);
    if (!plan) return HttpResponse.json({ success: false, data: null, message: '未找到采购计划。' }, { status: 404 });
    plan.status = 'APPROVED';
    plan.approvalStatus = 'APPROVED';
    plan.updatedAt = new Date().toISOString();
    return ok(plan);
  }),
  http.post(apiPath('/api/procurement-plans/:id/purchase-orders'), async ({ params, request }) => {
    await delay(520);
    const input = await request.json() as PlanOrderInput;
    const plan = procurementPlans.find((item) => item.id === params.id);
    if (!plan) return HttpResponse.json({ success: false, data: null, message: '未找到采购计划。' }, { status: 404 });
    const selected = plan.lines.filter((line) => input.planLineIds.includes(line.id) && line.orderedQuantity < line.plannedQuantity);
    if (!selected.length) return HttpResponse.json({ success: false, data: null, message: '没有可生成订单的计划明细。' }, { status: 400 });
    const orderId = `PO-${Date.now()}`;
    const businessOrderNo = `PO${input.orderDate.replaceAll('-', '')}${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const mapScenario = (objectType: ProcurementObjectType): { scenario: ExecutionScenario; control: ExecutionControlMode } => {
      if (objectType === 'SERVICE') return { scenario: 'SERVICE', control: 'AMOUNT' };
      if (objectType === 'LIMIT_SERVICE') return { scenario: 'SERVICE_LIMIT', control: 'LIMIT' };
      if (objectType === 'FREE_TEXT') return { scenario: 'MAT_FREE', control: 'QUANTITY' };
      return { scenario: 'MAT_STOCK', control: 'QUANTITY_AMOUNT' };
    };
    const items: PurchaseOrderItem[] = selected.map((line, index) => {
      const remaining = line.plannedQuantity - line.orderedQuantity;
      const mapped = mapScenario(line.objectType);
      line.orderedQuantity = line.plannedQuantity;
      return {
        id: `${orderId}-${String((index + 1) * 10).padStart(2, '0')}`, poId: orderId, sapPoNo: '', itemNo: String((index + 1) * 10).padStart(5, '0'),
        supplier: input.supplier, purchaseOrganization: plan.purchaseOrganization, objectType: line.objectType, executionScenario: mapped.scenario,
        controlMode: mapped.control, content: line.content, materialCode: line.materialCode, materialGroup: line.materialGroup,
        specification: line.specification, orderedValue: remaining, executedValue: 0, unit: line.unit, currency: 'CNY', plannedDate: line.requiredDate,
        plant: line.plant, status: { documentStatus: 'ACTIVE', fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', approvalStatus: 'APPROVED', sapSyncStatus: 'WAITING' },
      };
    });
    purchaseOrderItems.push(...items);
    purchaseOrders.unshift({
      id: orderId, businessOrderNo, sapPoNo: '', source: 'PLAN', sourceDocumentNo: plan.planNo, planId: plan.id,
      supplier: input.supplier, purchaseOrganization: plan.purchaseOrganization, purchaseGroup: input.purchaseGroup, company: input.company,
      orderDate: input.orderDate, currency: 'CNY', amount: selected.reduce((sum, line) => sum + (line.plannedQuantity * line.estimatedUnitPrice), 0),
      updatedAt: new Date().toISOString(), status: { documentStatus: 'ACTIVE', fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', approvalStatus: 'APPROVED', sapSyncStatus: 'WAITING' }, items,
    });
    plan.status = plan.lines.every((line) => line.orderedQuantity >= line.plannedQuantity) ? 'ORDERED' : 'PARTIALLY_ORDERED';
    plan.updatedAt = new Date().toISOString();
    return ok({ orderId, businessOrderNo });
  }),
  http.get(apiPath('/api/purchase-orders'), async ({ request }) => {
    await delay(280);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const status = url.searchParams.get('status') ?? 'ALL';
    const purchaseOrganization = url.searchParams.get('purchaseOrganization') ?? '';
    const items = purchaseOrders.filter((order) => {
      const matchesKeyword = !keyword || [order.sapPoNo, order.businessOrderNo, order.supplier].some((value) => value.toLowerCase().includes(keyword));
      const matchesStatus = status === 'ALL' || order.status.fulfillmentStatus === status || (status === 'EXCEPTION' && ['FAILED', 'UNKNOWN'].includes(order.status.sapSyncStatus));
      const matchesOrganization = !purchaseOrganization || order.purchaseOrganization === purchaseOrganization;
      return matchesKeyword && matchesStatus && matchesOrganization;
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.get(apiPath('/api/purchase-orders/:id'), async ({ params }) => {
    await delay(220);
    const order = purchaseOrders.find((item) => item.id === params.id);
    return order ? ok(order) : HttpResponse.json({ success: false, data: null, message: '未找到采购订单。' }, { status: 404 });
  }),
  http.post(apiPath('/api/purchase-orders'), async ({ request }) => {
    await delay(480);
    const input = await request.json() as DirectOrderUpsertInput;
    const orderId = `PO-${Date.now()}`;
    const businessOrderNo = `PO${input.orderDate.replaceAll('-', '')}${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    const items: PurchaseOrderItem[] = input.items.map((line, index) => ({
      id: `${orderId}-${String((index + 1) * 10).padStart(2, '0')}`, poId: orderId, sapPoNo: '', itemNo: String((index + 1) * 10).padStart(5, '0'),
      supplier: input.supplier, purchaseOrganization: input.purchaseOrganization, objectType: line.objectType, executionScenario: line.executionScenario,
      controlMode: line.executionScenario === 'SERVICE_LIMIT' ? 'LIMIT' : line.executionScenario === 'SERVICE' ? 'AMOUNT' : 'QUANTITY_AMOUNT',
      content: line.content, materialCode: line.materialCode, materialGroup: line.materialGroup, specification: line.specification,
      orderedValue: line.executionScenario === 'SERVICE' ? line.quantity * line.unitPrice : line.quantity, unitPrice: line.unitPrice, executedValue: 0,
      unit: line.executionScenario === 'SERVICE' ? '元' : line.unit, currency: 'CNY', plannedDate: line.plannedDate, plant: line.plant, storageLocation: line.storageLocation,
      status: { documentStatus: input.submit ? 'ACTIVE' : 'DRAFT', fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', approvalStatus: input.submit ? 'PENDING' : 'NOT_REQUIRED', sapSyncStatus: 'WAITING' },
    }));
    const order = {
      id: orderId, businessOrderNo, sapPoNo: '', source: 'DIRECT' as const, supplier: input.supplier, purchaseOrganization: input.purchaseOrganization,
      purchaseGroup: input.purchaseGroup, company: input.company, orderDate: input.orderDate, currency: 'CNY' as const,
      amount: input.items.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0), updatedAt: new Date().toISOString(),
      status: { documentStatus: input.submit ? 'ACTIVE' as const : 'DRAFT' as const, fulfillmentStatus: 'OPEN' as const, receiptStatus: 'NOT_RECEIVED' as const, approvalStatus: input.submit ? 'PENDING' as const : 'NOT_REQUIRED' as const, sapSyncStatus: 'WAITING' as const },
      items,
    };
    purchaseOrderItems.push(...items);
    purchaseOrders.unshift(order);
    return ok(order);
  }),
  http.put(apiPath('/api/purchase-orders/:id'), async ({ params, request }) => {
    await delay(420);
    const input = await request.json() as DirectOrderUpsertInput;
    const index = purchaseOrders.findIndex((item) => item.id === params.id);
    if (index < 0) return HttpResponse.json({ success: false, data: null, message: '未找到采购订单。' }, { status: 404 });
    const current = purchaseOrders[index];
    if (current.source !== 'DIRECT' || current.status.documentStatus !== 'DRAFT') return HttpResponse.json({ success: false, data: null, message: '当前订单不允许直接编辑。' }, { status: 409 });
    const items: PurchaseOrderItem[] = input.items.map((line, lineIndex) => ({
      id: line.id ?? `${current.id}-${String((lineIndex + 1) * 10).padStart(2, '0')}`, poId: current.id, sapPoNo: '', itemNo: String((lineIndex + 1) * 10).padStart(5, '0'),
      supplier: input.supplier, purchaseOrganization: input.purchaseOrganization, objectType: line.objectType, executionScenario: line.executionScenario,
      controlMode: line.executionScenario === 'SERVICE_LIMIT' ? 'LIMIT' : line.executionScenario === 'SERVICE' ? 'AMOUNT' : 'QUANTITY_AMOUNT',
      content: line.content, materialCode: line.materialCode, materialGroup: line.materialGroup, specification: line.specification,
      orderedValue: line.executionScenario === 'SERVICE' ? line.quantity * line.unitPrice : line.quantity, unitPrice: line.unitPrice, executedValue: 0,
      unit: line.executionScenario === 'SERVICE' ? '元' : line.unit, currency: 'CNY', plannedDate: line.plannedDate, plant: line.plant, storageLocation: line.storageLocation,
      status: { documentStatus: input.submit ? 'ACTIVE' : 'DRAFT', fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', approvalStatus: input.submit ? 'PENDING' : 'NOT_REQUIRED', sapSyncStatus: 'WAITING' },
    }));
    const order = { ...current, ...input, sapPoNo: '', source: 'DIRECT' as const, currency: 'CNY' as const, amount: input.items.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0), updatedAt: new Date().toISOString(), status: { documentStatus: input.submit ? 'ACTIVE' as const : 'DRAFT' as const, fulfillmentStatus: 'OPEN' as const, receiptStatus: 'NOT_RECEIVED' as const, approvalStatus: input.submit ? 'PENDING' as const : 'NOT_REQUIRED' as const, sapSyncStatus: 'WAITING' as const }, items };
    purchaseOrders[index] = order;
    return ok(order);
  }),
  http.get(apiPath('/api/fulfillment/items'), async ({ request }) => {
    await delay(320);
    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.toLowerCase() ?? '';
    const scenario = url.searchParams.get('scenario') ?? 'ALL';
    const status = url.searchParams.get('status') ?? 'ALL';
    const purchaseOrganization = url.searchParams.get('purchaseOrganization') ?? '';
    const items = purchaseOrderItems.filter((item) => {
      const matchesKeyword = !keyword || [item.sapPoNo, item.supplier, item.content].some((value) => value.toLowerCase().includes(keyword));
      const matchesScenario = scenario === 'ALL' || item.executionScenario === scenario;
      const matchesOrganization = !purchaseOrganization || item.purchaseOrganization === purchaseOrganization;
      const isException = ['FAILED', 'UNKNOWN'].includes(item.status.sapSyncStatus) || item.status.fulfillmentStatus === 'OVERDUE';
      const matchesStatus = status === 'ALL' || item.status.fulfillmentStatus === status || (status === 'EXCEPTION' && isException);
      return matchesKeyword && matchesScenario && matchesOrganization && matchesStatus;
    });
    return ok({ items, page: 1, pageSize: 20, total: items.length });
  }),
  http.get(apiPath('/api/execution-events'), async ({ request }) => {
    await delay(180);
    const poId = new URL(request.url).searchParams.get('poId');
    return ok(poId ? executionEvents.filter((event) => event.poId === poId) : executionEvents);
  }),
  http.get(apiPath('/api/sap/executions'), async () => {
    await delay(260);
    return ok({ items: sapExecutions, page: 1, pageSize: 20, total: sapExecutions.length });
  }),
  http.post(apiPath('/api/executions'), async () => {
    await delay(650);
    return ok({ businessDocumentNo: `EX${Date.now()}`, sapStatus: 'PROCESSING' });
  }),
  http.post(apiPath('/api/sap/executions/:id/reconcile'), async ({ params }) => {
    await delay(700);
    return ok({ id: params.id, status: 'SUCCESS', sapDocumentNo: '5000123999' });
  }),
];
