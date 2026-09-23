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
export type ProcurementDemandStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_PLANNED' | 'PLANNED' | 'REJECTED' | 'CANCELLED';
export type DemandLineStatus = 'OPEN' | 'PARTIALLY_PLANNED' | 'PLANNED' | 'CANCELLED';
export type ProcurementPlanStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PARTIALLY_ORDERED' | 'ORDERED' | 'CANCELLED';
export type ProcurementPriority = 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
export type ProcurementPlanType = 'CENTRALIZED' | 'FRAME_AGREEMENT' | 'DIRECT';
export type PurchaseOrderSource = 'CONTRACT' | 'REQUISITION' | 'SOURCING' | 'PLAN' | 'DIRECT' | 'EXTERNAL_SAP';

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
  unitPrice?: number;
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
  source: PurchaseOrderSource;
  sourceDocumentNo?: string;
  planId?: string;
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

export interface ProcurementDemandLine {
  id: string;
  demandId: string;
  lineNo: string;
  objectType: ProcurementObjectType;
  content: string;
  materialCode?: string;
  materialGroup: string;
  specification?: string;
  quantity: number;
  plannedQuantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedAmount: number;
  requiredDate: string;
  plant?: string;
  status: DemandLineStatus;
}

export interface ProcurementDemand {
  id: string;
  demandNo: string;
  title: string;
  department: string;
  applicant: string;
  company: string;
  costCenter?: string;
  priority: ProcurementPriority;
  requiredDate: string;
  estimatedAmount: number;
  status: ProcurementDemandStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  lines: ProcurementDemandLine[];
}

export interface DemandPoolItem extends ProcurementDemandLine {
  demandNo: string;
  demandTitle: string;
  department: string;
  applicant: string;
  priority: ProcurementPriority;
}

export interface ProcurementPlanLine {
  id: string;
  planId: string;
  lineNo: string;
  sourceDemandLineIds: string[];
  sourceDemandNos: string[];
  objectType: ProcurementObjectType;
  content: string;
  materialCode?: string;
  materialGroup: string;
  specification?: string;
  plannedQuantity: number;
  orderedQuantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedAmount: number;
  requiredDate: string;
  plant?: string;
}

export interface ProcurementPlan {
  id: string;
  planNo: string;
  name: string;
  type: ProcurementPlanType;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  owner: string;
  plannedOrderDate: string;
  estimatedAmount: number;
  status: ProcurementPlanStatus;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  lines: ProcurementPlanLine[];
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
