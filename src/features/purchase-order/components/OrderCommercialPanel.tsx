import { Alert, Button, DatePicker, Descriptions, Form, Input, Modal, Table, Tabs, Tag } from 'antd';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Dayjs } from 'dayjs';
import type { CommercialLine, OrderDocument } from '@domain/purchase-order/types';
import { calculateLine, moneyText } from '@domain/purchase-order/rules';
import { refName } from '@domain/purchase-order/catalog';
import { saveDeliveryNote } from '../api/orderDraftApi';

export function OrderCommercialPanel({ order }: { order: OrderDocument }) {
  const revision = order.revisions.find((entry) => entry.id === (order.effectiveRevisionId ?? order.workingRevisionId)) ?? order.revisions.at(-1)!;
  const client = useQueryClient();
  const [selected, setSelected] = useState<CommercialLine>();
  const [form] = Form.useForm<{ date?: Dayjs; note: string }>();
  const mutation = useMutation({ mutationFn: async () => {
    const values = await form.validateFields();
    return saveDeliveryNote(order.id, { requestKey: crypto.randomUUID(), expectedRowVersion: order.rowVersion, revisionId: revision.id, lineId: selected!.lineId, expectedArrivalDate: values.date?.format('YYYY-MM-DD'), note: values.note ?? '' });
  }, onSuccess: async () => { setSelected(undefined); form.resetFields(); await client.invalidateQueries(); } });
  return <div className="content-surface"><Descriptions column={3} items={[
    { key: 'payment', label: '付款条件', children: refName('paymentTerms', revision.content.paymentTermId) }, { key: 'delivery', label: '交付条件', children: refName('deliveryTerms', revision.content.deliveryTermId) }, { key: 'buyer', label: '采购员', children: refName('users', revision.content.buyerId) },
  ]} /><Tabs items={[
    { key: 'prices', label: '商业明细', children: <Table rowKey="lineId" size="small" dataSource={revision.content.lines} scroll={{ x: 1080 }} pagination={false} columns={[
      { title: '采购内容', dataIndex: 'content', width: 220, fixed: 'left' }, { title: '计价方式', render: (_, line) => ({ UNIT_PRICE: '按量计价', FIXED_AMOUNT: '固定金额', LIMIT: '限额' })[line.pricingMethod] },
      { title: '数量 / 单位', align: 'right', render: (_, line) => line.orderedQty ? `${line.orderedQty} ${refName('units', line.orderUomId)}` : '不适用' },
      { title: '单价 / 基数', align: 'right', render: (_, line) => line.pricingMethod === 'UNIT_PRICE' ? `${moneyText(line.enteredUnitPrice)} / ${line.priceQuantity}${refName('units', line.priceUomId)}（${line.priceInputBasis === 'GROSS' ? '含税' : '未税'}）` : moneyText(line.fixedAmount ?? line.expectedAmount) },
      { title: '税额', align: 'right', render: (_, line) => moneyText(calculateLine(line)?.tax) },
      { title: '含税金额', align: 'right', render: (_, line) => moneyText(calculateLine(line)?.gross) },
      { title: '最高限额', align: 'right', render: (_, line) => line.pricingMethod === 'LIMIT' ? `${moneyText(line.overallLimit)}（${line.amountBasis === 'GROSS' ? '含税' : '未税'}）` : '不适用' },
    ]} /> },
    { key: 'delivery', label: '交付安排', children: <><Alert className="editor-section" type="info" showIcon title="内部预计仅为可选备注，不覆盖正式交期，也不消除逾期。服务按约定期间和验收要求履约。" /><Table rowKey="lineId" size="small" dataSource={revision.content.lines} pagination={false} columns={[
      { title: '采购内容', dataIndex: 'content' }, { title: '正式约定交期 / 服务期间', render: (_, line) => line.productKind === 'SERVICE' ? `${line.serviceStart} ～ ${line.serviceEnd}` : line.schedule.requiredDate },
      { title: '交付地点 / 验收依据', render: (_, line) => line.productKind === 'SERVICE' ? line.acceptanceCriteria : line.schedule.addressSnapshot },
      { title: '内部预计及备注', render: (_, line) => { const latest = order.deliveryNotes.filter((note) => note.revisionId === revision.id && note.lineId === line.lineId).at(-1); return latest ? `${latest.expectedArrivalDate ?? '未指定日期'} · ${latest.note}` : '未登记（可选）'; } },
      { title: '操作', render: (_, line) => <Button type="link" disabled={!order.effectiveRevisionId || line.productKind === 'SERVICE'} onClick={() => { setSelected(line); mutation.reset(); }}>补充运行备注</Button> },
    ]} /></> },
    { key: 'sources', label: '来源与依据', children: <Table rowKey="lineId" size="small" dataSource={revision.content.lines} pagination={false} columns={[
      { title: '本次采购内容', dataIndex: 'content' }, { title: '来源单据', render: (_, line) => line.source?.sourceDocumentNo ?? '独立采购' }, { title: '来源行', render: (_, line) => line.source?.sourceLineId ?? '—' },
      { title: '建议供应商', render: (_, line) => line.source?.suggestedSuppliers.map((supplier) => <Tag key={supplier}>{supplier}</Tag>) ?? '—' }, { title: '采购依据 / 偏差说明', render: () => revision.content.notes || revision.content.procurementReason || '来源授权采购' },
    ]} /> },
  ]} /><Modal title="补充内部预计及运行备注" open={Boolean(selected)} confirmLoading={mutation.isPending} onCancel={() => setSelected(undefined)} onOk={() => mutation.mutate()} destroyOnHidden>
    {mutation.isError && <Alert type="error" title={mutation.error.message} />}
    <Form form={form} layout="vertical"><Form.Item name="date" label="内部预计到货（非供应商承诺）"><DatePicker /></Form.Item><Form.Item name="note" label="延期原因 / 补充说明"><Input.TextArea maxLength={2000} rows={3} /></Form.Item></Form>
    <Alert showIcon type="info" title="留存版本和操作者；不会修改数量、约定交期或触发 SAP 订单变更。" />
  </Modal></div>;
}
