import type { DemandPoolItem, ProcurementDemand, ProcurementPlan } from '@domain/procurement/types';

export const procurementDemands: ProcurementDemand[] = [
  {
    id: 'DEM-001', demandNo: 'PR20260910001', title: '第四季度玉米原粮采购需求', department: '原料供应部', applicant: '王海峰',
    company: '北方粮食集团', priority: 'HIGH', requiredDate: '2026-10-15', estimatedAmount: 6250000,
    status: 'PARTIALLY_PLANNED', approvalStatus: 'APPROVED', createdAt: '2026-09-10T09:12:00', updatedAt: '2026-09-18T15:30:00',
    notes: '覆盖沈阳工厂第四季度生产计划，允许分批到货。',
    lines: [{
      id: 'DEM-001-10', demandId: 'DEM-001', lineNo: '0010', objectType: 'MATERIAL', content: '一级玉米', materialCode: 'MAT00001',
      materialGroup: '原粮', suggestedSupplier: '辽宁丰禾粮食有限公司', specification: '国标一级，水分≤14.5%', quantity: 2500, plannedQuantity: 1000, unit: '吨',
      estimatedUnitPrice: 2500, estimatedAmount: 6250000, requiredDate: '2026-10-15', plant: '沈阳工厂（1000）', status: 'PARTIALLY_PLANNED',
    }],
  },
  {
    id: 'DEM-002', demandNo: 'PR20260912006', title: '生产包装材料补充需求', department: '生产运营部', applicant: '赵雪',
    company: '北方粮食集团', costCenter: 'CC-PROD-1200', priority: 'NORMAL', requiredDate: '2026-10-08', estimatedAmount: 680000,
    status: 'APPROVED', approvalStatus: 'APPROVED', createdAt: '2026-09-12T13:20:00', updatedAt: '2026-09-16T10:05:00',
    lines: [
      {
        id: 'DEM-002-10', demandId: 'DEM-002', lineNo: '0010', objectType: 'MATERIAL', content: '食品级复合包装袋', materialCode: 'MAT00326',
        materialGroup: '包装材料', suggestedSupplier: '中粮包装科技有限公司', specification: '50kg/袋', quantity: 60000, plannedQuantity: 0, unit: '件', estimatedUnitPrice: 8.5,
        estimatedAmount: 510000, requiredDate: '2026-10-08', plant: '大连工厂（1200）', status: 'OPEN',
      },
      {
        id: 'DEM-002-20', demandId: 'DEM-002', lineNo: '0020', objectType: 'FREE_TEXT', content: '包装线标签及色带',
        materialGroup: '包装耗材', specification: '按生产批次配套供货', quantity: 20, plannedQuantity: 0, unit: '批', estimatedUnitPrice: 8500,
        estimatedAmount: 170000, requiredDate: '2026-10-10', plant: '大连工厂（1200）', status: 'OPEN',
      },
    ],
  },
  {
    id: 'DEM-003', demandNo: 'PR20260915003', title: '仓储输送设备维修需求', department: '设备管理部', applicant: '陈立',
    company: '北方粮食集团', costCenter: 'CC-EQP-1000', priority: 'URGENT', requiredDate: '2026-09-30', estimatedAmount: 198000,
    status: 'SUBMITTED', approvalStatus: 'PENDING', createdAt: '2026-09-15T08:46:00', updatedAt: '2026-09-20T11:18:00',
    notes: '3号输送线停机风险较高，审批后优先采购。',
    lines: [
      {
        id: 'DEM-003-10', demandId: 'DEM-003', lineNo: '0010', objectType: 'MATERIAL', content: '输送线驱动电机', materialCode: 'MAT00881',
        materialGroup: '机械备件', suggestedSupplier: '精工自动化设备有限公司', specification: 'YE4-160M-4', quantity: 6, plannedQuantity: 0, unit: '台', estimatedUnitPrice: 14000,
        estimatedAmount: 84000, requiredDate: '2026-09-30', plant: '沈阳工厂（1000）', status: 'OPEN',
      },
      {
        id: 'DEM-003-20', demandId: 'DEM-003', lineNo: '0020', objectType: 'SERVICE', content: '输送系统现场检修服务',
        materialGroup: '维修服务', suggestedSupplier: '北方机电维修服务有限公司', specification: '含拆装、调试及72小时运行验证', quantity: 1, plannedQuantity: 0, unit: '项', estimatedUnitPrice: 114000,
        estimatedAmount: 114000, requiredDate: '2026-10-05', plant: '沈阳工厂（1000）', status: 'OPEN',
      },
    ],
  },
  {
    id: 'DEM-004', demandNo: 'PR20260918009', title: '2027年度SAP系统运维服务需求', department: '数字化中心', applicant: '刘洋',
    company: '北方粮食集团', costCenter: 'CC-IT-001', priority: 'NORMAL', requiredDate: '2026-12-20', estimatedAmount: 1380000,
    status: 'APPROVED', approvalStatus: 'APPROVED', createdAt: '2026-09-18T10:30:00', updatedAt: '2026-09-22T16:42:00',
    lines: [{
      id: 'DEM-004-10', demandId: 'DEM-004', lineNo: '0010', objectType: 'SERVICE', content: 'SAP系统年度运维服务',
      materialGroup: 'IT服务', suggestedSupplier: '华信数智科技有限公司', specification: '覆盖MM、FI/CO、接口平台及7×24应急支持', quantity: 12, plannedQuantity: 0, unit: '月',
      estimatedUnitPrice: 115000, estimatedAmount: 1380000, requiredDate: '2026-12-20', status: 'OPEN',
    }],
  },
  {
    id: 'DEM-005', demandNo: 'PR20260922002', title: '仓储设备年度安全检测需求', department: '质量安全部', applicant: '孙悦',
    company: '北方粮食集团', costCenter: 'CC-QA-001', priority: 'LOW', requiredDate: '2027-01-15', estimatedAmount: 220000,
    status: 'DRAFT', approvalStatus: 'PENDING', createdAt: '2026-09-22T09:05:00', updatedAt: '2026-09-22T09:05:00',
    lines: [{
      id: 'DEM-005-10', demandId: 'DEM-005', lineNo: '0010', objectType: 'SERVICE', content: '仓储设备年度安全检测',
      materialGroup: '检测服务', suggestedSupplier: '安衡检测认证有限公司', specification: '覆盖三个粮库及两条输送线', quantity: 1, plannedQuantity: 0, unit: '项',
      estimatedUnitPrice: 220000, estimatedAmount: 220000, requiredDate: '2027-01-15', status: 'OPEN',
    }],
  },
];

