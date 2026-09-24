import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { App, Button, DatePicker, Divider, Drawer, Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';
import type { ProcurementDemand, ProcurementPriority } from '@domain/procurement/types';
import { saveProcurementDemand, type DemandLineInput, type DemandUpsertInput } from '../api/procurementPlanningApi';

type EditorMode = 'create' | 'edit' | 'view';

interface DemandEditorDrawerProps {
  open: boolean;
  mode: EditorMode;
  demand?: ProcurementDemand;
  onClose: () => void;
  onSaved: () => void;
}

interface DemandLineFormValue extends Omit<DemandLineInput, 'requiredDate'> {
  requiredDate: Dayjs;
}

interface DemandFormValues {
  title: string;
  department: string;
  applicant: string;
  company: string;
  costCenter?: string;
  priority: ProcurementPriority;
  requiredDate: Dayjs;
  notes?: string;
  lines: DemandLineFormValue[];
}

const objectTypeOptions = [
  { value: 'MATERIAL', label: '库存/消耗性物料' },
  { value: 'FREE_TEXT', label: '无物料号采购' },
  { value: 'SERVICE', label: '服务采购' },
  { value: 'LIMIT_SERVICE', label: '限额服务' },
  { value: 'ASSET', label: '固定资产' },
];

const defaultLine = (): DemandLineFormValue => ({
  objectType: 'MATERIAL', content: '', materialGroup: '', quantity: 1, unit: '件', estimatedUnitPrice: 0, requiredDate: dayjs().add(14, 'day'),
});

export function DemandEditorDrawer({ open, mode, demand, onClose, onSaved }: DemandEditorDrawerProps) {
  const [form] = Form.useForm<DemandFormValues>();
  const { message } = App.useApp();
  const mutation = useMutation({ mutationFn: saveProcurementDemand });

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (demand) {
      form.setFieldsValue({
        title: demand.title, department: demand.department, applicant: demand.applicant, company: demand.company,
        costCenter: demand.costCenter, priority: demand.priority, requiredDate: dayjs(demand.requiredDate), notes: demand.notes,
        lines: demand.lines.map((line) => ({ ...line, requiredDate: dayjs(line.requiredDate) })),
      });
    } else {
      form.setFieldsValue({
        company: '北方粮食集团', applicant: '张敏', priority: 'NORMAL', requiredDate: dayjs().add(14, 'day'), lines: [defaultLine()],
      });
    }
  }, [demand, form, open]);

  const submit = async (status: DemandUpsertInput['status']) => {
    const values = await form.validateFields();
    await mutation.mutateAsync({
      ...values,
      id: demand?.id,
      status,
      requiredDate: values.requiredDate.format('YYYY-MM-DD'),
      lines: values.lines.map((line) => ({ ...line, requiredDate: line.requiredDate.format('YYYY-MM-DD') })),
    });
    message.success(status === 'DRAFT' ? '采购需求草稿已保存。' : '采购需求已提交审批。');
    form.resetFields();
    onSaved();
  };

  const title = mode === 'create' ? '新建采购需求' : mode === 'edit' ? '编辑采购需求' : '采购需求详情';

  return <Drawer
    title={title}
    width={880}
    open={open}
    onClose={onClose}
    destroyOnHidden
    extra={mode !== 'view' && <Space>
      <Button onClick={() => submit('DRAFT')} loading={mutation.isPending}>保存草稿</Button>
      <Button type="primary" onClick={() => submit('SUBMITTED')} loading={mutation.isPending}>提交审批</Button>
    </Space>}
  >
    <Form form={form} layout="vertical" disabled={mode === 'view'} requiredMark="optional">
      <Typography.Title level={5}>需求基本信息</Typography.Title>
      <div className="planning-form-grid">
        <Form.Item className="planning-form-grid__wide" name="title" label="需求主题" rules={[{ required: true, message: '请填写需求主题。' }]}><Input maxLength={80} /></Form.Item>
        <Form.Item name="department" label="需求部门" rules={[{ required: true, message: '请选择需求部门。' }]}><Select options={['原料供应部','生产运营部','设备管理部','数字化中心','质量安全部'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item name="applicant" label="申请人" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="company" label="公司" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="costCenter" label="成本中心"><Input placeholder="服务或费用性需求可填" /></Form.Item>
        <Form.Item name="priority" label="优先级" rules={[{ required: true }]}><Select options={[{value:'URGENT',label:'紧急'},{value:'HIGH',label:'高'},{value:'NORMAL',label:'普通'},{value:'LOW',label:'低'}]} /></Form.Item>
        <Form.Item name="requiredDate" label="整体需求日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
        <Form.Item className="planning-form-grid__wide" name="notes" label="需求说明"><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item>
      </div>
      <Divider />
      <Typography.Title level={5}>需求明细</Typography.Title>
      <Form.List name="lines">
        {(fields, { add, remove }) => <>
          {fields.map((field, index) => <div className="planning-line-editor" key={field.key}>
            <div className="planning-line-editor__title"><Typography.Text strong>明细 {index + 1}</Typography.Text>{fields.length > 1 && mode !== 'view' && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label={`删除明细${index + 1}`} />}</div>
            <div className="planning-form-grid planning-form-grid--line">
              <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
              <Form.Item name={[field.name, 'objectType']} label="采购对象" rules={[{ required: true }]}><Select options={objectTypeOptions} /></Form.Item>
              <Form.Item name={[field.name, 'content']} label="采购内容" rules={[{ required: true, message: '请填写采购内容。' }]}><Input /></Form.Item>
              <Form.Item noStyle shouldUpdate={(previous, current) => previous.lines?.[index]?.objectType !== current.lines?.[index]?.objectType}>
                {({ getFieldValue }) => getFieldValue(['lines', index, 'objectType']) === 'MATERIAL' && <Form.Item name={[field.name, 'materialCode']} label="物料号"><Input /></Form.Item>}
              </Form.Item>
              <Form.Item name={[field.name, 'materialGroup']} label="物料组" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name={[field.name, 'suggestedSupplier']} label="建议供应商" extra="非必填，仅作为后续采购计划和订单建议。"><Input allowClear placeholder="可填写建议供应商全称" /></Form.Item>
              <Form.Item className="planning-form-grid__wide" name={[field.name, 'specification']} label="规格/服务要求"><Input /></Form.Item>
              <Form.Item name={[field.name, 'quantity']} label="需求数量" rules={[{ required: true }]}><InputNumber className="field-full" min={0.01} precision={2} /></Form.Item>
              <Form.Item name={[field.name, 'unit']} label="单位" rules={[{ required: true }]}><Select showSearch options={['吨','件','批','台','项','月','元'].map((value) => ({ value, label: value }))} /></Form.Item>
              <Form.Item name={[field.name, 'estimatedUnitPrice']} label="预估单价" rules={[{ required: true }]}><InputNumber className="field-full" min={0} precision={2} prefix="¥" /></Form.Item>
              <Form.Item name={[field.name, 'requiredDate']} label="需求日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
              <Form.Item name={[field.name, 'plant']} label="工厂"><Input /></Form.Item>
            </div>
          </div>)}
          {mode !== 'view' && <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add(defaultLine())}>添加需求明细</Button>}
        </>}
      </Form.List>
    </Form>
  </Drawer>;
}
