import { CheckOutlined, EditOutlined, EyeOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Empty, Form, Input, Select, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ProcurementDemand } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatMoney } from '@shared/utils/format';
import { DemandEditorDrawer } from '../components/DemandEditorDrawer';
import { approveProcurementDemand, demandStatusFilters, getProcurementDemands, planningKeys } from '../api/procurementPlanningApi';

const priorityMeta = { URGENT: { label: '紧急', color: 'error' }, HIGH: { label: '高', color: 'warning' }, NORMAL: { label: '普通', color: 'processing' }, LOW: { label: '低', color: 'default' } } as const;

export function ProcurementDemandListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [editor, setEditor] = useState<{ mode: 'create' | 'edit' | 'view'; demand?: ProcurementDemand }>();
  const queryParams = useMemo(() => ({ keyword: searchParams.get('keyword') ?? '', status: searchParams.get('status') ?? 'ALL', department: searchParams.get('department') ?? '' }), [searchParams]);
  const query = useQuery({ queryKey: planningKeys.demandList(queryParams), queryFn: () => getProcurementDemands(queryParams) });
  const approveMutation = useMutation({ mutationFn: approveProcurementDemand, onSuccess: async () => { message.success('采购需求已审批通过。'); await queryClient.invalidateQueries({ queryKey: planningKeys.demands }); } });
  const update = (values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setSearchParams(next);
  };
  const approve = (demand: ProcurementDemand) => modal.confirm({ title: '确认审批通过该采购需求？', content: '审批通过后，需求明细将进入需求汇总池。', okText: '审批通过', onOk: () => approveMutation.mutateAsync(demand.id) });
  const columns: TableColumnsType<ProcurementDemand> = [
    { title: '需求单号', dataIndex: 'demandNo', width: 155, fixed: 'left', render: (value: string, demand) => <div className="primary-cell"><Button type="link" onClick={() => setEditor({ mode: 'view', demand })}>{value}</Button><span>{demand.title}</span></div> },
    { title: '需求部门 / 申请人', key: 'department', width: 175, render: (_, demand) => <div className="primary-cell"><span>{demand.department}</span><span>{demand.applicant}</span></div> },
    { title: '优先级', dataIndex: 'priority', width: 92, render: (value: ProcurementDemand['priority']) => <Tag color={priorityMeta[value].color}>{priorityMeta[value].label}</Tag> },
    { title: '需求日期', dataIndex: 'requiredDate', width: 112 },
    { title: '预估金额', dataIndex: 'estimatedAmount', width: 145, align: 'right', render: (value: number) => formatMoney(value) },
    { title: '明细数', dataIndex: 'lines', width: 82, align: 'right', render: (lines: ProcurementDemand['lines']) => lines.length },
    { title: '需求状态', dataIndex: 'status', width: 145, render: (value: ProcurementDemand['status']) => <StatusTag domain="demand" value={value} /> },
    { title: '更新时间', dataIndex: 'updatedAt', width: 155, render: formatDateTime },
    { title: '操作', key: 'action', width: 190, fixed: 'right', render: (_, demand) => <Space size={4}>
      <Button type="link" icon={<EyeOutlined />} onClick={() => setEditor({ mode: 'view', demand })}>查看</Button>
      {['DRAFT', 'REJECTED'].includes(demand.status) && <Button type="link" icon={<EditOutlined />} onClick={() => setEditor({ mode: 'edit', demand })}>编辑</Button>}
      {demand.status === 'SUBMITTED' && <Button type="link" icon={<CheckOutlined />} onClick={() => approve(demand)}>审批</Button>}
    </Space> },
  ];
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  return <>
    <PageHeader title="采购需求" description="统一管理物料、无物料号、服务及限额类采购需求。" actions={<Space><Button onClick={() => navigate('/planning/aggregation')}>需求汇总</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setEditor({ mode: 'create' })}>新建采购需求</Button></Space>} />
    <div className="content-surface content-surface--flush">
      <Tabs className="quick-tabs" activeKey={queryParams.status} onChange={(status) => update({ status })} items={demandStatusFilters.map((item) => ({ key: item.key, label: item.label }))} />
      <Form className="search-panel" layout="inline" initialValues={queryParams} onFinish={(values: { keyword?: string; department?: string }) => update(values)}>
        <Form.Item name="keyword"><Input prefix={<SearchOutlined />} allowClear placeholder="需求单号 / 主题 / 申请人" /></Form.Item>
        <Form.Item name="department"><Select allowClear placeholder="需求部门" options={['原料供应部','生产运营部','设备管理部','数字化中心','质量安全部'].map((value) => ({ value, label: value }))} /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit">查询</Button></Form.Item><Form.Item><Button onClick={() => setSearchParams({ status: 'ALL' })}>重置</Button></Form.Item>
      </Form>
      <Space className="table-toolbar"><Typography.Text strong>采购需求列表</Typography.Text><Typography.Text type="secondary">共 {query.data?.total ?? 0} 条</Typography.Text></Space>
      <Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={query.data?.items} scroll={{ x: 1370 }} pagination={{ pageSize: 20, showSizeChanger: false }} locale={{ emptyText: <Empty description="当前筛选条件下没有采购需求。" /> }} />
    </div>
    <DemandEditorDrawer open={Boolean(editor)} mode={editor?.mode ?? 'create'} demand={editor?.demand} onClose={() => setEditor(undefined)} onSaved={async () => { setEditor(undefined); await queryClient.invalidateQueries({ queryKey: planningKeys.demands }); }} />
  </>;
}
