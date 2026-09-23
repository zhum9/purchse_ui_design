import { EyeOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { App, Button, Empty, Space, Table, Tabs, Typography, type TableColumnsType } from 'antd';
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
  const { message, modal } = App.useApp();
  const query = useQuery({ queryKey: sapKeys.all, queryFn: getSapExecutions });
  const mutation = useMutation({ mutationFn: reconcileSapExecution, onSuccess: () => message.success('SAP状态核对完成，已回写凭证结果。') });
  const data = useMemo(() => (query.data?.items ?? []).filter((item) => status === 'ALL' || item.status === status), [query.data, status]);
  const counts = (query.data?.items ?? []).reduce<Record<SapSyncStatus, number>>((result, item) => ({ ...result, [item.status]: result[item.status] + 1 }), { WAITING: 0, PROCESSING: 0, SUCCESS: 0, FAILED: 0, UNKNOWN: 0 });
  const retry = (record: SapExecution) => modal.confirm({ title: '确认重新执行？', content: '系统将使用原业务请求进行受控重试。请确认失败原因已经处理。', okText: '确认重试', cancelText: '取消', onOk: () => message.success(`已提交 ${record.businessDocumentNo} 重新执行。`) });
  const columns: TableColumnsType<SapExecution> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 170, fixed: 'left', render: (value: string, item) => <Button type="link" onClick={() => setSelected(item)}>{value}</Button> },
    { title: '业务动作', dataIndex: 'businessAction', width: 120, render: (value: SapExecution['businessAction']) => eventTypeMeta[value].label },
    { title: 'SAP PO / Item', key: 'po', width: 170, render: (_, item) => `${item.sapPoNo} / ${item.itemNo}` },
    { title: '执行时间', dataIndex: 'executedAt', width: 160, render: formatDateTime },
    { title: '状态', dataIndex: 'status', width: 145, render: (value: SapExecution['status']) => <StatusTag domain="sap" value={value} /> },
    { title: 'SAP凭证', dataIndex: 'sapDocumentNo', width: 130, render: (value?: string) => value ?? '-' },
    { title: '错误摘要 / 处理建议', dataIndex: 'errorSummary', ellipsis: true, render: (value: string | undefined, item) => value ? <Typography.Text type={item.status === 'FAILED' ? 'danger' : 'warning'}>{value}</Typography.Text> : '-' },
    { title: '操作', key: 'actions', width: 190, fixed: 'right', render: (_, item) => <Space>
      <Button type="link" icon={<EyeOutlined />} onClick={() => setSelected(item)}>详情</Button>
      {item.status === 'UNKNOWN' && <Button type="link" icon={<SafetyCertificateOutlined />} loading={mutation.isPending} onClick={() => mutation.mutate(item.id)}>状态核对</Button>}
      {item.status === 'FAILED' && item.canRetry && <Button type="link" icon={<ReloadOutlined />} onClick={() => retry(item)}>重新执行</Button>}
    </Space> },
  ];
  return <>
    <PageHeader title="SAP执行监控" description="跟踪业务单据向 SAP 提交后的处理结果。状态未知的请求必须先核对，避免重复过账。" actions={<Button icon={<ReloadOutlined />} onClick={() => query.refetch()}>刷新</Button>} />
    <MetricStrip items={[{ label: '今日请求', value: query.data?.total ?? 0 }, { label: '执行成功', value: counts.SUCCESS, tone: 'success' }, { label: '执行失败', value: counts.FAILED, tone: 'error' }, { label: '状态待核对', value: counts.UNKNOWN, tone: 'warning' }]} />
    <div className="content-surface content-surface--flush"><Tabs activeKey={status} onChange={(key) => setStatus(key as SapSyncStatus | 'ALL')} items={statusFilters.map((item) => ({ key: item.key, label: item.label }))} /><Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={data} pagination={{ pageSize: 20 }} scroll={{ x: 1400 }} locale={{ emptyText: <Empty description="当前状态下暂无 SAP 执行记录" /> }} /></div>
    <SapDetailDrawer execution={selected} open={Boolean(selected)} onClose={() => setSelected(undefined)} />
  </>;
}
