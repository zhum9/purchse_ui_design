import type { PurchaseOrder, PurchaseOrderItem } from '@domain/procurement/types';

const baseStatus = {
  documentStatus: 'ACTIVE' as const,
  approvalStatus: 'APPROVED' as const,
};

export const purchaseOrderItems: PurchaseOrderItem[] = [
  {
    id: 'PO-001-10', poId: 'PO-001', sapPoNo: '4500012345', itemNo: '00010',
    supplier: '辽宁丰禾粮食有限公司', purchaseOrganization: '原料采购中心',
    objectType: 'MATERIAL', executionScenario: 'MAT_STOCK', controlMode: 'QUANTITY_AMOUNT',
    content: '一级玉米', materialCode: 'MAT00001', materialGroup: '原粮', specification: '国标一级，水分≤14.5%',
    orderedValue: 1000, executedValue: 700, unit: '吨', plannedDate: '2026-09-18',
    batchManaged: true, plant: '沈阳工厂（1000）', storageLocation: '原粮一库（1001）',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'PARTIAL', sapSyncStatus: 'SUCCESS' },
  },
  {
    id: 'PO-001-20', poId: 'PO-001', sapPoNo: '4500012345', itemNo: '00020',
    supplier: '辽宁丰禾粮食有限公司', purchaseOrganization: '原料采购中心',
    objectType: 'FREE_TEXT', executionScenario: 'MAT_FREE', controlMode: 'QUANTITY',
    content: '生产车间临时维修耗材', materialGroup: '维修耗材',
    orderedValue: 20, executedValue: 12, unit: '批', plannedDate: '2026-09-20', plant: '沈阳工厂（1000）',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'PARTIAL', sapSyncStatus: 'SUCCESS' },
  },
  {
    id: 'PO-002-10', poId: 'PO-002', sapPoNo: '4500020010', itemNo: '00010',
    supplier: '华信数智科技有限公司', purchaseOrganization: '间接采购部',
    objectType: 'SERVICE', executionScenario: 'SERVICE', controlMode: 'AMOUNT',
    content: 'SAP系统年度运维服务', materialGroup: 'IT服务',
    orderedValue: 1200000, executedValue: 600000, unit: '元', currency: 'CNY', plannedDate: '2026-09-15',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'PROCESSING' },
  },
  {
    id: 'PO-003-10', poId: 'PO-003', sapPoNo: '4500021048', itemNo: '00010',
    supplier: '北方机电维修服务有限公司', purchaseOrganization: '间接采购部',
    objectType: 'LIMIT_SERVICE', executionScenario: 'SERVICE_LIMIT', controlMode: 'LIMIT',
    content: '2026年度设备零星维修', materialGroup: '维修服务',
    orderedValue: 100000, expectedValue: 100000, overallLimit: 150000, executedValue: 63500,
    unit: '元', currency: 'CNY', plannedDate: '2026-09-28',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'SUCCESS' },
  },
  {
    id: 'PO-004-10', poId: 'PO-004', sapPoNo: '4500022361', itemNo: '00010',
    supplier: '中粮包装科技有限公司', purchaseOrganization: '生产采购部',
    objectType: 'MATERIAL', executionScenario: 'MAT_STOCK', controlMode: 'QUANTITY_AMOUNT',
    content: '食品级复合包装袋', materialCode: 'MAT00326', materialGroup: '包装材料', specification: '50kg/袋',
    orderedValue: 50000, executedValue: 50000, unit: '件', plannedDate: '2026-09-05',
    batchManaged: false, plant: '大连工厂（1200）', storageLocation: '包材库（1201）',
    status: { ...baseStatus, fulfillmentStatus: 'COMPLETE', receiptStatus: 'COMPLETE', sapSyncStatus: 'SUCCESS' },
  },
  {
    id: 'PO-005-10', poId: 'PO-005', sapPoNo: '4500023088', itemNo: '00010',
    supplier: '精工自动化设备有限公司', purchaseOrganization: '设备采购部',
    objectType: 'MATERIAL', executionScenario: 'MAT_CONSUME', controlMode: 'QUANTITY_AMOUNT',
    content: '输送线驱动电机', materialCode: 'MAT00881', materialGroup: '机械备件', specification: 'YE4-160M-4',
    orderedValue: 8, executedValue: 0, unit: '台', plannedDate: '2026-09-08',
    serialNumberManaged: true, plant: '沈阳工厂（1000）', storageLocation: '备件库（1010）',
    status: { ...baseStatus, fulfillmentStatus: 'OVERDUE', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'FAILED' },
  },
  {
    id: 'PO-006-10', poId: 'PO-006', sapPoNo: '4500023412', itemNo: '00010',
    supplier: '安衡检测认证有限公司', purchaseOrganization: '间接采购部',
    objectType: 'SERVICE', executionScenario: 'SERVICE', controlMode: 'MILESTONE',
    content: '仓储设备年度安全检测', materialGroup: '检测服务',
    orderedValue: 180000, executedValue: 0, unit: '元', currency: 'CNY', plannedDate: '2026-09-30',
    status: { ...baseStatus, fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'UNKNOWN' },
  },
];

