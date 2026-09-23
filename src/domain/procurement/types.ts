export type ProcurementObjectType =
  | 'MATERIAL'
  | 'FREE_TEXT'
  | 'SERVICE'
  | 'LIMIT_SERVICE'
  | 'ASSET'
  | 'SUBCONTRACT'
  | 'CONSIGNMENT'
  | 'OTHER';

export type ExecutionScenario =
  | 'MAT_STOCK'
  | 'MAT_CONSUME'
  | 'MAT_FREE'
  | 'SERVICE'
  | 'SERVICE_LIMIT'
  | 'ASSET'
  | 'SUBCONTRACT'
  | 'CONSIGNMENT'
  | 'RETURN_PO'
  | 'OTHER';

export type ExecutionControlMode =
  | 'QUANTITY'
  | 'AMOUNT'
  | 'QUANTITY_AMOUNT'
  | 'LIMIT'
  | 'MILESTONE';

export type DocumentStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type FulfillmentStatus = 'OPEN' | 'PARTIAL' | 'COMPLETE' | 'BLOCKED' | 'OVERDUE';
export type ReceiptStatus = 'NOT_RECEIVED' | 'PARTIAL' | 'COMPLETE' | 'REVERSED' | 'RETURNED';
export type ApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type SapSyncStatus = 'WAITING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';

export interface PurchaseOrderStatus {
  documentStatus: DocumentStatus;
  fulfillmentStatus: FulfillmentStatus;
  receiptStatus: ReceiptStatus;
  approvalStatus?: ApprovalStatus;
  sapSyncStatus: SapSyncStatus;
}

export interface PurchaseOrderItem {
  id: string;
  poId: string;
  sapPoNo: string;
  itemNo: string;
  supplier: string;
  purchaseOrganization: string;
  objectType: ProcurementObjectType;
  executionScenario: ExecutionScenario;
  controlMode: ExecutionControlMode;
  content: string;
  materialCode?: string;
  materialGroup: string;
  specification?: string;
  orderedValue: number;
  executedValue: number;
  unit: string;
  currency?: 'CNY';
  expectedValue?: number;
  overallLimit?: number;
  plannedDate: string;
  batchManaged?: boolean;
  serialNumberManaged?: boolean;
  plant?: string;
  storageLocation?: string;
  status: PurchaseOrderStatus;
}

export interface PurchaseOrder {
  id: string;
  businessOrderNo: string;
  sapPoNo: string;
  source: 'CONTRACT' | 'REQUISITION' | 'SOURCING' | 'DIRECT' | 'EXTERNAL_SAP';
  supplier: string;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  orderDate: string;
  currency: 'CNY';
  amount: number;
  updatedAt: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
}

export type ExecutionEventType =
  | 'GOODS_RECEIPT'
  | 'SERVICE_ACCEPTANCE'
  | 'AMOUNT_CONFIRMATION'
  | 'GR_REVERSAL'
  | 'PURCHASE_RETURN'
  | 'RETURN_REVERSAL'
  | 'DELIVERY_COMPLETE';

export interface ExecutionEvent {
  id: string;
  type: ExecutionEventType;
  poId: string;
  itemId: string;
  businessDocumentNo: string;
  title: string;
  occurredAt: string;
  quantity?: number;
  amount?: number;
  unit?: string;
  operator: string;
  status: 'EFFECTIVE' | 'PROCESSING' | 'REVERSED';
  sapStatus: SapSyncStatus;
  sapDocumentNo?: string;
  parentId?: string;
}

export interface SapExecution {
  id: string;
  businessDocumentNo: string;
  businessAction: ExecutionEventType;
  sapPoNo: string;
  itemNo: string;
  executedAt: string;
  status: SapSyncStatus;
  sapDocumentNo?: string;
  errorSummary?: string;
  technicalCode?: string;
  requestId: string;
  canRetry: boolean;
}
