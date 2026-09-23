import { ArrowLeftOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { App, Button, Card, Collapse, Descriptions, Empty, Space, Table, Tabs, Tag, Typography, type TableColumnsType } from 'antd';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getRemainingValue } from '@domain/procurement/calculations';
import { scenarioMeta } from '@domain/procurement/meta';
import type { ExecutionEvent, PurchaseOrderItem } from '@domain/procurement/types';
import { DocumentFlow } from '@shared/components/DocumentFlow';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { fulfillmentKeys, getExecutionEvents } from '@features/fulfillment/api/fulfillmentApi';
import { getPurchaseOrder, purchaseOrderKeys } from '../api/purchaseOrderApi';

const itemAction = (item: PurchaseOrderItem) => item.executionScenario === 'SERVICE' ? '服务验收' : item.executionScenario === 'SERVICE_LIMIT' ? '执行确认' : '收货';

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderQuery = useQuery({ queryKey: purchaseOrderKeys.detail(id), queryFn: () => getPurchaseOrder(id), enabled: Boolean(id) });
  const eventQuery = useQuery({ queryKey: fulfillmentKeys.events(id), queryFn: () => getExecutionEvents(id), enabled: Boolean(id) });
  if (orderQuery.isLoading) return <PageLoading />;
  if (orderQuery.isError || !orderQuery.data) return <PageError onRetry={() => orderQuery.refetch()} />;
  const order = orderQuery.data;
  const completed = order.items.filter((item) => item.status.fulfillmentStatus === 'COMPLETE').length;
  const exceptions = order.items.filter((item) => ['FAILED', 'UNKNOWN'].includes(item.status.sapSyncStatus) || item.status.fulfillmentStatus === 'OVERDUE').length;
  const showEvent = (event: ExecutionEvent) => modal.info({
    title: event.businessDocumentNo,
    width: 560,
    okText: '关闭',
    content: <Descriptions className="modal-descriptions" size="small" column={1} items={[
      { key: 'title', label: '业务说明', children: event.title },
      { key: 'operator', label: '经办人', children: event.operator },
      { key: 'sap', label: 'SAP凭证', children: event.sapDocumentNo ?? '处理中' },
    ]} />,
  });
  const columns: TableColumnsType<PurchaseOrderItem> = [
    { title: '行', dataIndex: 'itemNo', width: 70 },
    { title: '执行类型', dataIndex: 'executionScenario', width: 112, render: (value: PurchaseOrderItem['executionScenario']) => <Tag color={scenarioMeta[value].color}>{scenarioMeta[value].label}</Tag> },
    { title: '采购内容', key: 'content', width: 230, render: (_, item) => <div className="primary-cell"><strong>{item.content}</strong><span>{item.specification ?? item.materialGroup}</span></div> },
    { title: '物料 / 物料组', key: 'material', width: 160, render: (_, item) => item.materialCode ? <div className="primary-cell"><span>{item.materialCode}</span><span>{item.materialGroup}</span></div> : item.materialGroup },
    { title: '订单量 / 额度', key: 'ordered', width: 150, align: 'right', render: (_, item) => item.unit === '元' ? formatMoney(item.overallLimit ?? item.orderedValue) : formatQuantity(item.orderedValue, item.unit) },
    { title: '已执行', key: 'executed', width: 130, align: 'right', render: (_, item) => item.unit === '元' ? formatMoney(item.executedValue) : formatQuantity(item.executedValue, item.unit) },
    { title: '剩余', key: 'remaining', width: 130, align: 'right', render: (_, item) => item.unit === '元' ? formatMoney(getRemainingValue(item)) : formatQuantity(getRemainingValue(item), item.unit) },
    { title: '状态', key: 'status', width: 118, render: (_, item) => <StatusTag domain="fulfillment" value={item.status.fulfillmentStatus} /> },
    { title: '操作', key: 'action', width: 110, fixed: 'right', render: (_, item) => <Button type="link" disabled={getRemainingValue(item) === 0} onClick={() => item.executionScenario === 'SERVICE' ? navigate(`/fulfillment/service/${item.id}`) : navigate(`/fulfillment/workbench?keyword=${item.sapPoNo}`)}>{itemAction(item)}</Button> },
  ];
  const tabItems = [
    { key: 'basic', label: '基本信息', children: <Card className="business-card"><Descriptions column={3} items={[
      { key: 'businessNo', label: '业务订单号', children: order.businessOrderNo }, { key: 'source', label: '订单来源', children: order.source }, { key: 'company', label: '公司', children: order.company },
      { key: 'org', label: '采购组织', children: order.purchaseOrganization }, { key: 'group', label: '采购组', children: order.purchaseGroup }, { key: 'currency', label: '币种', children: '人民币 CNY' },
    ]} /></Card> },
    { key: 'items', label: `订单明细 ${order.items.length}`, children: <Card className="business-card" styles={{ body: { padding: 0 } }}><Table rowKey="id" size="small" columns={columns} dataSource={order.items} pagination={false} scroll={{ x: 1250 }} /></Card> },
    { key: 'records', label: '履约记录', children: <Card className="business-card"><Empty description="履约记录已汇总至单据流，可切换查看完整业务事实链。" image={Empty.PRESENTED_IMAGE_SIMPLE} /></Card> },
    { key: 'flow', label: '单据流', children: <Card title="业务单据流" className="business-card" extra={<Typography.Text type="secondary">点击节点查看业务单据</Typography.Text>}><DocumentFlow events={eventQuery.data ?? []} onSelect={showEvent} /></Card> },
    { key: 'contract', label: '合同', children: <Card className="business-card"><Descriptions items={[{ key: 'contract', label: '关联合同', children: order.source === 'CONTRACT' ? <Button type="link" onClick={() => message.info('合同 CT20260001 的详情入口已触发；合同模块将在后续阶段接入。')}>CT20260001</Button> : '本订单未关联合同（合同并非必经节点）' }]} /></Card> },
    { key: 'sap', label: 'SAP信息', children: <Card className="business-card"><Descriptions column={2} items={[{ key: 'po', label: 'SAP采购订单', children: order.sapPoNo }, { key: 'status', label: '同步状态', children: <StatusTag domain="sap" value={order.status.sapSyncStatus} /> }]} /><Collapse ghost items={[{ key: 'technical', label: '技术信息（接口运维可见）', children: <Descriptions size="small" column={2} items={[{ key: 'doctype', label: 'Document Type', children: 'NB' }, { key: 'request', label: '最近请求ID', children: 'REQ-PO-20260911-021' }]} /> }]} /></Card> },
  ];
  return <>
    <Button className="back-link" type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/purchase-orders')}>返回采购订单</Button>
    <PageHeader title={order.sapPoNo} description={`${order.supplier} · ${order.purchaseOrganization}`} status={<StatusTag domain="fulfillment" value={order.status.fulfillmentStatus} />} actions={<Space><Button icon={<FileSearchOutlined />} onClick={() => setSearchParams({ tab: 'flow' })}>查看单据流</Button><Button type="primary" onClick={() => navigate(`/fulfillment/workbench?keyword=${order.sapPoNo}`)}>继续履约</Button></Space>} />
    <MetricStrip items={[{ label: '订单金额', value: formatMoney(order.amount) }, { label: '订单行', value: order.items.length }, { label: '已完成', value: completed, tone: 'success' }, { label: '执行异常', value: exceptions, tone: exceptions ? 'error' : 'default' }]} />
    <Tabs activeKey={searchParams.get('tab') ?? 'items'} onChange={(tab) => setSearchParams({ tab })} items={tabItems} />
  </>;
}
