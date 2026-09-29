import { DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { refOptions } from '@domain/purchase-order/catalog';
import type { OrderDraft } from '@domain/purchase-order/types';

export function OrderHeaderEditor({ value, onChange, amendment }: { value: OrderDraft; onChange: (next: OrderDraft) => void; amendment: boolean }) {
  const set = <K extends keyof OrderDraft>(key: K, next: OrderDraft[K]) => onChange({ ...value, [key]: next });
  const references = [
    ['companyId', '法人', 'companies'], ['supplierId', '实际供应商', 'suppliers'], ['purchaseOrgId', '采购组织', 'organizations'],
    ['purchaseGroupId', '采购组', 'groups'], ['buyerId', '采购员', 'users'], ['paymentTermId', '付款条件', 'paymentTerms'], ['deliveryTermId', '交付条件', 'deliveryTerms'],
  ] as const;
  return <section className="content-surface editor-section"><h3>订单商业条件</h3><Form layout="vertical" component="div"><div className="commercial-header-grid">
    {references.map(([key, label, group]) => <Form.Item key={key} label={label} required><Select aria-label={label} value={value[key]} options={refOptions(group)} showSearch optionFilterProp="label" allowClear disabled={amendment || key === 'companyId' || key === 'buyerId'} onChange={(next: string | undefined) => set(key, next ?? '')} placeholder={`请选择${label}`} /></Form.Item>)}
    <Form.Item label="订单日期" required><DatePicker className="field-full" aria-label="订单日期" value={value.orderDate ? dayjs(value.orderDate) : null} disabled={amendment} onChange={(date) => set('orderDate', date?.format('YYYY-MM-DD') ?? '')} /></Form.Item>
    <Form.Item label="币种"><Select disabled value={value.currencyCode} options={[{ value: 'CNY', label: '人民币 CNY' }]} /></Form.Item>
    <Form.Item label="直接采购依据" className="commercial-header-grid__wide" required={value.lines.some((line) => !line.source)}><Input.TextArea rows={2} maxLength={2000} value={value.procurementReason} disabled={amendment} onChange={(event) => set('procurementReason', event.target.value)} placeholder="独立采购行需说明业务依据；合同、需求和计划不是全局必经节点。" /></Form.Item>
    <Form.Item label="偏差及补充说明" className="commercial-header-grid__wide"><Input.TextArea rows={2} maxLength={2000} value={value.notes} onChange={(event) => set('notes', event.target.value)} placeholder="说明交期延后、价格差异等需要审批人关注的信息。" /></Form.Item>
  </div></Form></section>;
}
