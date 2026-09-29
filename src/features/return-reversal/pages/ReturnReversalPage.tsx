import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Empty, Space, Table, Tabs, Tag, type TableColumnsType } from 'antd';
import { useState } from 'react';
import { ReverseOperationDrawer } from '@features/return-reversal/components/ReverseOperationDrawer';
import type { ReverseAction } from '@domain/procurement/reversals';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { ExecutionEvent } from '@domain/procurement/types';
import { fulfillmentKeys, getExecutionEvents } from '@features/fulfillment/api/fulfillmentApi';
import { apiClient } from '@shared/api/client';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatQuantity } from '@shared/utils/format';

export function ReturnReversalPage() {
  const query = useQuery({ queryKey: fulfillmentKeys.events(), queryFn: () => getExecutionEvents() });
  const [selected, setSelected] = useState<{ event: ExecutionEvent; action: ReverseAction }>();
  const [error, setError] = useState<string>();
  const client = useQueryClient();
  const { modal, message } = App.useApp();
  const simulation = useMutation({
    mutationFn: (id: string) => apiClient<ExecutionEvent>(`/api/executions/${id}/simulate-reverse-result`, { method: 'POST' }),
    onSuccess: async (event) => {
      setError(undefined);
      await client.invalidateQueries({ queryKey: fulfillmentKeys.events() });
      await client.invalidateQueries({ queryKey: ['sap-executions'] });
      message.info(`${event.businessDocumentNo} 仅更新了本机演示回执，未调用 SAP。`);
    },
  });
  const events = query.data ?? [];
  const receipts = events.filter((event) => event.type === 'GOODS_RECEIPT' && event.status === 'EFFECTIVE');
  const services = events.filter((event) => event.type === 'SERVICE_ACCEPTANCE' && event.status === 'EFFECTIVE');
  const histories = events.filter((event) => ['PURCHASE_RETURN', 'GR_REVERSAL', 'RETURN_REVERSAL', 'SERVICE_REVERSAL'].includes(event.type));
  const openReverse = (event: ExecutionEvent, action: ReverseAction) => setSelected({ event, action });
  const confirmSimulation = (event: ExecutionEvent) => modal.confirm({
    title: '更新本机演示回执？',
    content: '这只用于查看反向单据状态变化，不连接 SAP，也不能作为真实 ERP 凭证。',
    okText: '更新演示状态', cancelText: '取消',
    onOk: async () => {
      try { await simulation.mutateAsync(event.id); }
      catch (cause) { setError(cause instanceof Error ? cause.message : '演示状态更新失败'); }
    },
  });
  const commonColumns = [
    { title: '采购订单 / 行', width: 190, render: (_: unknown, event: ExecutionEvent) => `${event.poId} / ${event.itemId}` },
    { title: '业务说明', dataIndex: 'title' },
    { title: '执行时间', dataIndex: 'occurredAt', width: 160, render: formatDateTime },
    { title: 'SAP凭证', dataIndex: 'sapDocumentNo', width: 130, render: (value?: string) => value ?? '—' },
    { title: 'SAP状态', dataIndex: 'sapStatus', width: 140, render: (value: ExecutionEvent['sapStatus']) => <StatusTag domain="sap" value={value} /> },
  ];
  const receiptColumns: TableColumnsType<ExecutionEvent> = [
    { title: '原收货单', dataIndex: 'businessDocumentNo', width: 170 },
    ...commonColumns.slice(0, 2),
    { title: '收货数量', width: 130, align: 'right', render: (_, event) => formatQuantity(Math.abs(event.quantity ?? 0), event.unit ?? '') },
    ...commonColumns.slice(2),
    { title: '操作', key: 'actions', width: 160, fixed: 'right', render: (_, event) => <Space>
      <Button type="link" disabled={event.sapStatus !== 'SUCCESS'} onClick={() => openReverse(event, 'PURCHASE_RETURN')}>采购退货</Button>
      <Button type="link" danger disabled={event.sapStatus !== 'SUCCESS'} onClick={() => openReverse(event, 'GR_REVERSAL')}>冲销</Button>
    </Space> },
  ];
  const serviceColumns: TableColumnsType<ExecutionEvent> = [
    { title: '原验收单', dataIndex: 'businessDocumentNo', width: 170 },
    ...commonColumns.slice(0, 2),
    { title: '验收数量 / 金额', width: 160, align: 'right', render: (_, event) => event.amount !== undefined ? `${event.amount.toLocaleString()} 元` : formatQuantity(Math.abs(event.quantity ?? 0), event.unit ?? '') },
    ...commonColumns.slice(2),
    { title: '操作', key: 'actions', width: 130, fixed: 'right', render: (_, event) => <Button type="link" danger disabled={event.sapStatus !== 'SUCCESS'} onClick={() => openReverse(event, 'SERVICE_REVERSAL')}>验收更正</Button> },
  ];
  const historyColumns: TableColumnsType<ExecutionEvent> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 170 },
    { title: '业务类型', dataIndex: 'type', width: 130, render: (value: ExecutionEvent['type']) => <Tag>{eventTypeMeta[value].label}</Tag> },
    { title: '采购订单 / 行', width: 190, render: (_, event) => `${event.poId} / ${event.itemId}` },
    { title: '业务说明', dataIndex: 'title' },
    { title: '影响数量 / 金额', width: 155, align: 'right', render: (_, event) => event.amount !== undefined ? `${event.amount.toLocaleString()} 元` : formatQuantity(event.quantity ?? 0, event.unit ?? '') },
    ...commonColumns.slice(2),
    { title: '处理', key: 'action', width: 180, fixed: 'right', render: (_, event) => event.status === 'PROCESSING' && event.parentId
      ? <Button type="link" loading={simulation.isPending} onClick={() => confirmSimulation(event)}>更新本机演示回执</Button>
      : event.type === 'PURCHASE_RETURN' && event.status === 'EFFECTIVE'
        ? <Button type="link" danger onClick={() => openReverse(event, 'RETURN_REVERSAL')}>退货冲销</Button>
        : event.status === 'PROCESSING' ? <Tag color="processing">等待真实 SAP 结果</Tag> : '—' },
  ];
  return <>
    <PageHeader title="退货与冲销" description="从原收货或服务验收记录发起后续处理。退货、收货冲销和服务更正保留独立业务历史。" />
    {error && <Alert className="editor-section" type="error" showIcon title={error} />}
    <div className="content-surface content-surface--flush"><Tabs items={[
      { key: 'receipt', label: `可处理收货 ${receipts.length}`, children: <Table rowKey="id" size="small" loading={query.isLoading} columns={receiptColumns} dataSource={receipts} scroll={{ x: 1450 }} locale={{ emptyText: <Empty description="暂无可处理的收货记录" /> }} /> },
      { key: 'service', label: `服务验收 ${services.length}`, children: <Table rowKey="id" size="small" loading={query.isLoading} columns={serviceColumns} dataSource={services} scroll={{ x: 1450 }} locale={{ emptyText: <Empty description="暂无可更正的服务验收记录" /> }} /> },
      { key: 'history', label: `退货与冲销记录 ${histories.length}`, children: <Table rowKey="id" size="small" loading={query.isLoading} columns={historyColumns} dataSource={histories} scroll={{ x: 1350 }} locale={{ emptyText: <Empty description="暂无退货或冲销记录" /> }} /> },
    ]} /></div>
    <ReverseOperationDrawer key={selected ? `${selected.event.id}-${selected.action}` : 'closed'} event={selected?.event} action={selected?.action ?? 'GR_REVERSAL'} open={Boolean(selected)} onClose={() => setSelected(undefined)} />
  </>;
}
