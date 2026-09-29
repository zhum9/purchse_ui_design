import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Select, Space, Table, Tag } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderActionCommand, OrderDocument } from '@domain/purchase-order/types';
import { revisionMeta } from '@domain/purchase-order/status';
import { moneyText, orderTotals } from '@domain/purchase-order/rules';
import { refName } from '@domain/purchase-order/catalog';
import { executeOrderAction } from '../api/orderDraftApi';
import { createClientId } from '@shared/utils/id';

export function OrderLifecyclePanel({ order }: { order: OrderDocument }) {
  const client = useQueryClient(), navigate = useNavigate();
  const { modal, message } = App.useApp();
  const [actorId, setActorId] = useState('801'), [reason, setReason] = useState(''), [error, setError] = useState('');
  const revision = order.revisions.find((entry) => entry.id === order.workingRevisionId);
  const effective = order.revisions.find((entry) => entry.id === order.effectiveRevisionId);
  const mutation = useMutation({ mutationFn: (action: OrderActionCommand['action']) => executeOrderAction(order.id, { requestKey: createClientId(), expectedRowVersion: order.rowVersion, action, actorId, reason }) });
  const act = (action: OrderActionCommand['action']) => modal.confirm({ title: ({ APPROVE: '批准当前提交版本？', REJECT: '驳回当前版本？', WITHDRAW: '撤回审批并释放本次占用？', SIMULATE_ERP: '仅在本机模拟 ERP 已确认？', CHANGE: '发起约定交期变更？', REVISE: '新建编制版本？' })[action], content: action === 'SIMULATE_ERP' ? '本操作不会调用真实 SAP，仅用于原型走查。正式环境必须由匹配请求版本的 ERP 结果驱动。' : '正式历史版本保持不变；当前版本和来源余额将重新校验。', onOk: async () => { try { const result = await mutation.mutateAsync(action); await client.invalidateQueries(); message.success('业务状态已更新。'); if (['CHANGE', 'REVISE'].includes(action)) navigate(`/purchase-orders/${result.id}/edit`); } catch (cause) { setError(cause instanceof Error ? cause.message : '操作失败'); } } });
  const diff = revision && effective ? revision.content.lines.flatMap((line) => {
    const old = effective.content.lines.find((entry) => entry.lineId === line.lineId);
    return old && old.schedule.requiredDate !== line.schedule.requiredDate ? [{ id: line.lineId, content: line.content, previous: old.schedule.requiredDate, next: line.schedule.requiredDate }] : [];
  }) : [];
  return <div className="content-surface">
    <Alert className="editor-section" type="info" showIcon title={effective ? `当前正式 V${effective.revisionNo}${revision ? `；工作/在途 V${revision.revisionNo}` : ''}` : '当前尚无正式生效版本'} description="审批通过不等于 SAP 已生效。原型角色切换用于演示权限，不能替代服务端身份认证。" />
    {error && <Alert type="error" showIcon title={error} className="editor-section" />}
    <Space wrap className="editor-section"><span>演示操作身份</span><Select value={actorId} onChange={setActorId} options={[{ value: '801', label: '张敏 · 采购员' }, { value: '802', label: '周建国 · 采购主管' }]} /><Input aria-label="审批意见或变更原因" placeholder="审批意见 / 驳回或变更原因" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} />
      {revision?.revisionStatus === 'WORKING' && <Button type="primary" onClick={() => navigate(`/purchase-orders/${order.id}/edit`)}>继续编制</Button>}
      {revision?.revisionStatus === 'SUBMITTED' && (actorId === '802' ? <><Button type="primary" loading={mutation.isPending} onClick={() => act('APPROVE')}>批准</Button><Button disabled={!reason.trim()} onClick={() => act('REJECT')}>驳回</Button></> : <Button onClick={() => act('WITHDRAW')}>撤回提交</Button>)}
      {revision?.revisionStatus === 'AUTHORIZED' && <Button onClick={() => act('SIMULATE_ERP')}>模拟 ERP 确认（原型）</Button>}
      {revision && ['REJECTED', 'WITHDRAWN'].includes(revision.revisionStatus) && <Button onClick={() => act('REVISE')}>保留历史，重新编制</Button>}
      {effective && !revision && <Button disabled={!reason.trim()} onClick={() => act('CHANGE')}>发起交期变更</Button>}
    </Space>
    {diff.length > 0 && <Table className="editor-section" size="small" pagination={false} rowKey="id" dataSource={diff} columns={[{ title: '受影响明细', dataIndex: 'content' }, { title: '正式约定交期', dataIndex: 'previous' }, { title: '拟变更交期', dataIndex: 'next' }, { title: '影响', render: () => '新版本生效前该行禁止新增执行' }]} />}
    <Table rowKey="id" size="small" pagination={false} dataSource={[...order.revisions].reverse()} columns={[
      { title: '版本', render: (_, entry) => `V${entry.revisionNo}` },
      { title: '版本状态', render: (_, entry) => <Tag color={revisionMeta[entry.revisionStatus].color}>{revisionMeta[entry.revisionStatus].label}</Tag> },
      { title: '约定/预计含税金额', align: 'right', render: (_, entry) => moneyText(orderTotals(entry.content).gross) },
      { title: '审批人', render: (_, entry) => entry.decidedBy ? refName('users', entry.decidedBy) : '尚未审批' },
      { title: '意见/原因', render: (_, entry) => entry.decisionComment || entry.changeReason || '—' },
      { title: '历史内容', render: (_, entry) => <Button type="link" onClick={() => modal.info({ title: `V${entry.revisionNo} 内容快照`, width: 860, content: <Table rowKey="lineId" dataSource={entry.content.lines} pagination={false} columns={[{ title: '采购内容', dataIndex: 'content' }, { title: '本次数量', dataIndex: 'orderedQty' }, { title: '成交单价', dataIndex: 'enteredUnitPrice' }, { title: '约定交期', render: (_, line) => line.schedule.requiredDate }]} /> })}>查看只读快照</Button> },
    ]} />
  </div>;
}
