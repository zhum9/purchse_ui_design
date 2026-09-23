import type { ExecutionEvent } from '@domain/procurement/types';

export const executionEvents: ExecutionEvent[] = [
  { id: 'EV-001', type: 'GOODS_RECEIPT', poId: 'PO-001', itemId: 'PO-001-10', businessDocumentNo: 'GR20260903001', title: '玉米到货收货', occurredAt: '2026-09-03T10:18:00', quantity: 500, unit: '吨', operator: '王磊', status: 'EFFECTIVE', sapStatus: 'SUCCESS', sapDocumentNo: '5000123401' },
  { id: 'EV-002', type: 'GOODS_RECEIPT', poId: 'PO-001', itemId: 'PO-001-10', businessDocumentNo: 'GR20260906008', title: '玉米第二批收货', occurredAt: '2026-09-06T14:32:00', quantity: 300, unit: '吨', operator: '王磊', status: 'REVERSED', sapStatus: 'SUCCESS', sapDocumentNo: '5000123468' },
  { id: 'EV-003', type: 'GR_REVERSAL', poId: 'PO-001', itemId: 'PO-001-10', businessDocumentNo: 'RV20260906002', title: '错误数量收货冲销', occurredAt: '2026-09-06T15:06:00', quantity: -300, unit: '吨', operator: '张敏', status: 'EFFECTIVE', sapStatus: 'SUCCESS', sapDocumentNo: '5000123472', parentId: 'EV-002' },
  { id: 'EV-004', type: 'GOODS_RECEIPT', poId: 'PO-001', itemId: 'PO-001-10', businessDocumentNo: 'GR20260907003', title: '玉米更正后收货', occurredAt: '2026-09-07T09:40:00', quantity: 250, unit: '吨', operator: '王磊', status: 'EFFECTIVE', sapStatus: 'SUCCESS', sapDocumentNo: '5000123511' },
  { id: 'EV-005', type: 'PURCHASE_RETURN', poId: 'PO-001', itemId: 'PO-001-10', businessDocumentNo: 'RT20260909001', title: '质量复检不合格退货', occurredAt: '2026-09-09T11:25:00', quantity: -50, unit: '吨', operator: '刘颖', status: 'EFFECTIVE', sapStatus: 'SUCCESS', sapDocumentNo: '5000123590', parentId: 'EV-004' },
  { id: 'EV-006', type: 'SERVICE_ACCEPTANCE', poId: 'PO-002', itemId: 'PO-002-10', businessDocumentNo: 'SA20260905001', title: '上半年运维服务验收', occurredAt: '2026-09-05T16:20:00', amount: 600000, operator: '赵强', status: 'EFFECTIVE', sapStatus: 'SUCCESS', sapDocumentNo: '1000048210' },
];
