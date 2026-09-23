import type { SapExecution } from '@domain/procurement/types';

export const sapExecutions: SapExecution[] = [
  { id: 'SAP-001', businessDocumentNo: 'GR20260907003', businessAction: 'GOODS_RECEIPT', sapPoNo: '4500012345', itemNo: '00010', executedAt: '2026-09-07T09:41:00', status: 'SUCCESS', sapDocumentNo: '5000123511', requestId: 'REQ-GR-20260907-003', canRetry: false },
  { id: 'SAP-002', businessDocumentNo: 'GR20260911005', businessAction: 'GOODS_RECEIPT', sapPoNo: '4500023088', itemNo: '00010', executedAt: '2026-09-11T10:05:00', status: 'FAILED', errorSummary: '库存地点 1010 暂不允许该物料收货，请核对采购订单库存地点。', technicalCode: 'M7-021', requestId: 'REQ-GR-20260911-005', canRetry: true },
  { id: 'SAP-003', businessDocumentNo: 'SA20260911002', businessAction: 'SERVICE_ACCEPTANCE', sapPoNo: '4500020010', itemNo: '00010', executedAt: '2026-09-11T09:55:00', status: 'PROCESSING', requestId: 'REQ-SA-20260911-002', canRetry: false },
  { id: 'SAP-004', businessDocumentNo: 'SA20260911003', businessAction: 'SERVICE_ACCEPTANCE', sapPoNo: '4500023412', itemNo: '00010', executedAt: '2026-09-11T10:22:00', status: 'UNKNOWN', errorSummary: '请求已发送，但未在规定时间内收到 SAP 结果。请先核对 SAP 状态。', technicalCode: 'GATEWAY-TIMEOUT', requestId: 'REQ-SA-20260911-003', canRetry: false },
  { id: 'SAP-005', businessDocumentNo: 'RT20260909001', businessAction: 'PURCHASE_RETURN', sapPoNo: '4500012345', itemNo: '00010', executedAt: '2026-09-09T11:26:00', status: 'SUCCESS', sapDocumentNo: '5000123590', requestId: 'REQ-RT-20260909-001', canRetry: false },
  { id: 'SAP-006', businessDocumentNo: 'RV20260906002', businessAction: 'GR_REVERSAL', sapPoNo: '4500012345', itemNo: '00010', executedAt: '2026-09-06T15:07:00', status: 'SUCCESS', sapDocumentNo: '5000123472', requestId: 'REQ-RV-20260906-002', canRetry: false },
];
