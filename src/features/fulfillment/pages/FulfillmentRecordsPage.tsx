import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Table, Tag, type TableColumnsType } from 'antd';
import { useNavigate } from 'react-router-dom';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { ExecutionEvent } from '@domain/procurement/types';
import { PageHeader } from '@shared/components/PageHeader';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime, formatMoney, formatQuantity } from '@shared/utils/format';
import { fulfillmentKeys, getExecutionEvents } from '../api/fulfillmentApi';

export function FulfillmentRecordsPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: fulfillmentKeys.events(), queryFn: () => getExecutionEvents() });
  const columns: TableColumnsType<ExecutionEvent> = [
    { title: '业务单号', dataIndex: 'businessDocumentNo', width: 170, render: (value: string, event) => <Button type="link" onClick={() => navigate(`/purchase-orders/${event.poId}?tab=flow`)}>{value}</Button> },
    { title: '业务动作', dataIndex: 'type', width: 120, render: (value: ExecutionEvent['type']) => <Tag>{eventTypeMeta[value].label}</Tag> },
    { title: '业务说明', dataIndex: 'title', ellipsis: true },
    { title: '数量 / 金额', key: 'value', width: 160, align: 'right', render: (_, event) => event.quantity !== undefined ? formatQuantity(event.quantity, event.unit ?? '') : event.amount !== undefined ? formatMoney(event.amount) : '-' },
    { title: '执行时间', dataIndex: 'occurredAt', width: 160, render: formatDateTime },
    { title: '经办人', dataIndex: 'operator', width: 90 },
    { title: 'SAP状态', dataIndex: 'sapStatus', width: 140, render: (value: ExecutionEvent['sapStatus']) => <StatusTag domain="sap" value={value} /> },
    { title: '操作', key: 'action', width: 100, render: (_, event) => <Button type="link" onClick={() => navigate(`/purchase-orders/${event.poId}?tab=flow`)}>查看单据流</Button> },
  ];
  return <><PageHeader title="履约记录" description="查看收货、服务验收、额度确认及其后续业务事件。正式记录不会被直接删除。" /><div className="content-surface"><Table rowKey="id" size="small" loading={query.isLoading} columns={columns} dataSource={query.data} scroll={{ x: 1100 }} locale={{ emptyText: <Empty description="暂无履约记录" /> }} /></div></>;
}
