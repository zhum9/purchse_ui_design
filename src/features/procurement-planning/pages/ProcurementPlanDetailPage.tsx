import { ArrowLeftOutlined, CheckOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, DatePicker, Descriptions, Drawer, Form, Input, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type Key } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProcurementPlanLine } from '@domain/procurement/types';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { approveProcurementPlan, createPurchaseOrderFromPlan, getProcurementPlan, planningKeys } from '../api/procurementPlanningApi';

interface OrderFormValues {
  supplier: string;
  company: string;
  purchaseGroup: string;
  orderDate: Dayjs;
}

export function ProcurementPlanDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<OrderFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const query = useQuery({ queryKey: planningKeys.planDetail(id), queryFn: () => getProcurementPlan(id), enabled: Boolean(id) });
  const approveMutation = useMutation({ mutationFn: () => approveProcurementPlan(id) });
  const orderMutation = useMutation({ mutationFn: (values: OrderFormValues) => createPurchaseOrderFromPlan(id, { ...values, orderDate: values.orderDate.format('YYYY-MM-DD'), planLineIds: selectedRowKeys.map(String) }) });
  const plan = query.data;
  const availableLines = useMemo(() => plan?.lines.filter((line) => line.orderedQuantity < line.plannedQuantity) ?? [], [plan]);
  const remainingAmount = availableLines.reduce((sum, line) => sum + ((line.plannedQuantity - line.orderedQuantity) * line.estimatedUnitPrice), 0);
  const columns: TableColumnsType<ProcurementPlanLine> = [
    { title: '行', dataIndex: 'lineNo', width: 70, fixed: 'left' },
    { title: '采购内容', key: 'content', width: 250, render: (_, line) => <div className="primary-cell"><strong>{line.content}</strong><span>{line.materialCode ?? line.materialGroup}</span></div> },
    { title: '来源需求', dataIndex: 'sourceDemandNos', width: 170, render: (values: string[]) => <Space size={[4, 4]} wrap>{values.map((value) => <Tag key={value}>{value}</Tag>)}</Space> },
    { title: '计划数量', key: 'planned', width: 125, align: 'right', render: (_, line) => formatQuantity(line.plannedQuantity, line.unit) },
    { title: '已转订单', key: 'ordered', width: 125, align: 'right', render: (_, line) => formatQuantity(line.orderedQuantity, line.unit) },
    { title: '待转订单', key: 'remaining', width: 125, align: 'right', render: (_, line) => <Typography.Text strong>{formatQuantity(line.plannedQuantity - line.orderedQuantity, line.unit)}</Typography.Text> },
    { title: '预估金额', dataIndex: 'estimatedAmount', width: 145, align: 'right', render: (value: number) => formatMoney(value) },
    { title: '需求日期', dataIndex: 'requiredDate', width: 112 },
  ];
  if (query.isLoading) return <PageLoading />;
  if (query.isError || !plan) return <PageError onRetry={() => query.refetch()} />;
  const approve = () => modal.confirm({ title: '确认审批通过该采购计划？', content: '审批通过后可按计划明细生成采购订单。', okText: '审批通过', onOk: async () => { await approveMutation.mutateAsync(); message.success('采购计划已审批通过。'); await queryClient.invalidateQueries({ queryKey: planningKeys.plans }); } });
  const openOrderDrawer = () => {
    setSelectedRowKeys(availableLines.map((line) => line.id));
    form.setFieldsValue({ company: plan.company, purchaseGroup: plan.purchaseGroup, orderDate: dayjs() });
    setDrawerOpen(true);
  };
  const createOrder = async () => {
    const values = await form.validateFields();
    const result = await orderMutation.mutateAsync(values);
    message.success(`采购订单 ${result.businessOrderNo} 已生成。`);
    await Promise.all([queryClient.invalidateQueries({ queryKey: planningKeys.plans }), queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })]);
    navigate(`/purchase-orders/${result.orderId}`);
  };
  const actions = <Space>
    {['DRAFT', 'PENDING_APPROVAL'].includes(plan.status) && <Button type="primary" icon={<CheckOutlined />} loading={approveMutation.isPending} onClick={approve}>审批通过</Button>}
    {['APPROVED', 'PARTIALLY_ORDERED'].includes(plan.status) && <Button type="primary" icon={<ShoppingCartOutlined />} disabled={!availableLines.length} onClick={openOrderDrawer}>生成采购订单</Button>}
  </Space>;
  return <>
    <Button className="back-link" type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/planning/plans')}>返回采购计划</Button>
    <PageHeader title={plan.planNo} description={`${plan.name} · ${plan.purchaseOrganization}`} status={<StatusTag domain="plan" value={plan.status} />} actions={actions} />
    <MetricStrip items={[{ label: '计划预估金额', value: formatMoney(plan.estimatedAmount) }, { label: '计划明细', value: plan.lines.length }, { label: '待转订单明细', value: availableLines.length, tone: availableLines.length ? 'warning' : 'success' }, { label: '待转订单金额', value: formatMoney(remainingAmount) }]} />
    <Tabs defaultActiveKey="lines" items={[
      { key: 'lines', label: `计划明细 ${plan.lines.length}`, children: <Card className="business-card" styles={{ body: { padding: 0 } }}><Table rowKey="id" size="small" columns={columns} dataSource={plan.lines} pagination={false} scroll={{ x: 1220 }} /></Card> },
      { key: 'basic', label: '基本信息', children: <Card className="business-card"><Descriptions column={3} items={[
        { key: 'org', label: '采购组织', children: plan.purchaseOrganization }, { key: 'group', label: '采购组', children: plan.purchaseGroup }, { key: 'owner', label: '负责人', children: plan.owner },
        { key: 'date', label: '计划下单日期', children: plan.plannedOrderDate }, { key: 'company', label: '公司', children: plan.company }, { key: 'approval', label: '审批状态', children: plan.approvalStatus === 'APPROVED' ? '已审批' : '待审批' },
        { key: 'notes', label: '计划说明', children: plan.notes ?? '-', span: 3 },
      ]} /></Card> },
    ]} />
    <Drawer title="由采购计划生成采购订单" width={820} open={drawerOpen} onClose={() => setDrawerOpen(false)} extra={<Button type="primary" loading={orderMutation.isPending} disabled={!selectedRowKeys.length} onClick={createOrder}>确认生成</Button>}>
      <Alert showIcon type="info" message={`来源计划 ${plan.planNo}`} description="订单将保留计划及原始需求追溯关系；SAP订单号由后续同步回写。" />
      <Form className="planning-drawer-form" form={form} layout="vertical">
        <div className="planning-form-grid">
          <Form.Item className="planning-form-grid__wide" name="supplier" label="供应商" rules={[{ required: true, message: '请选择或填写供应商。' }]}><Input placeholder="输入供应商全称" /></Form.Item>
          <Form.Item name="company" label="公司" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="purchaseGroup" label="采购组" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="orderDate" label="订单日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
        </div>
      </Form>
      <Typography.Title level={5}>选择计划明细</Typography.Title>
      <Table rowKey="id" size="small" rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} columns={columns.slice(0, 6)} dataSource={availableLines} pagination={false} scroll={{ x: 900 }} />
    </Drawer>
  </>;
}
