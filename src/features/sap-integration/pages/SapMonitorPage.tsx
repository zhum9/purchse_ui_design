import { EyeOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Space, Table, Tabs, Typography, type TableColumnsType } from 'antd';
import { useMemo, useState } from 'react';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { SapExecution, SapSyncStatus } from '@domain/procurement/types';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime } from '@shared/utils/format';
import { getSapExecutions, reconcileSapExecution, sapKeys } from '../api/sapIntegrationApi';
import { SapDetailDrawer } from '../components/SapDetailDrawer';

const statusFilters: Array<{ key: SapSyncStatus | 'ALL'; label: string }> = [
  { key: 'ALL', label: '全部' }, { key: 'WAITING', label: '待发送' }, { key: 'PROCESSING', label: '处理中' },
  { key: 'SUCCESS', label: '成功' }, { key: 'FAILED', label: '失败' }, { key: 'UNKNOWN', label: '待核对' },
];

export function SapMonitorPage() {
  const [status, setStatus] = useState<SapSyncStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<SapExecution>();
  const { message } = App.useApp();
  const client = useQueryClient();
  const query = useQuery({ queryKey: sapKeys.all, queryFn: getSapExecutions });
  const mutation = useMutation({
    mutationFn: reconcileSapExecution,
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: sapKeys.all });
      message.warning(result.message ?? '没有获得可验证的 SAP 回执，状态保持待核对。');
    },
  });
  const data = useMemo(() => (query.data?.items ?? []).filter((item) => status === 'ALL' || item.status === status), [query.data, status]);
  const counts = (query.data?.items ?? []).reduce<Record<SapSyncStatus, number>>((result, item) => ({ ...result, [item.status]: result[item.status] + 1 }), { WAITING: 0, PROCESSING: 0, SUCCESS: 0, FAILED: 0, UNKNOWN: 0 });
  const columns: TableColumnsType<SapExecution> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 170, fixed: 'left', render: (value: string, item) => <Button type="link" onClick={() => setSelected(item)}>{value}</Button> },
    { title: '业务动作', dataIndex: 'businessAction', width: 130, render: (value: SapExecution['businessAction']) => eventTypeMeta[value].label },
    { title: 'SAP PO / Item', key: 'po', width: 170, render: (_, item) => `${item.sapPoNo || '未关联'} / ${item.itemNo || '—'}` },
    { title: '执行时间', dataIndex: 'executedAt', width: 160, render: formatDateTime },
    { title: '状态', dataIndex: 'status', width: 145, render: (value: SapExecution['status']) => <StatusTag domain="sap" value={value} /> },
    { title: 'SAP凭证', dataIndex: 'sapDocumentNo', width: 130, render: (value?: string) => value ?? '—' },
    { title: '错误摘要 / 处理建议', dataIndex: 'errorSummary', ellipsis: true, render: (value: string | undefined, item) => value ? <Typography.Text type={item.status === 'FAILED' ? 'danger' : 'warning'}>{value}</Typography.Text> : '—' },
    { title: '操作', key: 'actions', width: 190, fixed: 'right', render: (_, item) => <Space>
      <Button type="link" icon={<EyeOutlined />} onClick={() => setSelected(item)}>详情</Button>
      {item.status === 'UNKNOWN' && <Button type="link" icon={<SafetyCertificateOutlined />} loading={mutation.isPending} onClick={() => mutation.mutate(item.id)}>状态核对</Button>}
      {item.status === 'FAILED' && <Typography.Text type="secondary" title="真实 SAP 适配器未接入，当前不能安全重发">未连接重试通道</Typography.Text>}
    </Space> },
  ];
  return <>
    <PageHeader title="SAP执行监控" description="查看本机原型记录的业务事实和演示状态。状态未知时，必须先取得 SAP 查询证据，不能直接重试。" actions={<Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => query.refetch()}>刷新记录</Button>} />
    <Alert className="editor-section" type="info" showIcon title="当前未连接真实 SAP Adapter。下列请求及状态是本地样例或本机原型记录，状态核对不会写入成功状态。" />
    {query.isError && <Alert className="editor-section" type="error" showIcon title={query.error.message} />}
    <MetricStrip items={[{ label: '当前记录', value: query.data?.total ?? 0 }, { label: '演示成功', value: counts.SUCCESS, tone: 'success' }, { label: '演示失败', value: counts.FAILED, tone: 'error' }, { label: '状态待核对', value: counts.UNKNOWN, tone: 'warning' }]} />
    <div className="content-surface content-surface--flush"><Tabs activeKey={status} onChange={(key) => setStatus(key as SapSyncStatus | 'ALL')} items={statusFilters.map((item) => ({ key: item.key, label: item.label }))} /><Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={data} pagination={{ pageSize: 20 }} scroll={{ x: 1480 }} locale={{ emptyText: <Empty description="当前状态下暂无 SAP 执行记录" /> }} /></div>
    <SapDetailDrawer execution={selected} open={Boolean(selected)} onClose={() => setSelected(undefined)} />
  </>;
}