export const procurementPlans: ProcurementPlan[] = [
  {
    id: 'PLAN-001', planNo: 'PP202609001', name: '第四季度原粮集中采购计划', type: 'CENTRALIZED', purchaseOrganization: '原料采购中心',
    purchaseGroup: '粮食采购组', company: '北方粮食集团', owner: '周建国', plannedOrderDate: '2026-09-28', estimatedAmount: 2500000,
    status: 'ORDERED', approvalStatus: 'APPROVED', createdAt: '2026-09-18T15:30:00', updatedAt: '2026-09-21T09:20:00',
    notes: '首批1000吨已形成订单，其余需求后续滚动纳入计划。',
    lines: [{
      id: 'PLAN-001-10', planId: 'PLAN-001', lineNo: '0010', sourceDemandLineIds: ['DEM-001-10'], sourceDemandNos: ['PR20260910001'],
      objectType: 'MATERIAL', content: '一级玉米', materialCode: 'MAT00001', materialGroup: '原粮', suggestedSuppliers: ['辽宁丰禾粮食有限公司'], specification: '国标一级，水分≤14.5%',
      plannedQuantity: 1000, orderedQuantity: 1000, unit: '吨', estimatedUnitPrice: 2500, estimatedAmount: 2500000,
      requiredDate: '2026-10-15', plant: '沈阳工厂（1000）',
    }],
  },
  {
    id: 'PLAN-002', planNo: 'PP202609002', name: '2027年度数字化服务采购计划', type: 'DIRECT', purchaseOrganization: '间接采购部',
    purchaseGroup: 'IT采购组', company: '北方粮食集团', owner: '张敏', plannedOrderDate: '2026-10-15', estimatedAmount: 1380000,
    status: 'APPROVED', approvalStatus: 'APPROVED', createdAt: '2026-09-22T16:45:00', updatedAt: '2026-09-23T08:20:00',
    lines: [{
      id: 'PLAN-002-10', planId: 'PLAN-002', lineNo: '0010', sourceDemandLineIds: ['DEM-004-10'], sourceDemandNos: ['PR20260918009'],
      objectType: 'SERVICE', content: 'SAP系统年度运维服务', materialGroup: 'IT服务', suggestedSuppliers: ['华信数智科技有限公司'], specification: '覆盖MM、FI/CO、接口平台及7×24应急支持',
      plannedQuantity: 12, orderedQuantity: 0, unit: '月', estimatedUnitPrice: 115000, estimatedAmount: 1380000, requiredDate: '2026-12-20',
    }],
  },
  {
    id: 'PLAN-003', planNo: 'PP202609003', name: '十月生产包装材料采购计划', type: 'CENTRALIZED', purchaseOrganization: '生产采购部',
    purchaseGroup: '包材采购组', company: '北方粮食集团', owner: '赵雪', plannedOrderDate: '2026-09-30', estimatedAmount: 680000,
    status: 'DRAFT', approvalStatus: 'PENDING', createdAt: '2026-09-23T09:10:00', updatedAt: '2026-09-23T09:10:00',
    lines: [
      {
        id: 'PLAN-003-10', planId: 'PLAN-003', lineNo: '0010', sourceDemandLineIds: ['DEM-002-10'], sourceDemandNos: ['PR20260912006'],
        objectType: 'MATERIAL', content: '食品级复合包装袋', materialCode: 'MAT00326', materialGroup: '包装材料', suggestedSuppliers: ['中粮包装科技有限公司'], specification: '50kg/袋',
        plannedQuantity: 60000, orderedQuantity: 0, unit: '件', estimatedUnitPrice: 8.5, estimatedAmount: 510000, requiredDate: '2026-10-08', plant: '大连工厂（1200）',
      },
      {
        id: 'PLAN-003-20', planId: 'PLAN-003', lineNo: '0020', sourceDemandLineIds: ['DEM-002-20'], sourceDemandNos: ['PR20260912006'],
        objectType: 'FREE_TEXT', content: '包装线标签及色带', materialGroup: '包装耗材', suggestedSuppliers: [], specification: '按生产批次配套供货',
        plannedQuantity: 20, orderedQuantity: 0, unit: '批', estimatedUnitPrice: 8500, estimatedAmount: 170000, requiredDate: '2026-10-10', plant: '大连工厂（1200）',
      },
    ],
  },
];

export function getDemandPoolItems(): DemandPoolItem[] {
  return procurementDemands.flatMap((demand) => demand.lines
    .filter((line) => ['OPEN', 'PARTIALLY_PLANNED'].includes(line.status) && demand.approvalStatus === 'APPROVED')
    .map((line) => ({
      ...line,
      demandNo: demand.demandNo,
      demandTitle: demand.title,
      department: demand.department,
      applicant: demand.applicant,
      priority: demand.priority,
    })));
}
