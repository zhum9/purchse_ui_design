import type { ApprovalStatus, DocumentStatus, ExecutionScenario, SapSyncStatus } from '@domain/procurement/types';

/** API ID / NUMBER values are strings. Display names belong to reference snapshots. */
export type DecimalValue = string;
export type RevisionStatus = 'WORKING' | 'SUBMITTED' | 'AUTHORIZED' | 'EFFECTIVE' | 'SUPERSEDED' | 'REJECTED' | 'WITHDRAWN';
export type PricingMethod = 'UNIT_PRICE' | 'FIXED_AMOUNT' | 'LIMIT';
export type AmountBasis = 'NET' | 'GROSS';

export interface OrderSource {
  sourceDocumentId: string;
  sourceRevisionId: string;
  sourceLineId: string;
  sourceDocumentNo: string;
  relationType: 'PLAN_ORDER' | 'DEMAND_ORDER';
  controlDimension: 'QTY' | 'AMOUNT';
  available: DecimalValue;
  referenceUnitPrice?: DecimalValue;
  requiredDate: string;
  suggestedSuppliers: string[];
}

/** pur_order_schedule; one default schedule is supported by this editor. */
export interface OrderSchedule {
  scheduleKey: string;
  requiredDate: string;
  deliveryLocationId?: string;
  recipientId?: string;
  addressSnapshot: string;
}

/** pur_order_line + stable pur_document_line identity; balances are not editable content. */
export interface CommercialLine {
  lineId: string;
  lineNo: string;
  productKind: 'GOODS' | 'SERVICE';
  stockMode: 'STOCK' | 'NON_STOCK' | 'NOT_APPLICABLE';
  identificationMode: 'CODED' | 'FREE_TEXT';
  itemRefId?: string;
  content: string;
  categoryId?: string;
  specification: string;
  executionScenario: ExecutionScenario;
  pricingMethod: PricingMethod;
  controlMode: 'QUANTITY' | 'AMOUNT' | 'QUANTITY_AMOUNT' | 'LIMIT';
  originMode: 'SOURCED' | 'DIRECT';
  orderedQty?: DecimalValue;
  orderUomId?: string;
  priceUomId?: string;
  enteredUnitPrice?: DecimalValue;
  priceQuantity: DecimalValue;
  priceInputBasis: AmountBasis;
  taxRate?: DecimalValue;
  taxConfirmed: boolean;
  priceConfirmed: boolean;
  fixedAmount?: DecimalValue;
  expectedAmount?: DecimalValue;
  overallLimit?: DecimalValue;
  amountBasis: AmountBasis;
  isFree: boolean;
  freeReason: string;
  plantId?: string;
  serviceStart: string;
  serviceEnd: string;
  acceptanceCriteria: string;
  acceptorId?: string;
  source?: OrderSource;
  schedule: OrderSchedule;
}

/** pur_order_header + company/owner from pur_document. */
export interface OrderDraft {
  companyId: string;
  purchaseOrgId?: string;
  purchaseGroupId?: string;
  buyerId: string;
  supplierId?: string;
  orderDate: string;
  currencyCode: string;
  paymentTermId?: string;
  deliveryTermId?: string;
  procurementReason: string;
  notes: string;
  lines: CommercialLine[];
}

export interface OrderRevision {
  id: string;
  documentId: string;
  revisionNo: number;
  baseRevisionId?: string;
  revisionStatus: RevisionStatus;
  approvalStatus: ApprovalStatus;
  changeReason?: string;
  submittedBy?: string;
  decisionComment?: string;
  decidedBy?: string;
  submittedAt?: string;
  effectiveAt?: string;
  content: OrderDraft;
}

export interface OrderDocument {
  id: string;
  documentNo: string;
  lifecycleStatus: DocumentStatus;
  rowVersion: number;
  effectiveRevisionId?: string;
  workingRevisionId?: string;
  sapSyncStatus: SapSyncStatus;
  sapPoNo?: string;
  updatedAt: string;
  revisions: OrderRevision[];
  deliveryNotes: Array<{ id: string; revisionId: string; lineId: string; expectedArrivalDate?: string; note: string; occurredAt: string; actorId: string }>;
}

export interface OrderSaveCommand {
  requestKey: string;
  id?: string;
  expectedRowVersion?: number;
  submit: boolean;
  content: OrderDraft;
}
export interface ValidationIssue { level: 'ERROR' | 'WARNING' | 'INFO'; path: string; message: string; lineId?: string }
export interface LineAmounts { net: string; tax: string; gross: string; exposureGross: string }
export interface OrderActionCommand {
  requestKey: string;
  expectedRowVersion: number;
  action: 'APPROVE' | 'REJECT' | 'WITHDRAW' | 'SIMULATE_ERP' | 'CHANGE' | 'REVISE';
  actorId: string;
  reason: string;
}
