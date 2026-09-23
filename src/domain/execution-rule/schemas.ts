import type { PurchaseOrderItem } from '@domain/procurement/types';
import { getRemainingValue } from '@domain/procurement/calculations';
import type { DynamicFieldSchema, ExecutionFormSchema } from './types';

const acceptanceOptions = [
  { value: 'PASS', label: '验收通过' },
  { value: 'CONDITIONAL', label: '有条件通过' },
  { value: 'REJECT', label: '验收不通过' },
];

const attachments: DynamicFieldSchema[] = [
  { key: 'attachments', label: '业务附件', component: 'upload', state: 'OPTIONAL', source: 'USER', group: 'ATTACHMENT', span: 2, businessHelp: '支持送货单、验收材料及现场照片。' },
  { key: 'remark', label: '备注', component: 'textarea', state: 'OPTIONAL', source: 'USER', group: 'ATTACHMENT', span: 2, placeholder: '补充本次执行的业务说明' },
];

const goodsReceiptSchema = (item: PurchaseOrderItem): ExecutionFormSchema => ({
  title: '采购收货', submitLabel: '确认收货', fields: [
    { key: 'quantity', label: '本次收货数量', component: 'number', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', min: 0.001, max: getRemainingValue(item), unit: item.unit, businessHelp: `当前最多可收 ${getRemainingValue(item)} ${item.unit}` },
    { key: 'receiptDate', label: '收货日期', component: 'date', state: 'REQUIRED', source: 'USER', group: 'EXECUTION' },
    { key: 'postingDate', label: '过账日期', component: 'date', state: 'REQUIRED', source: 'USER', group: 'EXECUTION' },
    { key: 'plant', label: '工厂', component: 'input', state: 'DISPLAY', source: 'SAP', group: 'DELIVERY', defaultValue: item.plant },
    { key: 'storageLocation', label: '库存地点', component: 'select', state: 'REQUIRED', source: 'SAP', group: 'DELIVERY', defaultValue: item.storageLocation, options: [
      { label: item.storageLocation ?? '原粮一库（1001）', value: item.storageLocation ?? '原粮一库（1001）' },
      { label: '待检库（1002）', value: '待检库（1002）' },
    ] },
    { key: 'batch', label: '批次', component: 'input', state: item.batchManaged ? 'REQUIRED' : 'HIDDEN', source: 'USER', group: 'DELIVERY', placeholder: '系统规则判定为批次管理物料' },
    { key: 'serialNumbers', label: '序列号', component: 'textarea', state: item.serialNumberManaged ? 'REQUIRED' : 'HIDDEN', source: 'USER', group: 'DELIVERY', span: 2, placeholder: '每行输入一个序列号' },
    { key: 'supplierBatch', label: '供应商批号', component: 'input', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY' },
    { key: 'manufactureDate', label: '生产日期', component: 'date', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY' },
    { key: 'expiryDate', label: '有效期', component: 'date', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY' },
    { key: 'deliveryNote', label: '送货单号', component: 'input', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY' },
    ...attachments,
  ],
});

const freeTextReceiptSchema = (item: PurchaseOrderItem): ExecutionFormSchema => ({
  title: '无物料号采购收货', submitLabel: '确认收货', fields: [
    { key: 'quantity', label: '本次收货数量', component: 'number', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', min: 0.001, max: getRemainingValue(item), unit: item.unit },
    { key: 'unit', label: '单位', component: 'input', state: 'DISPLAY', source: 'SAP', group: 'EXECUTION', defaultValue: item.unit },
    { key: 'receiptDate', label: '收货日期', component: 'date', state: 'REQUIRED', source: 'USER', group: 'EXECUTION' },
    { key: 'deliveryLocation', label: '交付地点', component: 'input', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY', placeholder: '填写实际交付位置' },
    { key: 'acceptanceResult', label: '验收结果', component: 'radio', state: 'OPTIONAL', source: 'USER', group: 'DELIVERY', options: acceptanceOptions },
    { key: 'receiver', label: '收货人', component: 'input', state: 'REQUIRED', source: 'DEFAULT', group: 'DELIVERY', defaultValue: '张敏' },
    ...attachments,
  ],
});

const serviceAcceptanceSchema = (item: PurchaseOrderItem): ExecutionFormSchema => ({
  title: '服务验收', submitLabel: '提交验收', fields: [
    { key: 'servicePeriod', label: '服务期间', component: 'dateRange', state: 'REQUIRED', source: 'USER', group: 'SERVICE', span: 2 },
    { key: 'completedQuantity', label: '本次完成数量', component: 'number', state: 'OPTIONAL', source: 'USER', group: 'SERVICE', min: 0, unit: '项' },
    { key: 'unit', label: '服务单位', component: 'input', state: 'OPTIONAL', source: 'USER', group: 'SERVICE', defaultValue: '项' },
    { key: 'confirmedAmount', label: '本次确认金额', component: 'number', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', min: 0.01, max: getRemainingValue(item), unit: '元', businessHelp: `剩余可验收金额 ${getRemainingValue(item).toLocaleString('zh-CN')} 元` },
    { key: 'acceptanceResult', label: '验收结果', component: 'radio', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', options: acceptanceOptions },
    { key: 'completionDescription', label: '服务完成说明', component: 'textarea', state: 'REQUIRED', source: 'USER', group: 'SERVICE', span: 2, placeholder: '说明本阶段服务范围、工作成果及完成情况' },
    { key: 'acceptanceComment', label: '验收意见', component: 'textarea', state: 'OPTIONAL', source: 'USER', group: 'SERVICE', span: 2 },
    { key: 'acceptor', label: '验收人', component: 'input', state: 'REQUIRED', source: 'DEFAULT', group: 'SERVICE', defaultValue: '赵强' },
    { key: 'attachments', label: '成果及验收材料', component: 'upload', state: 'REQUIRED', source: 'USER', group: 'ATTACHMENT', span: 2, businessHelp: '请上传成果附件、验收报告或工作量清单。' },
    { key: 'remark', label: '备注', component: 'textarea', state: 'OPTIONAL', source: 'USER', group: 'ATTACHMENT', span: 2 },
  ],
});

const limitServiceSchema = (item: PurchaseOrderItem): ExecutionFormSchema => ({
  title: '限额服务执行确认', submitLabel: '确认执行', fields: [
    { key: 'serviceContent', label: '实际服务内容', component: 'textarea', state: 'REQUIRED', source: 'USER', group: 'SERVICE', span: 2, placeholder: '说明本次实际发生的维修或服务内容' },
    { key: 'serviceDate', label: '服务日期', component: 'date', state: 'REQUIRED', source: 'USER', group: 'SERVICE' },
    { key: 'quantity', label: '数量', component: 'number', state: 'OPTIONAL', source: 'USER', group: 'EXECUTION', min: 0 },
    { key: 'unitPrice', label: '单价', component: 'number', state: 'OPTIONAL', source: 'USER', group: 'EXECUTION', min: 0, unit: '元' },
    { key: 'confirmedAmount', label: '本次金额', component: 'number', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', min: 0.01, max: getRemainingValue(item), unit: '元', businessHelp: `不得超过剩余额度 ${getRemainingValue(item).toLocaleString('zh-CN')} 元` },
    { key: 'acceptanceResult', label: '验收结果', component: 'radio', state: 'REQUIRED', source: 'USER', group: 'EXECUTION', options: acceptanceOptions },
    { key: 'attachments', label: '业务附件', component: 'upload', state: 'REQUIRED', source: 'USER', group: 'ATTACHMENT', span: 2 },
    { key: 'remark', label: '服务说明', component: 'textarea', state: 'OPTIONAL', source: 'USER', group: 'ATTACHMENT', span: 2 },
  ],
});

export function getExecutionFormSchema(item: PurchaseOrderItem): ExecutionFormSchema {
  switch (item.executionScenario) {
    case 'MAT_FREE': return freeTextReceiptSchema(item);
    case 'SERVICE': return serviceAcceptanceSchema(item);
    case 'SERVICE_LIMIT': return limitServiceSchema(item);
    default: return goodsReceiptSchema(item);
  }
}
