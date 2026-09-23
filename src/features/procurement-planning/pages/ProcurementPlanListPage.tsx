import { EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Form, Input, Progress, Select, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ProcurementPlan } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatMoney } from '@shared/utils/format';
import { getProcurementPlans, planningKeys, planStatusFilters } from '../api/procurementPlanningApi';

const typeLabels = { CENTRALIZED: '集中采购', FRAME_AGREEMENT: '框架协议', DIRECT: '直接采购' } as const;

export function ProcurementPlanListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParams = useMemo(() => ({ keyword: searchParams.get('keyword') ?? '', status: searchParams.get('status') ?? 'ALL', purchaseOrganization: searchParams.get('purchaseOrganization') ?? '' }), [searchParams]);
  const query = useQuery({ queryKey: planningKeys.planList(queryParams), queryFn: () => getProcurementPlans(queryParams) });
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next);
  };
  const columns: TableColumnsType<ProcurementPlan> = [
    { title: '计划编号', dataIndex: 'planNo', width: 155, fixed: 'left', render: (value: string, plan) => <div className="primary-cell"><Button type="link" onClick={() => navigate(`/planning/plans/${plan.id}`)}>{value}</Button><span>{plan.name}</span></div> },
    { title: '计划类型', dataIndex: 'type', width: 115, render: (value: ProcurementPlan['type']) => <Tag>{typeLabels[value]}</Tag> },
    { title: '采购组织 / 采购组', key: 'org', width: 185, render: (_, plan) => <div className="primary-cell"><span>{plan.purchaseOrganization}</span><span>{plan.purchaseGroup}</span></div> },
    { title: '计划负责人', dataIndex: 'owner', width: 112 },
    { title: '计划下单日期', dataIndex: 'plannedOrderDate', width: 130 },
    { title: '预估金额', dataIndex: 'estimatedAmount', width: 150, align: 'right', render: (value: number) => formatMoney(value) },
    { title: '明细', dataIndex: 'lines', width: 75, align: 'right', render: (lines: ProcurementPlan['lines']) => lines.length },
    { title: '订单转换进度', key: 'progress', width: 170, render: (_, plan) => { const planned = plan.lines.reduce((sum, line) => sum + line.plannedQuantity, 0); const ordered = plan.lines.reduce((sum, line) => sum + line.orderedQuantity, 0); return <Progress percent={planned ? Math.round((ordered / planned) * 100) : 0} size="small" />; } },
    { title: '计划状态', dataIndex: 'status', width: 145, render: (value: ProcurementPlan['status']) => <StatusTag domain="plan" value={value} /> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 155, render: formatDateTime },
    { title: '操作', key: 'action', width: 90, fixed: 'right', render: (_, plan) => <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/planning/plans/${plan.id}`)}>查看</Button> },
  ];
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  return <>
    <PageHeader title="采购计划" description="承接已审批采购需求，统一编制、审批并生成可追溯的采购订单。" actions={<Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/planning/aggregation')}>从需求汇总创建</Button>} />
    <div className="content-surface content-surface--flush">
      <Tabs className="quick-tabs" activeKey={queryParams.status} onChange={(status) => update({ status })} items={planStatusFilters.map((item) => ({ key: item.key, label: item.label }))} />
      <Form className="search-panel" layout="inline" initialValues={queryParams} onFinish={(values: { keyword?: string; purchaseOrganization?: string }) => update(values)}>
        <Form.Item name="keyword"><Input prefix={<SearchOutlined />} allowClear placeholder="计划编号 / 计划名称 / 负责人" /></Form.Item>
        <Form.Item name="purchaseOrganization"><Select allowClear placeholder="采购组织" options={['原料采购中心','生产采购部','间接采购部','设备采购部'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item><Form.Item><Button onClick={() => setSearchParams({ status: 'ALL' })}>重置</Button></Form.Item>
      </Form>
      <Space className="table-toolbar"><Typography.Text strong>采购计划列表</Typography.Text><Typography.Text type="secondary">共 {query.data?.total ?? 0} 份</Typography.Text></Space>
      <Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={query.data?.items} scroll={{ x: 1580 }} pagination={{ pageSize: 20, showSizeChanger: false }} locale={{ emptyText: <Empty description="当前筛选条件下没有采购计划。" /> }} />
    </div>
  </>;
}
