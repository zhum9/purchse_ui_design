import { SyncOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Space, Table, Tag, Typography, type TableColumnsType } from 'antd';
import { useMemo } from 'react';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { SapExecution } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime } from '@shared/utils/format';
import { getSapExecutions, reconcileSapExecution, sapKeys } from '../api/sapIntegrationApi';

export function SapReconciliationPage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const query = useQuery({ queryKey: sapKeys.all, queryFn: getSapExecutions });
  const reconcile = useMutation({
    mutationFn: reconcileSapExecution,
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: sapKeys.all });
      message.warning(result.message);
    },
  });
  const pending = useMemo(() => (query.data?.items ?? []).filter((item) => ['UNKNOWN', 'FAILED'].includes(item.status)), [query.data]);
  const columns: TableColumnsType<SapExecution> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 180 },
    { title: '业务动作', dataIndex: 'businessAction', width: 140, render: (value: SapExecution['businessAction']) => eventTypeMeta[value].label },
    { title: 'SAP PO / Item', width: 180, render: (_, item) => `${item.sapPoNo || '未关联'} / ${item.itemNo || '—'}` },
    { title: '状态', dataIndex: 'status', width: 130, render: (value: SapExecution['status']) => <StatusTag domain="sap" value={value} /> },
    { title: 'SAP凭证', dataIndex: 'sapDocumentNo', width: 140, render: (value?: string) => value ?? '—' },
    { title: '当前已知信息', dataIndex: 'errorSummary', render: (value?: string) => value ?? '请求结果未知，需要 SAP 查询证据' },
    { title: '发生时间', dataIndex: 'executedAt', width: 170, render: formatDateTime },
    { title: '下一步', key: 'action', width: 155, fixed: 'right', render: (_, item) => item.status === 'UNKNOWN'
      ? <Button type="link" loading={reconcile.isPending} onClick={() => reconcile.mutate(item.id)}>查询 SAP 状态</Button>
      : <Tag color="warning">确认原因后由接口通道处理</Tag> },
  ];
  if (query.isLoading) return <PageLoading />;
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  return <>
    <PageHeader title="SAP业务对账" description="集中查看失败和状态未知的本地执行记录，跟踪核对进度。" actions={<Button icon={<SyncOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>刷新执行记录</Button>} />
    <Alert type="warning" showIcon title="真实 SAP 查询接口尚未接入，目前不能确认凭证差异或将记录标记为已处理。" description={<Space direction="vertical" size={0}><Typography.Text>此处展示的是本地执行状态清单，不代表已完成 SAP 对账。</Typography.Text><Typography.Text>状态未知时只能查询 SAP；未获得可验证的 SAP 证据前，不自动转成功，也不允许重试。</Typography.Text></Space>} />
    <div className="content-surface reconciliation-table"><Table rowKey="id" size="small" dataSource={pending} pagination={{ pageSize: 20 }} columns={columns} scroll={{ x: 1250 }} locale={{ emptyText: <Empty description="没有待核对或失败的执行记录" /> }} /></div>
  </>;
}
