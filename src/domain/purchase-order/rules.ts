import Decimal from 'decimal.js';
import dayjs from 'dayjs';
import { catalog } from './catalog';
import type { CommercialLine, LineAmounts, OrderDraft, ValidationIssue } from './types';

export const decimal = (value?: string | number | null) => new Decimal(value ?? 0);
export const positive = (value?: string) => value !== undefined && /^\d+(\.\d+)?$/.test(value) && decimal(value).gt(0);
export const validNumber = (value?: string) => value === undefined || (/^\d+(\.\d{1,10})?$/.test(value) && decimal(value).lt('100000000000000'));
export const moneyText = (value?: string) => value === undefined ? '待定价' : `¥${decimal(value).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

export function calculateLine(line: CommercialLine): LineAmounts | undefined {
  const input = line.pricingMethod === 'UNIT_PRICE' ? line.enteredUnitPrice : line.pricingMethod === 'LIMIT' ? line.expectedAmount : line.fixedAmount;
  if (input === undefined || line.taxRate === undefined || !validNumber(input) || !validNumber(line.taxRate)) return undefined;
  if (line.pricingMethod === 'UNIT_PRICE' && (!positive(line.orderedQty) || !positive(line.priceQuantity))) return undefined;
  const amount = line.pricingMethod === 'UNIT_PRICE' ? decimal(line.orderedQty).mul(input).div(line.priceQuantity) : decimal(input);
  const basis = line.pricingMethod === 'UNIT_PRICE' ? line.priceInputBasis : line.amountBasis;
  const gross = basis === 'GROSS' ? amount.toDecimalPlaces(2) : amount.mul(decimal(line.taxRate).add(1)).toDecimalPlaces(2);
  const net = basis === 'NET' ? amount.toDecimalPlaces(2) : gross.div(decimal(line.taxRate).add(1)).toDecimalPlaces(2);
  const exposure = line.pricingMethod === 'LIMIT' && line.overallLimit !== undefined
    ? decimal(line.overallLimit).mul(line.amountBasis === 'NET' ? decimal(line.taxRate).add(1) : 1).toDecimalPlaces(2) : gross;
  return { net: net.toFixed(2), tax: gross.sub(net).toFixed(2), gross: gross.toFixed(2), exposureGross: exposure.toFixed(2) };
}

export function orderTotals(draft: OrderDraft) {
  const rows = draft.lines.map(calculateLine);
  const sum = (key: keyof LineAmounts) => rows.reduce((total, row) => total.add(row?.[key] ?? 0), decimal(0)).toFixed(2);
  return { net: sum('net'), tax: sum('tax'), gross: sum('gross'), exposureGross: sum('exposureGross'), unpriced: rows.filter((row) => !row).length };
}

export function validateOrder(draft: OrderDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (message: string, path: string, lineId?: string, level: ValidationIssue['level'] = 'ERROR') => issues.push({ message, path, lineId, level });
  const refs = { companyId: 'companies', supplierId: 'suppliers', purchaseOrgId: 'organizations', purchaseGroupId: 'groups', buyerId: 'users', paymentTermId: 'paymentTerms', deliveryTermId: 'deliveryTerms' } as const;
  for (const [field, group] of Object.entries(refs)) {
    if (!catalog[group].some((entry) => entry.id === draft[field as keyof typeof refs])) add(`请确认${({ companyId: '法人', supplierId: '有效供应商', purchaseOrgId: '采购组织', purchaseGroupId: '采购组', buyerId: '采购员', paymentTermId: '付款条件', deliveryTermId: '交付条件' })[field as keyof typeof refs]}`, field);
  }
  if (draft.currencyCode !== 'CNY') add('本期仅支持人民币订单；其他币种需适配后启用', 'currencyCode');
  if (!draft.orderDate || !dayjs(draft.orderDate).isValid()) add('请填写订单日期', 'orderDate');
  if (!draft.lines.length) add('请至少添加一个采购明细', 'lines');
  if (draft.lines.some((line) => line.originMode === 'DIRECT') && !draft.procurementReason.trim()) add('直接采购行需要填写采购依据', 'procurementReason');
  draft.lines.forEach((line, index) => {
    const issue = (message: string, field: string, level?: ValidationIssue['level']) => add(`第 ${index + 1} 行：${message}`, `lines.${index}.${field}`, line.lineId, level);
    if (!line.content.trim()) issue('采购内容不能为空', 'content');
    if (!['MAT_STOCK', 'MAT_CONSUME', 'MAT_FREE', 'SERVICE', 'SERVICE_LIMIT'].includes(line.executionScenario)) issue('执行场景尚未适配', 'executionScenario');
    if (!line.categoryId) issue('请选择采购品类', 'categoryId');
    if (line.stockMode === 'STOCK' && (!line.itemRefId || !line.plantId || !line.schedule.deliveryLocationId)) issue('库存货物需要有效物料、工厂和库存地点', 'itemRefId');
    if (line.pricingMethod === 'UNIT_PRICE') {
      if (!positive(line.orderedQty) || !line.orderUomId) issue('请填写正数采购数量和单位', 'orderedQty');
      if (!positive(line.priceQuantity)) issue('计价基数必须大于0', 'priceQuantity');
      if (line.priceUomId !== line.orderUomId) issue('本期仅支持相同计价/采购单位，换算需主数据适配', 'priceUomId');
    }
    const fields = ['orderedQty', 'enteredUnitPrice', 'priceQuantity', 'taxRate', 'fixedAmount', 'expectedAmount', 'overallLimit'] as const;
    fields.forEach((field) => { if (!validNumber(line[field])) issue('数值格式或精度超出支持范围', field); });
    if (line.taxRate === undefined || !line.taxConfirmed) issue('税率/税口径尚未确认，未知税率不能视为免税', 'taxRate');
    if (!line.priceConfirmed) issue('成交价格尚未确认，来源估价仅供参考', 'priceConfirmed');
    const amount = calculateLine(line);
    if (!amount) issue('商业金额不完整，待定价', 'enteredUnitPrice');
    else if (decimal(amount.gross).eq(0) && (!line.isFree || !line.freeReason.trim())) issue('零金额须明确免费原因', 'freeReason');
    if (line.isFree && (!line.freeReason.trim() || (amount && !decimal(amount.gross).eq(0)))) issue('免费业务必须零金额并填写原因', 'freeReason');
    if (line.pricingMethod === 'LIMIT' && (!positive(line.overallLimit) || decimal(line.expectedAmount).gt(line.overallLimit ?? 0))) issue('预计金额不可超过最高限额，限额必须大于0', 'overallLimit');
    if (!line.schedule.requiredDate) issue('请填写约定交期', 'schedule.requiredDate');
    if (line.productKind === 'GOODS' && !line.schedule.addressSnapshot.trim()) issue('请填写交付地址', 'schedule.addressSnapshot');
    if (line.productKind === 'SERVICE') {
      if (!line.serviceStart || !line.serviceEnd || line.serviceEnd < line.serviceStart) issue('服务期间不完整或结束早于开始', 'serviceStart');
      if (!line.acceptanceCriteria.trim() || !line.acceptorId) issue('需填写验收依据和验收责任人', 'acceptanceCriteria');
    }
    if (line.source) {
      if (line.source.controlDimension === 'QTY' && line.pricingMethod !== 'UNIT_PRICE') issue('数量授权来源不能改为固定金额/限额，请先调整上游授权', 'pricingMethod');
      const commitment = line.source.controlDimension === 'QTY' ? line.orderedQty : line.pricingMethod === 'LIMIT' ? line.overallLimit : amount?.gross;
      if (!positive(commitment) || decimal(commitment).gt(line.source.available)) issue('本次采购超出来源可分配余额', 'orderedQty');
      if (line.source.requiredDate < line.schedule.requiredDate && !draft.notes.trim()) issue('交期晚于来源需要日期，请补充偏差说明', 'schedule.requiredDate');
      if (line.source.referenceUnitPrice && line.enteredUnitPrice && decimal(line.enteredUnitPrice).gt(line.source.referenceUnitPrice)) issue('成交价高于来源估价，请审批人关注差异', 'enteredUnitPrice', 'WARNING');
    }
  });
  return issues;
}

export function newCommercialLine(): CommercialLine {
  return { lineId: crypto.randomUUID(), lineNo: '', productKind: 'GOODS', stockMode: 'NON_STOCK', identificationMode: 'FREE_TEXT', content: '', specification: '', executionScenario: 'MAT_FREE', pricingMethod: 'UNIT_PRICE', controlMode: 'QUANTITY', originMode: 'DIRECT', priceQuantity: '1', priceInputBasis: 'GROSS', amountBasis: 'GROSS', taxConfirmed: false, priceConfirmed: false, isFree: false, freeReason: '', serviceStart: '', serviceEnd: '', acceptanceCriteria: '', schedule: { scheduleKey: crypto.randomUUID(), requiredDate: '', addressSnapshot: '' } };
}
export function newOrderDraft(): OrderDraft {
  return { companyId: '100', buyerId: '801', currencyCode: 'CNY', orderDate: dayjs().format('YYYY-MM-DD'), procurementReason: '', notes: '', lines: [] };
}
