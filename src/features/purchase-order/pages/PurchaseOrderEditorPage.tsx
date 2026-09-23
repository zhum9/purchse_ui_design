import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, InputNumber, Result, Select, Space, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ExecutionScenario, ProcurementObjectType } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { getPurchaseOrder, purchaseOrderKeys, saveDirectPurchaseOrder, type DirectOrderLineInput, type DirectOrderUpsertInput } from '../api/purchaseOrderApi';

interface OrderLineFormValue extends Omit<DirectOrderLineInput, 'plannedDate'> {
  plannedDate: Dayjs;
}

interface OrderFormValues {
  supplier: string;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  orderDate: Dayjs;
  items: OrderLineFormValue[];
}

const objectTypeOptions = [
  { value: 'MATERIAL', label: '物料采购' }, { value: 'FREE_TEXT', label: '无物料号采购' },
  { value: 'SERVICE', label: '服务采购' }, { value: 'LIMIT_SERVICE', label: '限额服务' }, { value: 'ASSET', label: '固定资产' },
];

const scenarioOptions = [
  { value: 'MAT_STOCK', label: '库存物料收货' }, { value: 'MAT_CONSUME', label: '消耗性物料收货' },
  { value: 'MAT_FREE', label: '无物料号收货' }, { value: 'SERVICE', label: '服务验收' }, { value: 'SERVICE_LIMIT', label: '限额服务执行' },
  { value: 'ASSET', label: '固定资产收货' },
];

const defaultScenario: Partial<Record<ProcurementObjectType, ExecutionScenario>> = {
  MATERIAL: 'MAT_STOCK', FREE_TEXT: 'MAT_FREE', SERVICE: 'SERVICE', LIMIT_SERVICE: 'SERVICE_LIMIT', ASSET: 'ASSET',
};

const defaultLine = (): OrderLineFormValue => ({
  objectType: 'MATERIAL', executionScenario: 'MAT_STOCK', content: '', materialGroup: '', quantity: 1, unit: '件', unitPrice: 0, plannedDate: dayjs().add(14, 'day'),
});

