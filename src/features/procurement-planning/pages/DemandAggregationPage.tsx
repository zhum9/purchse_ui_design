import { ApartmentOutlined, FileAddOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Drawer, Empty, Form, Input, InputNumber, Select, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useMemo, useState, type Key } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { DemandPoolItem, ProcurementPlanType } from '@domain/procurement/types';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError } from '@shared/components/PageState';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { createProcurementPlan, getDemandPool, planningKeys } from '../api/procurementPlanningApi';

interface PlanFormValues {
  name: string;
  type: ProcurementPlanType;
  purchaseOrganization: string;
  purchaseGroup: string;
  company: string;
  owner: string;
  plannedOrderDate: Dayjs;
  notes?: string;
}

const objectLabels: Record<DemandPoolItem['objectType'], string> = {
  MATERIAL: '物料', FREE_TEXT: '无物料号', SERVICE: '服务', LIMIT_SERVICE: '限额服务', ASSET: '固定资产',
  SUBCONTRACT: '外协', CONSIGNMENT: '寄售', OTHER: '其他',
};

export function DemandAggregationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<PlanFormValues>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sourceQuantities, setSourceQuantities] = useState<Record<string, string>>({});
  const queryParams = useMemo(() => ({ keyword: searchParams.get('keyword') ?? '', department: searchParams.get('department') ?? '' }), [searchParams]);
  const query = useQuery({ queryKey: planningKeys.demandPool(queryParams), queryFn: () => getDemandPool(queryParams) });
  const mutation = useMutation({ mutationFn: createProcurementPlan });
  const selectedItems = (query.data?.items ?? []).filter((item) => selectedRowKeys.includes(item.id));
  const selectedEstimateLines = selectedItems.map((item) => ({ quantity: Number(sourceQuantities[item.id] ?? (item.quantity - item.plannedQuantity)), unitPrice: item.estimatedUnitPrice }));
  const totalAmount = selectedEstimateLines.reduce((sum, line) => sum + (line.unitPrice === undefined ? 0 : line.quantity * line.unitPrice), 0);
  const totalAmountLabel = selectedEstimateLines.some((line) => line.unitPrice === undefined) ? `${totalAmount ? formatMoney(totalAmount) : '待估'}（部分待估）` : formatMoney(totalAmount);
  const overdueCount = (query.data?.items ?? []).filter((item) => dayjs(item.requiredDate).isBefore(dayjs(), 'day')).length;
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSelectedRowKeys([]);
    setSourceQuantities({});
    setSearchParams(next);
  };
  const openPlanDrawer = () => {
    form.setFieldsValue({ company: '北方粮食集团', owner: '张敏', type: 'CENTRALIZED', plannedOrderDate: dayjs().add(7, 'day') });
    setDrawerOpen(true);
  };
  const createPlan = async () => {
    const values = await form.validateFields();
    const plan = await mutation.mutateAsync({ ...values, sourceQuantities, plannedOrderDate: values.plannedOrderDate.format('YYYY-MM-DD'), demandLineIds: selectedItems.map((item) => item.id) });
    message.success(`采购计划 ${plan.planNo} 已创建，待审批。`);
    await Promise.all([queryClient.invalidateQueries({ queryKey: planningKeys.demands }), queryClient.invalidateQueries({ queryKey: planningKeys.plans })]);
    navigate(`/planning/plans/${plan.id}`);
  };
  const columns: TableColumnsType<DemandPoolItem> = [
    { title: '需求来源', key: 'source', width: 190, fixed: 'left', render: (_, item) => <div className="primary-cell"><strong>{item.demandNo}</strong><span>{item.demandTitle}</span></div> },
    { title: '需求内容', key: 'content', width: 240, render: (_, item) => <div className="primary-cell"><span>{item.content}</span><span>{item.materialCode ?? item.materialGroup}</span></div> },
    { title: '建议供应商', dataIndex: 'suggestedSupplier', width: 190, ellipsis: true, render: (value?: string) => value ?? '-' },
    { title: '类型', dataIndex: 'objectType', width: 110, render: (value: DemandPoolItem['objectType']) => <Tag>{objectLabels[value]}</Tag> },
    { title: '需求部门', dataIndex: 'department', width: 130 },
    { title: '需求数量', key: 'quantity', width: 125, align: 'right', render: (_, item) => formatQuantity(item.quantity, item.unit) },
    { title: '已确认 / 审批占用', key: 'planned', width: 160, align: 'right', render: (_, item) => `${formatQuantity(item.committedQuantity ?? 0, item.unit)} / ${formatQuantity(item.reservedQuantity ?? 0, item.unit)}` },
    { title: '本次可汇总', key: 'remaining', width: 130, align: 'right', render: (_, item) => <Typography.Text strong>{formatQuantity(item.quantity - item.plannedQuantity, item.unit)}</Typography.Text> },
    { title: '本次计划量', key: 'selectedQuantity', width: 150, align: 'right', render: (_, item) => <InputNumber<string> stringMode min="0.000001" max={String(item.quantity - item.plannedQuantity)} precision={6} value={sourceQuantities[item.id] ?? String(item.quantity - item.plannedQuantity)} onChange={(value) => setSourceQuantities((previous) => ({ ...previous, [item.id]: value ?? '0' }))} aria-label={`${item.content}本次计划量`} /> },
    { title: '预估金额', key: 'amount', width: 145, align: 'right', render: (_, item) => item.estimatedUnitPrice === undefined ? '待估' : formatMoney(Number(sourceQuantities[item.id] ?? (item.quantity - item.plannedQuantity)) * item.estimatedUnitPrice) },
    { title: '需求日期', dataIndex: 'requiredDate', width: 112 },
  ];
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  return <>
    <PageHeader title="需求池与汇总" description="已授权需求可以部分编制计划，也可以直接下单；保留逐行规格、交期与来源份额。" actions={<Space><Button disabled={!selectedItems.length} onClick={() => navigate(`/purchase-orders/new?source=DEMAND_ORDER&lines=${encodeURIComponent(selectedItems.map((item) => item.id).join(','))}`)}>直接编制订单</Button><Button type="primary" icon={<FileAddOutlined />} disabled={!selectedItems.length} onClick={openPlanDrawer}>编制采购计划</Button></Space>} />
    <MetricStrip items={[{ label: '待汇总明细', value: query.data?.total ?? 0 }, { label: '已选明细', value: selectedItems.length, tone: selectedItems.length ? 'success' : 'default' }, { label: '已选预估金额', value: totalAmountLabel }, { label: '已逾需求日期', value: overdueCount, tone: overdueCount ? 'error' : 'default' }]} />
    <div className="content-surface content-surface--flush">
      <Form className="search-panel" layout="inline" initialValues={queryParams} onFinish={(values: { keyword?: string; department?: string }) => update(values)}>
        <Form.Item name="keyword"><Input prefix={<SearchOutlined />} allowClear placeholder="需求单 / 采购内容 / 物料" /></Form.Item>
        <Form.Item name="department"><Select allowClear placeholder="需求部门" options={['原料供应部','生产运营部','设备管理部','数字化中心','质量安全部'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item><Form.Item><Button onClick={() => setSearchParams({})}>重置</Button></Form.Item>
      </Form>
      <Space className="table-toolbar"><Typography.Text strong>已审批需求明细</Typography.Text><Typography.Text type="secondary">当前逐行保留来源，不隐式合并不同规格或交期</Typography.Text></Space>
      <Table rowKey="id" size="small" loading={query.isLoading} rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} columns={columns} dataSource={query.data?.items} scroll={{ x: 1510 }} pagination={false} locale={{ emptyText: <Empty description="当前没有可汇总的已审批需求。" /> }} />
    </div>
    <Drawer title="形成采购计划" width={760} open={drawerOpen} onClose={() => setDrawerOpen(false)} extra={<Button type="primary" loading={mutation.isPending} onClick={createPlan}>创建计划</Button>}>
      <Alert type="info" showIcon message={`已选 ${selectedItems.length} 条需求明细`} description="按需求池中填写的本次计划量提交；不强行合并规格、日期不同的来源。审批占用与确认分配分别记录。" />
      {mutation.isError && <Alert type="error" title={mutation.error.message} showIcon />}
      <Form className="planning-drawer-form" form={form} layout="vertical">
        <div className="planning-form-grid">
          <Form.Item className="planning-form-grid__wide" name="name" label="计划名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="计划类型" rules={[{ required: true }]}><Select options={[{value:'CENTRALIZED',label:'集中采购'},{value:'FRAME_AGREEMENT',label:'框架协议'},{value:'DIRECT',label:'直接采购'}]} /></Form.Item>
          <Form.Item name="plannedOrderDate" label="计划下单日期" rules={[{ required: true }]}><DatePicker className="field-full" /></Form.Item>
          <Form.Item name="purchaseOrganization" label="采购组织" rules={[{ required: true }]}><Select suffixIcon={<ApartmentOutlined />} options={['原料采购中心','生产采购部','间接采购部','设备采购部'].map((value) => ({ value, label: value }))} /></Form.Item>
          <Form.Item name="purchaseGroup" label="采购组" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="company" label="公司" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="owner" label="计划负责人" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item className="planning-form-grid__wide" name="notes" label="计划说明"><Input.TextArea rows={3} /></Form.Item>
        </div>
      </Form>
      <Typography.Title level={5}>选中需求</Typography.Title>
      <Table rowKey="id" size="small" columns={columns.slice(0, 4)} dataSource={selectedItems} pagination={false} scroll={{ x: 760 }} />
    </Drawer>
  </>;
}
