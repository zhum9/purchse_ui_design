import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Space, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@shared/components/PageHeader';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageError } from '@shared/components/PageState';
import { getPurchaseOrders, purchaseOrderKeys } from '@features/purchase-order/api/purchaseOrderApi';
import { revisionMeta } from '@domain/purchase-order/status';
import { isOverdue } from '@domain/procurement/eligibility';

export function MyWorkPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: purchaseOrderKeys.list({}), queryFn: () => getPurchaseOrders({}) });
  if (query.isError) return <PageError onRetry={() => query.refetch()} />;
  const orders = query.data?.items ?? [];
  const rows = orders.flatMap((order) => {
    const working = order.commercial?.revisions.find((revision) => revision.id === order.commercial?.workingRevisionId);
    return working ? [{ id: order.id, no: order.businessOrderNo, title: `${order.supplier} · ${working.content.lines.length}行采购`, state: revisionMeta[working.revisionStatus].label, owner: working.revisionStatus === 'SUBMITTED' ? '采购主管' : '采购员', action: working.revisionStatus === 'SUBMITTED' ? '查看并审批' : working.revisionStatus === 'AUTHORIZED' ? '查看生效进度' : '继续处理' }] : [];
  });
  const overdue = orders.flatMap((order) => order.items).filter(isOverdue).length;
  return <><PageHeader title="我的工作" description="先处理授权与资料，再跟进交付和执行；任务完成必须由对应业务操作产生。" actions={<Button type="primary" onClick={() => navigate('/purchase-orders/new')}>编制采购订单</Button>} />
    <MetricStrip items={[{ label: '订单审批待办', value: rows.filter((row) => row.owner === '采购主管').length }, { label: '订单编制 / 待生效', value: rows.filter((row) => row.owner === '采购员').length }, { label: '逾期未履约明细', value: overdue, tone: overdue ? 'warning' : 'default' }, { label: 'SAP 异常订单', value: orders.filter((order) => ['FAILED', 'UNKNOWN'].includes(order.status.sapSyncStatus)).length, tone: 'warning' }]} />
    <Alert className="editor-section" showIcon type="info" title="本机原型展示全部演示角色待办；审批页可明确切换采购员/主管，不代表已接入企业认证。" />
    <div className="content-surface"><Space className="editor-section"><Typography.Text strong>订单任务</Typography.Text><Button onClick={() => navigate('/planning/demands?status=SUBMITTED')}>需求审批</Button><Button onClick={() => navigate('/planning/plans?status=PENDING_APPROVAL')}>计划审批</Button><Button onClick={() => navigate('/fulfillment/workbench?status=OVERDUE')}>逾期交付</Button><Button onClick={() => navigate('/sap/monitor')}>SAP 核对</Button></Space><Table rowKey="id" loading={query.isLoading} dataSource={rows} locale={{ emptyText: <Empty description="暂无订单任务，可先创建采购需求、计划或订单。" /> }} columns={[{ title: '业务单号', dataIndex: 'no' }, { title: '业务摘要', dataIndex: 'title' }, { title: '待办环节', render: (_, row) => <Tag>{row.state}</Tag> }, { title: '责任角色', dataIndex: 'owner' }, { title: '操作', render: (_, row) => <Button type="link" onClick={() => navigate(`/purchase-orders/${row.id}?tab=lifecycle`)}>{row.action}</Button> }]} /></div>
  </>;
}
