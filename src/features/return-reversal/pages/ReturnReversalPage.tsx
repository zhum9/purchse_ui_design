import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Space, Table, Tabs, Tag, type TableColumnsType } from 'antd';
import { useState } from 'react';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { ExecutionEvent } from '@domain/procurement/types';
import { fulfillmentKeys, getExecutionEvents } from '@features/fulfillment/api/fulfillmentApi';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatQuantity } from '@shared/utils/format';
import { PurchaseReturnDrawer } from '../components/PurchaseReturnDrawer';
import { ReceiptReversalDrawer } from '../components/ReceiptReversalDrawer';

export function ReturnReversalPage() {
  const query = useQuery({ queryKey: fulfillmentKeys.events(), queryFn: () => getExecutionEvents() });
  const [returnSource, setReturnSource] = useState<ExecutionEvent>();
  const [reversalSource, setReversalSource] = useState<ExecutionEvent>();
  const receipts = (query.data ?? []).filter((event) => event.type === 'GOODS_RECEIPT');
  const histories = (query.data ?? []).filter((event) => ['PURCHASE_RETURN', 'GR_REVERSAL', 'RETURN_REVERSAL'].includes(event.type));
  const receiptColumns: TableColumnsType<ExecutionEvent> = [
    { title: '原收货单', dataIndex: 'businessDocumentNo', width: 170 }, { title: '采购订单', width: 170, render: () => '4500012345 / 00010' },
    { title: '收货说明', dataIndex: 'title' }, { title: '收货数量', width: 130, align: 'right', render: (_, event) => formatQuantity(Math.abs(event.quantity ?? 0), event.unit ?? '') },
    { title: '收货时间', dataIndex: 'occurredAt', width: 160, render: formatDateTime }, { title: 'SAP凭证', dataIndex: 'sapDocumentNo', width: 130 },
    { title: 'SAP状态', dataIndex: 'sapStatus', width: 140, render: (value: ExecutionEvent['sapStatus']) => <StatusTag domain="sap" value={value} /> },
    { title: '操作', key: 'actions', width: 150, fixed: 'right', render: (_, event) => <Space><Button type="link" onClick={() => setReturnSource(event)}>采购退货</Button><Button type="link" danger onClick={() => setReversalSource(event)}>冲销</Button></Space> },
  ];
  const historyColumns: TableColumnsType<ExecutionEvent> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 170 }, { title: '业务类型', dataIndex: 'type', width: 120, render: (value: ExecutionEvent['type']) => <Tag>{eventTypeMeta[value].label}</Tag> },
    { title: '业务说明', dataIndex: 'title' }, { title: '影响数量', width: 130, align: 'right', render: (_, event) => formatQuantity(event.quantity ?? 0, event.unit ?? '') },
    { title: '执行时间', dataIndex: 'occurredAt', width: 160, render: formatDateTime }, { title: 'SAP状态', dataIndex: 'sapStatus', width: 140, render: (value: ExecutionEvent['sapStatus']) => <StatusTag domain="sap" value={value} /> },
  ];
  return <>
    <PageHeader title="退货与冲销" description="从原收货记录发起后续处理。采购退货与收货冲销具有不同业务含义，并分别保留完整历史。" />
    <div className="content-surface content-surface--flush"><Tabs items={[
      { key: 'source', label: '可处理收货记录', children: <Table rowKey="id" size="small" loading={query.isLoading} columns={receiptColumns} dataSource={receipts} scroll={{ x: 1200 }} locale={{ emptyText: <Empty description="暂无可处理的收货记录" /> }} /> },
      { key: 'history', label: '退货与冲销记录', children: <Table rowKey="id" size="small" columns={historyColumns} dataSource={histories} scroll={{ x: 950 }} /> },
    ]} /></div>
    <PurchaseReturnDrawer event={returnSource} open={Boolean(returnSource)} onClose={() => setReturnSource(undefined)} />
    <ReceiptReversalDrawer event={reversalSource} open={Boolean(reversalSource)} onClose={() => setReversalSource(undefined)} />
  </>;
}
