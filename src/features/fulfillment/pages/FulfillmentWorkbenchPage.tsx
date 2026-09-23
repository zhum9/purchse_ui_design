import { DownOutlined, EyeOutlined, FileDoneOutlined, MoreOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Dropdown, Empty, Flex, Form, Input, Select, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getRemainingValue } from '@domain/procurement/calculations';
import { scenarioMeta } from '@domain/procurement/meta';
import type { PurchaseOrderItem } from '@domain/procurement/types';
import { ExecutionProgress } from '@shared/components/ExecutionProgress/ExecutionProgress';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError } from '@shared/components/PageState';
import { PermissionGuard } from '@shared/components/PermissionGuard/PermissionGuard';
import { StatusTag } from '@shared/components/StatusTag';
import { scenarioOptions } from '@shared/constants/options';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { getFulfillmentItems, fulfillmentKeys } from '../api/fulfillmentApi';
import { ExecutionDrawer } from '../components/ExecutionDrawer';

const quickFilters = [
  { key: 'ALL', label: '全部' }, { key: 'OPEN', label: '待执行' }, { key: 'PARTIAL', label: '部分执行' },
  { key: 'OVERDUE', label: '已超期' }, { key: 'EXCEPTION', label: '异常' },
];

const actionLabel = (item: PurchaseOrderItem) => item.executionScenario === 'SERVICE' ? '服务验收' : item.executionScenario === 'SERVICE_LIMIT' ? '执行确认' : '收货';

export function FulfillmentWorkbenchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedItem, setSelectedItem] = useState<PurchaseOrderItem>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const queryParams = useMemo(() => ({
    keyword: searchParams.get('keyword') ?? '', scenario: searchParams.get('scenario') ?? '', status: searchParams.get('status') ?? 'ALL',
    purchaseOrganization: searchParams.get('purchaseOrganization') ?? '',
  }), [searchParams]);
  const query = useQuery({ queryKey: fulfillmentKeys.list(queryParams), queryFn: () => getFulfillmentItems(queryParams) });

  const execute = (item: PurchaseOrderItem) => {
    if (item.executionScenario === 'SERVICE') navigate(`/fulfillment/service/${item.id}`);
    else setSelectedItem(item);
  };
  const updateParams = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next);
  };

  const columns: TableColumnsType<PurchaseOrderItem> = [
    { title: 'SAP PO / Item', key: 'po', width: 156, fixed: 'left', render: (_, item) => <div className="primary-cell"><Button type="link" onClick={() => navigate(`/purchase-orders/${item.poId}`)}>{item.sapPoNo}</Button><span>行 {item.itemNo}</span></div> },
    { title: '供应商', dataIndex: 'supplier', width: 190, ellipsis: true },
    { title: '采购内容', key: 'content', width: 220, render: (_, item) => <div className="primary-cell"><strong>{item.content}</strong><span>{item.materialCode ? `${item.materialCode} · ${item.materialGroup}` : item.materialGroup}</span></div> },
    { title: '执行场景', dataIndex: 'executionScenario', width: 112, render: (value: PurchaseOrderItem['executionScenario']) => <Tag color={scenarioMeta[value].color}>{scenarioMeta[value].label}</Tag> },
    { title: '订单量 / 额度', key: 'ordered', width: 154, align: 'right', render: (_, item) => item.unit === '元' ? formatMoney(item.overallLimit ?? item.orderedValue) : formatQuantity(item.orderedValue, item.unit) },
    { title: '执行进度', key: 'progress', width: 210, render: (_, item) => <ExecutionProgress item={item} compact /> },
    { title: '计划日期', dataIndex: 'plannedDate', width: 112 },
    { title: '履约状态', key: 'status', width: 116, render: (_, item) => <StatusTag domain="fulfillment" value={item.status.fulfillmentStatus} /> },
    { title: '操作', key: 'actions', width: 170, fixed: 'right', render: (_, item) => <Space>
      <PermissionGuard permission={item.executionScenario === 'SERVICE' ? 'service:accept' : 'receipt:create'}><Button type="link" disabled={getRemainingValue(item) === 0} onClick={() => execute(item)}>{actionLabel(item)}</Button></PermissionGuard>
      <Dropdown menu={{ items: [
        { key: 'detail', icon: <EyeOutlined />, label: '查看订单详情', onClick: () => navigate(`/purchase-orders/${item.poId}`) },
        { key: 'flow', icon: <FileDoneOutlined />, label: '查看单据流', onClick: () => navigate(`/purchase-orders/${item.poId}?tab=flow`) },
      ] }}><Button type="text" aria-label="更多操作" icon={<MoreOutlined />} /></Dropdown>
    </Space> },
  ];

  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  const data = query.data?.items ?? [];
  return (
    <>
      <PageHeader title="采购履约工作台" description="统一处理采购订单行的收货、服务验收及限额执行。系统按订单行自动识别执行场景。" actions={<Button icon={<FileDoneOutlined />} onClick={() => navigate('/fulfillment/records')}>履约记录</Button>} />
      <div className="content-surface content-surface--flush">
        <Tabs className="quick-tabs" activeKey={queryParams.status} onChange={(status) => updateParams({ status })} items={quickFilters.map((filter) => ({ key: filter.key, label: `${filter.label}${filter.key === 'ALL' ? ` ${query.data?.total ?? 0}` : ''}` }))} />
        <Form className="search-panel" layout="inline" initialValues={queryParams} onFinish={(values: { keyword?: string; scenario?: string; purchaseOrganization?: string }) => updateParams(values)}>
          <Form.Item name="keyword"><Input allowClear prefix={<SearchOutlined />} placeholder="SAP订单 / 供应商 / 采购内容" /></Form.Item>
          <Form.Item name="scenario"><Select allowClear placeholder="执行场景" options={scenarioOptions} /></Form.Item>
          {advancedOpen && <Form.Item name="purchaseOrganization"><Select allowClear placeholder="采购组织" options={[
            { value: '原料采购中心', label: '原料采购中心' }, { value: '间接采购部', label: '间接采购部' },
            { value: '生产采购部', label: '生产采购部' }, { value: '设备采购部', label: '设备采购部' },
          ]} /></Form.Item>}
          <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item>
          <Form.Item><Button onClick={() => setSearchParams({ status: 'ALL' })}>重置</Button></Form.Item>
          <Button type="link" icon={advancedOpen ? <UpOutlined /> : <DownOutlined />} onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? '收起筛选' : '更多筛选'}</Button>
        </Form>
        <Flex className="table-toolbar" justify="space-between"><Typography.Text strong>待办订单行</Typography.Text><Typography.Text type="secondary">共 {query.data?.total ?? 0} 条</Typography.Text></Flex>
        <Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={data} pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (total) => `共 ${total} 条` }} scroll={{ x: 1480 }} locale={{ emptyText: <Empty description="当前筛选条件下没有待执行采购订单行。" /> }} />
      </div>
      <ExecutionDrawer key={selectedItem?.id ?? 'empty'} item={selectedItem} open={Boolean(selectedItem)} onClose={() => setSelectedItem(undefined)} />
    </>
  );
}