export function PurchaseOrderEditorPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<OrderFormValues>();
  const query = useQuery({ queryKey: purchaseOrderKeys.detail(id ?? ''), queryFn: () => getPurchaseOrder(id ?? ''), enabled: isEdit });
  const mutation = useMutation({ mutationFn: saveDirectPurchaseOrder });

  useEffect(() => {
    if (!query.data) return;
    form.setFieldsValue({
      supplier: query.data.supplier, purchaseOrganization: query.data.purchaseOrganization, purchaseGroup: query.data.purchaseGroup,
      company: query.data.company, orderDate: dayjs(query.data.orderDate), items: query.data.items.map((item) => ({
        id: item.id, objectType: item.objectType, executionScenario: item.executionScenario, content: item.content, materialCode: item.materialCode,
        materialGroup: item.materialGroup, specification: item.specification, quantity: item.executionScenario === 'SERVICE' && item.unitPrice ? item.orderedValue / item.unitPrice : item.orderedValue,
        unit: item.executionScenario === 'SERVICE' ? '月' : item.unit, unitPrice: item.unitPrice ?? 0, plannedDate: dayjs(item.plannedDate), plant: item.plant, storageLocation: item.storageLocation,
      })),
    });
  }, [form, query.data]);

  useEffect(() => {
    if (!isEdit) form.setFieldsValue({ company: '北方粮食集团', orderDate: dayjs(), items: [defaultLine()] });
  }, [form, isEdit]);

  const submit = async (submitForApproval: boolean) => {
    const values = await form.validateFields();
    const input: DirectOrderUpsertInput = {
      ...values,
      id,
      submit: submitForApproval,
      orderDate: values.orderDate.format('YYYY-MM-DD'),
      items: values.items.map((item) => ({ ...item, plannedDate: item.plannedDate.format('YYYY-MM-DD') })),
    };
    const order = await mutation.mutateAsync(input);
    message.success(submitForApproval ? '采购订单已提交审批。' : '采购订单草稿已保存。');
    await queryClient.invalidateQueries({ queryKey: purchaseOrderKeys.all });
    navigate(`/purchase-orders/${order.id}`);
  };

  if (isEdit && query.isLoading) return <PageLoading />;
  if (isEdit && query.isError) return <PageError onRetry={() => query.refetch()} />;
  if (query.data && (query.data.source !== 'DIRECT' || query.data.status.documentStatus !== 'DRAFT')) return <Result status="403" title="当前订单不允许直接编辑" subTitle="只有未提交的直接采购订单草稿可以编辑。" extra={<Button onClick={() => navigate(`/purchase-orders/${id}`)}>返回订单</Button>} />;

  return <>
    <Button className="back-link" type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(isEdit ? `/purchase-orders/${id}` : '/purchase-orders')}>返回采购订单</Button>
    <PageHeader title={isEdit ? '编辑直接采购订单' : '新建直接采购订单'} description="直接采购不依赖合同或寻源结果，但仍需按订单行明确采购对象和执行场景。" actions={<Space><Button icon={<SaveOutlined />} loading={mutation.isPending} onClick={() => submit(false)}>保存草稿</Button><Button type="primary" icon={<SendOutlined />} loading={mutation.isPending} onClick={() => submit(true)}>提交审批</Button></Space>} />
    <div className="content-surface order-editor">
      <Form form={form} layout="vertical" requiredMark="optional">
        <Typography.Title level={5}>订单基本信息</Typography.Title>
        <div className="planning-form-grid">
          <Form.Item className="planning-form-grid__wide" name="supplier" label="供应商" rules={[{ required: true, message: '请填写供应商。' }]}><Input /></Form.Item>
          <Form.Item name="purchaseOrganization" label="采购组织" rules={[{ required: true }]}><Select options={['原料采购中心','生产采购部','间接采购部','设备采购部'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="purchaseGroup" label="采购组" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="company" label="公司" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="orderDate" label="订单日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
        </div>
        <Typography.Title className="detail-section" level={5}>订单明细</Typography.Title>
        <Form.List name="items">
          {(fields, { add, remove }) => <>
            {fields.map((field, index) => <div className="planning-line-editor" key={field.key}>
              <div className="planning-line-editor__title"><Typography.Text strong>订单行 {String((index + 1) * 10).padStart(5, '0')}</Typography.Text>{fields.length > 1 && <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(field.name)} aria-label={`删除订单行${index + 1}`} />}</div>
              <div className="planning-form-grid planning-form-grid--line">
                <Form.Item name={[field.name, 'id']} hidden><Input /></Form.Item>
                <Form.Item name={[field.name, 'objectType']} label="采购对象" rules={[{ required: true }]}><Select options={objectTypeOptions} onChange={(value: ProcurementObjectType) => form.setFieldValue(['items', field.name, 'executionScenario'], defaultScenario[value])} /></Form.Item>
                <Form.Item name={[field.name, 'executionScenario']} label="执行场景" rules={[{ required: true }]}><Select options={scenarioOptions} /></Form.Item>
                <Form.Item className="planning-form-grid__wide" name={[field.name, 'content']} label="采购内容" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item noStyle shouldUpdate={(previous, current) => previous.items?.[index]?.objectType !== current.items?.[index]?.objectType}>
                  {({ getFieldValue }) => getFieldValue(['items', index, 'objectType']) === 'MATERIAL' && <Form.Item name={[field.name, 'materialCode']} label="物料号"><Input /></Form.Item>}
                </Form.Item>
                <Form.Item name={[field.name, 'materialGroup']} label="物料组" rules={[{ required: true }]}><Input /></Form.Item>
                <Form.Item className="planning-form-grid__wide" name={[field.name, 'specification']} label="规格/服务要求"><Input /></Form.Item>
                <Form.Item name={[field.name, 'quantity']} label="数量" rules={[{ required: true }]}><InputNumber className="field-full" min={0.01} precision={2} /></Form.Item>
                <Form.Item name={[field.name, 'unit']} label="单位" rules={[{ required: true }]}><Select options={['吨','件','批','台','项','月'].map((value) => ({ value, label: value }))} /></Form.Item>
                <Form.Item name={[field.name, 'unitPrice']} label="含税单价" rules={[{ required: true }]}><InputNumber className="field-full" min={0} precision={2} prefix="¥" /></Form.Item>
                <Form.Item name={[field.name, 'plannedDate']} label="计划交付日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
                <Form.Item name={[field.name, 'plant']} label="工厂"><Input /></Form.Item>
                <Form.Item name={[field.name, 'storageLocation']} label="库存地点"><Input placeholder="库存物料可填" /></Form.Item>
              </div>
            </div>)}
            <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add(defaultLine())}>添加订单行</Button>
          </>}
        </Form.List>
      </Form>
    </div>
  </>;
}
