import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Form, Input, InputNumber, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/components/PageHeader';
import { catalog } from '@domain/purchase-order/catalog';
import { createProcurementPlan, type DemandLineInput } from '../api/procurementPlanningApi';

interface Values { name: string; purchaseOrganization: string; purchaseGroup: string; plannedOrderDate: Dayjs; notes: string; lines: Array<Omit<DemandLineInput, 'requiredDate'> & { requiredDate: Dayjs }> }
export function ProcurementPlanEditorPage() {
  const [form] = Form.useForm<Values>();
  const { message } = App.useApp();
  const navigate = useNavigate(), client = useQueryClient();
  const mutation = useMutation({ mutationFn: createProcurementPlan });
  const save = async (submit: boolean) => {
    try {
      const values = await form.validateFields();
      const result = await mutation.mutateAsync({ ...values, type: 'DIRECT', company: '北方粮食集团', owner: '张敏', plannedOrderDate: values.plannedOrderDate.format('YYYY-MM-DD'), demandLineIds: [], submit, independentLines: values.lines.map((line) => ({ ...line, requiredDate: line.requiredDate.format('YYYY-MM-DD') })) });
      await client.invalidateQueries(); message.success(submit ? '独立采购计划已提交审批。' : '独立采购计划草稿已保存。'); navigate(`/planning/plans/${result.id}`);
    } catch { /* Validation stays beside fields; server error stays in the page. */ }
  };
  return <><PageHeader title="编制独立采购计划" description="没有来源需求也可以编制采购计划；必须说明采购依据，后续订单仍需补齐成交条件。" actions={<Space><Button onClick={() => navigate('/planning/plans')}>返回计划</Button><Button loading={mutation.isPending} onClick={() => save(false)}>保存草稿</Button><Button type="primary" loading={mutation.isPending} onClick={() => save(true)}>提交审批</Button></Space>} />
    {mutation.isError && <Alert className="editor-section" type="error" showIcon title={mutation.error.message} />}
    <section className="content-surface"><Form form={form} layout="vertical" initialValues={{ plannedOrderDate: dayjs(), lines: [{ objectType: 'FREE_TEXT', quantity: 1, unit: '批' }] }}><div className="commercial-header-grid">
      <Form.Item label="计划名称" name="name" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="采购组织" name="purchaseOrganization" rules={[{ required: true }]}><Select options={catalog.organizations.map((entry) => ({ value: entry.name, label: entry.name }))} /></Form.Item>
      <Form.Item label="采购组" name="purchaseGroup" rules={[{ required: true }]}><Select options={catalog.groups.map((entry) => ({ value: entry.name, label: entry.name }))} /></Form.Item>
      <Form.Item label="计划下单日期" name="plannedOrderDate" rules={[{ required: true }]}><DatePicker /></Form.Item>
      <Form.Item label="独立采购依据" name="notes" rules={[{ required: true }]} className="commercial-header-grid__wide"><Input.TextArea rows={2} placeholder="说明业务用途和授权依据，不虚构来源需求。" /></Form.Item>
    </div><h3>计划明细</h3><Form.List name="lines">{(fields, { add, remove }) => <>{fields.map((field) => <div className="planning-line-editor" key={field.key}><div className="commercial-header-grid">
      <Form.Item label="采购对象" name={[field.name, 'objectType']} rules={[{ required: true }]}><Select options={[{ value: 'MATERIAL', label: '有编码货物' }, { value: 'FREE_TEXT', label: '无编码货物' }, { value: 'SERVICE', label: '按量服务' }]} /></Form.Item>
      <Form.Item label="采购内容" name={[field.name, 'content']} rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item label="物料号（条件适用）" name={[field.name, 'materialCode']}><Select allowClear options={catalog.materials.map((entry) => ({ value: entry.code, label: `${entry.code} ${entry.name}` }))} /></Form.Item>
      <Form.Item label="采购品类" name={[field.name, 'materialGroup']} rules={[{ required: true }]}><Select options={catalog.categories.map((entry) => ({ value: entry.name, label: entry.name }))} /></Form.Item>
      <Form.Item label="计划数量" name={[field.name, 'quantity']} rules={[{ required: true }]}><InputNumber min={0.000001} precision={6} /></Form.Item>
      <Form.Item label="采购单位" name={[field.name, 'unit']} rules={[{ required: true }]}><Select options={catalog.units.map((entry) => ({ value: entry.name, label: entry.name }))} /></Form.Item>
      <Form.Item label="参考估价（可选，非成交价）" name={[field.name, 'estimatedUnitPrice']}><InputNumber min={0.01} precision={2} /></Form.Item>
      <Form.Item label="需要日期" name={[field.name, 'requiredDate']} rules={[{ required: true }]}><DatePicker /></Form.Item>
      <Form.Item label="建议供应商（非必填）" name={[field.name, 'suggestedSupplier']}><Input /></Form.Item>
      <Form.Item label="规格 / 范围" name={[field.name, 'specification']} className="commercial-header-grid__wide"><Input /></Form.Item>
    </div><Button type="text" danger icon={<DeleteOutlined />} disabled={fields.length === 1} onClick={() => remove(field.name)}>移除此行</Button></div>)}<Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ objectType: 'FREE_TEXT', quantity: 1, unit: '批' })}>添加明细</Button></>}</Form.List></Form></section>
  </>;
}