const itemsOf = (poId: string) => purchaseOrderItems.filter((item) => item.poId === poId);

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'PO-001', businessOrderNo: 'PO20260901001', sapPoNo: '4500012345', source: 'CONTRACT',
    supplier: '辽宁丰禾粮食有限公司', purchaseOrganization: '原料采购中心', purchaseGroup: '粮食采购组', company: '北方粮食集团',
    orderDate: '2026-09-01', currency: 'CNY', amount: 2680000, updatedAt: '2026-09-11T09:32:00',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'PARTIAL', sapSyncStatus: 'SUCCESS' }, items: itemsOf('PO-001'),
  },
  {
    id: 'PO-002', businessOrderNo: 'PO20260902006', sapPoNo: '4500020010', source: 'SOURCING',
    supplier: '华信数智科技有限公司', purchaseOrganization: '间接采购部', purchaseGroup: 'IT采购组', company: '北方粮食集团',
    orderDate: '2026-09-02', currency: 'CNY', amount: 1200000, updatedAt: '2026-09-11T08:18:00',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'PROCESSING' }, items: itemsOf('PO-002'),
  },
  {
    id: 'PO-003', businessOrderNo: 'PO20260903003', sapPoNo: '4500021048', source: 'DIRECT',
    supplier: '北方机电维修服务有限公司', purchaseOrganization: '间接采购部', purchaseGroup: '维修服务组', company: '北方粮食集团',
    orderDate: '2026-09-03', currency: 'CNY', amount: 150000, updatedAt: '2026-09-10T16:45:00',
    status: { ...baseStatus, fulfillmentStatus: 'PARTIAL', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'SUCCESS' }, items: itemsOf('PO-003'),
  },
  {
    id: 'PO-004', businessOrderNo: 'PO20260822018', sapPoNo: '4500022361', source: 'REQUISITION',
    supplier: '中粮包装科技有限公司', purchaseOrganization: '生产采购部', purchaseGroup: '包材采购组', company: '北方粮食集团',
    orderDate: '2026-08-22', currency: 'CNY', amount: 425000, updatedAt: '2026-09-09T14:02:00',
    status: { ...baseStatus, fulfillmentStatus: 'COMPLETE', receiptStatus: 'COMPLETE', sapSyncStatus: 'SUCCESS' }, items: itemsOf('PO-004'),
  },
  {
    id: 'PO-005', businessOrderNo: 'PO20260828009', sapPoNo: '4500023088', source: 'EXTERNAL_SAP',
    supplier: '精工自动化设备有限公司', purchaseOrganization: '设备采购部', purchaseGroup: '机械设备组', company: '北方粮食集团',
    orderDate: '2026-08-28', currency: 'CNY', amount: 112000, updatedAt: '2026-09-11T10:05:00',
    status: { ...baseStatus, fulfillmentStatus: 'OVERDUE', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'FAILED' }, items: itemsOf('PO-005'),
  },
  {
    id: 'PO-006', businessOrderNo: 'PO20260908012', sapPoNo: '4500023412', source: 'SOURCING',
    supplier: '安衡检测认证有限公司', purchaseOrganization: '间接采购部', purchaseGroup: '质量服务组', company: '北方粮食集团',
    orderDate: '2026-09-08', currency: 'CNY', amount: 180000, updatedAt: '2026-09-11T10:22:00',
    status: { ...baseStatus, fulfillmentStatus: 'OPEN', receiptStatus: 'NOT_RECEIVED', sapSyncStatus: 'UNKNOWN' }, items: itemsOf('PO-006'),
  },
];
