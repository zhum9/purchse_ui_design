import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Checkbox, DatePicker, Descriptions, Form, Input, InputNumber, Select, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { calculateLine, decimal, moneyText, newCommercialLine } from '@domain/purchase-order/rules';
import { catalog, refName, refOptions } from '@domain/purchase-order/catalog';
import type { CommercialLine } from '@domain/purchase-order/types';

interface Props { lines: CommercialLine[]; onChange: (lines: CommercialLine[]) => void; amendment: boolean }
export function CommercialLineEditor({ lines, onChange, amendment }: Props) {
  const [selectedId, setSelectedId] = useState<string>();
  const current = lines.find((line) => line.lineId === selectedId) ?? lines[0];
  const update = (id: string, patch: Partial<CommercialLine>) => onChange(lines.map((line) => line.lineId === id ? { ...line, ...patch } : line));
  const columns: TableColumnsType<CommercialLine> = [
    { title: '采购内容 / 单位', width: 210, fixed: 'left', render: (_, line, index) => <div className="primary-cell"><Button type="link" onClick={() => setSelectedId(line.lineId)}>{line.content || `待补充明细 ${index + 1}`}</Button><span>{line.pricingMethod === 'UNIT_PRICE' ? refName('units', line.orderUomId) : line.pricingMethod === 'LIMIT' ? '限额控制' : '固定金额服务'}</span></div> },
    { title: '来源可转', width: 110, align: 'right', render: (_, line) => line.source ? `${line.source.available} ${refName('units', line.orderUomId)}` : '独立采购' },
    { title: '本次采购', width: 135, align: 'right', render: (_, line) => line.pricingMethod === 'UNIT_PRICE' ? <InputNumber<string> aria-label={`${line.content}本次数量`} stringMode min="0.000001" precision={6} value={line.orderedQty} disabled={amendment} onChange={(value) => update(line.lineId, { orderedQty: value ?? undefined, priceConfirmed: false })} /> : moneyText(line.pricingMethod === 'LIMIT' ? line.expectedAmount : line.fixedAmount) },
    { title: '成交单价', width: 135, align: 'right', render: (_, line) => line.pricingMethod === 'UNIT_PRICE' ? <InputNumber<string> aria-label={`${line.content}成交单价`} stringMode min="0" precision={10} value={line.enteredUnitPrice} disabled={amendment} placeholder="待定价" onChange={(value) => update(line.lineId, { enteredUnitPrice: value ?? undefined, priceConfirmed: false })} /> : '按金额约定' },
    { title: '税率', width: 110, render: (_, line) => <Select className="field-full" aria-label={`${line.content}税率`} value={line.taxRate} disabled={amendment} placeholder="待确认" options={['0.13', '0.09', '0.06', '0.03', '0'].map((value) => ({ value, label: `${decimal(value).mul(100)}%` }))} onChange={(value) => update(line.lineId, { taxRate: value, taxConfirmed: true, priceConfirmed: false })} /> },
    { title: '含税金额', width: 135, align: 'right', render: (_, line) => <Typography.Text strong>{moneyText(calculateLine(line)?.gross)}</Typography.Text> },
    { title: '约定交期', width: 155, render: (_, line) => <DatePicker aria-label={`${line.content}约定交期`} value={line.schedule.requiredDate ? dayjs(line.schedule.requiredDate) : null} onChange={(value) => update(line.lineId, { schedule: { ...line.schedule, requiredDate: value?.format('YYYY-MM-DD') ?? '' } })} /> },
    { title: '操作', width: 76, fixed: 'right', render: (_, line) => <Button type="text" danger aria-label={`移除${line.content}`} icon={<DeleteOutlined />} disabled={amendment} onClick={() => onChange(lines.filter((item) => item.lineId !== line.lineId))} /> },
  ];
  const field = <K extends keyof CommercialLine>(key: K, value: CommercialLine[K]) => current && update(current.lineId, { [key]: value });
  const amount = current && calculateLine(current);
  const changeScenario = (scenario: string) => {
    if (!current) return;
    const service = scenario === 'SERVICE' || scenario === 'SERVICE_LIMIT';
    update(current.lineId, { executionScenario: scenario as CommercialLine['executionScenario'], productKind: service ? 'SERVICE' : 'GOODS', stockMode: service ? 'NOT_APPLICABLE' : scenario === 'MAT_STOCK' ? 'STOCK' : 'NON_STOCK', identificationMode: scenario === 'MAT_STOCK' || scenario === 'MAT_CONSUME' ? 'CODED' : 'FREE_TEXT', pricingMethod: scenario === 'SERVICE_LIMIT' ? 'LIMIT' : 'UNIT_PRICE', controlMode: scenario === 'SERVICE_LIMIT' ? 'LIMIT' : service ? 'QUANTITY_AMOUNT' : 'QUANTITY', priceConfirmed: false, itemRefId: undefined, plantId: undefined, orderedQty: undefined, enteredUnitPrice: undefined, fixedAmount: undefined, expectedAmount: undefined, overallLimit: undefined, serviceStart: '', serviceEnd: '', acceptanceCriteria: '', acceptorId: undefined, schedule: { scheduleKey: current.schedule.scheduleKey, requiredDate: current.schedule.requiredDate, addressSnapshot: '', deliveryLocationId: undefined, recipientId: undefined } });
  };
  return <section className="content-surface editor-section"><div className="section-heading"><h3>采购明细</h3><span>点击采购内容完善该行；数量、价格、交期可分别调整</span></div>
    <Table rowKey="lineId" size="small" columns={columns} dataSource={lines} scroll={{ x: 1140 }} pagination={false} rowClassName={(line) => current?.lineId === line.lineId ? 'commercial-row--selected' : ''} />
    {!amendment && <Button className="section-add" type="dashed" block icon={<PlusOutlined />} onClick={() => { const next = newCommercialLine(); onChange([...lines, next]); setSelectedId(next.lineId); }}>添加独立采购明细</Button>}
    {current && <div className="line-detail" id={`line-${current.lineId}`}><Space><Typography.Text strong>当前行：{current.content || '待完善采购内容'}</Typography.Text><Tag>{current.source?.sourceDocumentNo ?? '独立采购'}</Tag></Space>
      <Form layout="vertical" component="div"><Tabs items={[
        { key: 'commercial', label: '内容与价格', children: <div className="commercial-header-grid">
          <Form.Item label="执行场景" required><Select value={current.executionScenario} disabled={amendment || Boolean(current.source)} onChange={changeScenario} options={[{ value: 'MAT_STOCK', label: '库存货物' }, { value: 'MAT_CONSUME', label: '消耗性货物' }, { value: 'MAT_FREE', label: '无编码货物' }, { value: 'SERVICE', label: '服务采购' }, { value: 'SERVICE_LIMIT', label: '限额服务' }]} /></Form.Item>
          <Form.Item label="采购内容" required><Input disabled={amendment || Boolean(current.source)} value={current.content} maxLength={200} onChange={(event) => field('content', event.target.value)} /></Form.Item>
          <Form.Item label="采购品类" required><Select value={current.categoryId} disabled={amendment} options={refOptions('categories')} onChange={(value) => field('categoryId', value)} /></Form.Item>
          {current.identificationMode === 'CODED' && <Form.Item label="物料编码" required={current.stockMode === 'STOCK'}><Select disabled={amendment || Boolean(current.source)} value={current.itemRefId} options={catalog.materials.map((entry) => ({ value: entry.id, label: `${entry.code} · ${entry.name}` }))} onChange={(value) => update(current.lineId, { itemRefId: value, content: catalog.materials.find((entry) => entry.id === value)?.name ?? current.content })} /></Form.Item>}
          <Form.Item label="规格 / 服务范围" className="commercial-header-grid__wide"><Input disabled={amendment || Boolean(current.source)} value={current.specification} onChange={(event) => field('specification', event.target.value)} /></Form.Item>
          <Form.Item label="计价方式"><Select value={current.pricingMethod} disabled={amendment || Boolean(current.source) || current.productKind !== 'SERVICE' || current.executionScenario === 'SERVICE_LIMIT'} options={[{ value: 'UNIT_PRICE', label: '数量 × 单价' }, { value: 'FIXED_AMOUNT', label: '固定金额' }, { value: 'LIMIT', label: '预计金额 / 最高限额', disabled: current.executionScenario !== 'SERVICE_LIMIT' }]} onChange={(value: CommercialLine['pricingMethod']) => update(current.lineId, { pricingMethod: value, controlMode: value === 'UNIT_PRICE' ? 'QUANTITY_AMOUNT' : 'AMOUNT', orderedQty: undefined, enteredUnitPrice: undefined, priceConfirmed: false })} /></Form.Item>
          {current.pricingMethod === 'UNIT_PRICE' ? <>
            <Form.Item label="采购 / 计价单位" required><Select disabled={amendment || Boolean(current.source)} value={current.orderUomId} options={refOptions('units')} onChange={(value) => update(current.lineId, { orderUomId: value, priceUomId: value })} /></Form.Item>
            <Form.Item label="计价基数" extra="例如 820 元 / 100 件，基数填写100。"><InputNumber<string> stringMode min="0.000001" value={current.priceQuantity} disabled={amendment} onChange={(value) => update(current.lineId, { priceQuantity: value ?? '', priceConfirmed: false })} /></Form.Item>
          </> : <>
            <Form.Item label={current.pricingMethod === 'LIMIT' ? '预计金额' : '约定金额'} required><InputNumber<string> stringMode className="field-full" min="0" precision={2} value={current.pricingMethod === 'LIMIT' ? current.expectedAmount : current.fixedAmount} disabled={amendment} onChange={(value) => update(current.lineId, { [current.pricingMethod === 'LIMIT' ? 'expectedAmount' : 'fixedAmount']: value ?? undefined, priceConfirmed: false })} /></Form.Item>
            {current.pricingMethod === 'LIMIT' && <Form.Item label="最高限额" required><InputNumber<string> stringMode min="0.01" precision={2} value={current.overallLimit} disabled={amendment} onChange={(value) => field('overallLimit', value ?? undefined)} /></Form.Item>}
          </>}
          <Form.Item label="输入价格口径"><Select disabled={amendment} value={current.pricingMethod === 'UNIT_PRICE' ? current.priceInputBasis : current.amountBasis} options={[{ value: 'GROSS', label: '含税' }, { value: 'NET', label: '未税' }]} onChange={(value: 'GROSS' | 'NET') => update(current.lineId, { priceInputBasis: value, amountBasis: value, priceConfirmed: false })} /></Form.Item>
          <Form.Item label="价格确认"><Checkbox disabled={amendment || !amount} checked={current.priceConfirmed} onChange={(event) => field('priceConfirmed', event.target.checked)}>已核对成交价格及税口径</Checkbox></Form.Item>
          <Form.Item label="免费业务"><Checkbox disabled={amendment} checked={current.isFree} onChange={(event) => field('isFree', event.target.checked)}>本行确属免费</Checkbox></Form.Item>
          {current.isFree && <Form.Item label="免费原因" required><Input value={current.freeReason} disabled={amendment} onChange={(event) => field('freeReason', event.target.value)} /></Form.Item>}
          <div className="commercial-header-grid__wide"><Descriptions size="small" column={3} items={[{ key: 'net', label: '未税金额', children: moneyText(amount?.net) }, { key: 'tax', label: '税额', children: moneyText(amount?.tax) }, { key: 'gross', label: '含税金额', children: moneyText(amount?.gross) }]} /></div>
        </div> },
        { key: 'delivery', label: '交付与验收', children: <div className="commercial-header-grid">
          {current.productKind === 'GOODS' ? <>
            <Form.Item label="交付地址" required className="commercial-header-grid__wide"><Input disabled={amendment} value={current.schedule.addressSnapshot} onChange={(event) => field('schedule', { ...current.schedule, addressSnapshot: event.target.value })} /></Form.Item>
            <Form.Item label="工厂" required={current.stockMode === 'STOCK'}><Select disabled={amendment} value={current.plantId} options={refOptions('plants')} onChange={(value) => field('plantId', value)} /></Form.Item>
            {current.stockMode === 'STOCK' && <Form.Item label="库存地点" required><Select disabled={amendment} value={current.schedule.deliveryLocationId} options={refOptions('locations')} onChange={(value) => field('schedule', { ...current.schedule, deliveryLocationId: value })} /></Form.Item>}
          </> : <>
            <Form.Item label="服务开始" required><DatePicker disabled={amendment} value={current.serviceStart ? dayjs(current.serviceStart) : null} onChange={(date) => field('serviceStart', date?.format('YYYY-MM-DD') ?? '')} /></Form.Item>
            <Form.Item label="服务结束" required><DatePicker disabled={amendment} value={current.serviceEnd ? dayjs(current.serviceEnd) : null} onChange={(date) => field('serviceEnd', date?.format('YYYY-MM-DD') ?? '')} /></Form.Item>
            <Form.Item label="验收负责人" required><Select disabled={amendment} value={current.acceptorId} options={refOptions('users')} onChange={(value) => field('acceptorId', value)} /></Form.Item>
            <Form.Item label="验收依据" className="commercial-header-grid__wide" required><Input.TextArea disabled={amendment} value={current.acceptanceCriteria} onChange={(event) => field('acceptanceCriteria', event.target.value)} /></Form.Item>
          </>}
          <Alert className="commercial-header-grid__wide" type="info" showIcon title="正式约定交期与内部预计日期分开维护；服务按期间及验收金额控制，不套用库存收货。" />
        </div> },
        { key: 'source', label: '来源与估算', children: current.source ? <Descriptions column={2} items={[
          { key: 'no', label: '来源单号', children: current.source.sourceDocumentNo }, { key: 'line', label: '来源行', children: current.source.sourceLineId },
          { key: 'price', label: '来源参考估价', children: `${moneyText(current.source.referenceUnitPrice)} / ${refName('units', current.orderUomId)}（旧样例税口径未核验）` },
          { key: 'supplier', label: '建议供应商', children: current.source.suggestedSuppliers.join('、') || '未建议；不限制实际供应商' },
          { key: 'diff', label: '价格比较', children: '先确认计价基数和税口径一致，再判断价差；不默认把估价当成交价。', span: 2 },
          { key: 'rule', label: '分配规则', children: '本行逐一对应来源；保存草稿不占量，提交占用，批准确认，驳回/撤回释放。', span: 2 },
        ]} /> : <Alert type="info" title="独立采购行，不生成虚构需求或计划。采购依据在订单头填写。" /> },
      ]} /></Form>
    </div>}
  </section>;
}
