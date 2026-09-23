import type {
  ExecutionEventType,
  ExecutionScenario,
  FulfillmentStatus,
  ReceiptStatus,
  SapSyncStatus,
} from './types';

export type StatusTone = 'success' | 'processing' | 'warning' | 'error' | 'default';

export const scenarioMeta: Record<ExecutionScenario, { label: string; color: string }> = {
  MAT_STOCK: { label: '库存物料', color: 'blue' },
  MAT_CONSUME: { label: '消耗性物料', color: 'cyan' },
  MAT_FREE: { label: '无物料号', color: 'geekblue' },
  SERVICE: { label: '服务采购', color: 'purple' },
  SERVICE_LIMIT: { label: '限额服务', color: 'gold' },
  ASSET: { label: '固定资产', color: 'lime' },
  SUBCONTRACT: { label: '外协采购', color: 'volcano' },
  CONSIGNMENT: { label: '寄售采购', color: 'cyan' },
  RETURN_PO: { label: '退货采购', color: 'red' },
  OTHER: { label: '其他', color: 'default' },
};

export const fulfillmentStatusMeta: Record<FulfillmentStatus, { label: string; tone: StatusTone }> = {
  OPEN: { label: '待执行', tone: 'warning' },
  PARTIAL: { label: '部分执行', tone: 'processing' },
  COMPLETE: { label: '执行完成', tone: 'success' },
  BLOCKED: { label: '已暂停', tone: 'error' },
  OVERDUE: { label: '已超期', tone: 'error' },
};

export const receiptStatusMeta: Record<ReceiptStatus, { label: string; tone: StatusTone }> = {
  NOT_RECEIVED: { label: '未收货', tone: 'default' },
  PARTIAL: { label: '部分收货', tone: 'processing' },
  COMPLETE: { label: '全部收货', tone: 'success' },
  REVERSED: { label: '已冲销', tone: 'default' },
  RETURNED: { label: '已退货', tone: 'warning' },
};

export const sapStatusMeta: Record<SapSyncStatus, { label: string; tone: StatusTone }> = {
  WAITING: { label: '待发送', tone: 'default' },
  PROCESSING: { label: 'SAP处理中', tone: 'processing' },
  SUCCESS: { label: 'SAP执行成功', tone: 'success' },
  FAILED: { label: 'SAP执行失败', tone: 'error' },
  UNKNOWN: { label: 'SAP状态待核对', tone: 'warning' },
};

export const eventTypeMeta: Record<ExecutionEventType, { label: string; tone: StatusTone }> = {
  GOODS_RECEIPT: { label: '采购收货', tone: 'processing' },
  SERVICE_ACCEPTANCE: { label: '服务验收', tone: 'processing' },
  AMOUNT_CONFIRMATION: { label: '执行确认', tone: 'processing' },
  GR_REVERSAL: { label: '收货冲销', tone: 'default' },
  PURCHASE_RETURN: { label: '采购退货', tone: 'warning' },
  RETURN_REVERSAL: { label: '退货冲销', tone: 'default' },
  DELIVERY_COMPLETE: { label: '交货完成', tone: 'success' },
};
