import { EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Form, Input, Select, Space, Table, Tabs, Typography, type TableColumnsType } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PurchaseOrder } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatMoney } from '@shared/utils/format';
import { getPurchaseOrders, purchaseOrderKeys } from '../api/purchaseOrderApi';

const filters = [
  { key: 'ALL', label: '全部订单' }, { key: 'OPEN', label: '待执行' }, { key: 'PARTIAL', label: '部分执行' },
  { key: 'COMPLETE', label: '执行完成' }, { key: 'EXCEPTION', label: '异常' },
];
const sourceLabels: Record<PurchaseOrder['source'], string> = { CONTRACT: '采购合同', REQUISITION: '采购申请', SOURCING: '寻源结果', DIRECT: '直接采购', EXTERNAL_SAP: 'SAP下发' };

export function PurchaseOrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParams = useMemo(() => ({ keyword: searchParams.get('keyword') ?? '', status: searchParams.get('status') ?? 'ALL', purchaseOrganization: searchParams.get('purchaseOrganization') ?? '' }), [searchParams]);
  const query = useQuery({ queryKey: purchaseOrderKeys.list(queryParams), queryFn: () => getPurchaseOrders(queryParams) });
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next);
  };
  const columns: TableColumnsType<PurchaseOrder> = [
    { title: 'SAP采购订单', dataIndex: 'sapPoNo', width: 150, fixed: 'left', render: (value: string, order) => <div className="primary-cell"><Button type="link" onClick={() => navigate(`/purchase-orders/${order.id}`)}>{value}</Button><span>{order.businessOrderNo}</span></div> },
    { title: '订单来源', dataIndex: 'source', width: 110, render: (value: PurchaseOrder['source']) => sourceLabels[value] },
    { title: '供应商', dataIndex: 'supplier', width: 210, ellipsis: true },
    { title: '采购组织 / 采购组', key: 'org', width: 190, render: (_, order) => <div className="primary-cell"><span>{order.purchaseOrganization}</span><span>{order.purchaseGroup}</span></div> },
    { title: '订单日期', dataIndex: 'orderDate', width: 112 },
    { title: '订单金额', dataIndex: 'amount', width: 150, align: 'right', render: (value: number) => <Typography.Text strong>{formatMoney(value)}</Typography.Text> },
    { title: '行数', dataIndex: 'items', width: 76, align: 'right', render: (items: PurchaseOrder['items']) => items.length },
    { title: '履约状态', key: 'fulfillment', width: 118, render: (_, order) => <StatusTag domain="fulfillment" value={order.status.fulfillmentStatus} /> },
    { title: 'SAP同步状态', key: 'sap', width: 138, render: (_, order) => <StatusTag domain="sap" value={order.status.sapSyncStatus} /> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 155, render: formatDateTime },
    { title: '操作', key: 'action', width: 90, fixed: 'right', render: (_, order) => <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/purchase-orders/${order.id}`)}>查看</Button> },
  ];
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  return <>
    <PageHeader title="采购订单" description="统一查看合同、采购申请、寻源、直接采购及 SAP 下发的采购订单。" />
    <div className="content-surface content-surface--flush">
      <Tabs className="quick-tabs" activeKey={queryParams.status} onChange={(status) => update({ status })} items={filters.map((filter) => ({ key: filter.key, label: filter.label }))} />
      <Form className="search-panel" layout="inline" initialValues={queryParams} onFinish={(values: { keyword?: string; purchaseOrganization?: string }) => update(values)}>
        <Form.Item name="keyword"><Input prefix={<SearchOutlined />} allowClear placeholder="SAP订单 / 业务单号 / 供应商" /></Form.Item>
        <Form.Item name="purchaseOrganization"><Select placeholder="采购组织" allowClear options={[{ value: '原料采购中心', label: '原料采购中心' }, { value: '间接采购部', label: '间接采购部' }, { value: '生产采购部', label: '生产采购部' }, { value: '设备采购部', label: '设备采购部' }]} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item><Form.Item><Button onClick={() => setSearchParams({ status: 'ALL' })}>重置</Button></Form.Item>
      </Form>
      <Space className="table-toolbar"><Typography.Text strong>采购订单列表</Typography.Text><Typography.Text type="secondary">共 {query.data?.total ?? 0} 张订单</Typography.Text></Space>
      <Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={query.data?.items} scroll={{ x: 1500 }} pagination={{ pageSize: 20, showSizeChanger: false }} locale={{ emptyText: <Empty description="当前筛选条件下没有采购订单。" /> }} />
    </div>
  </>;
}
