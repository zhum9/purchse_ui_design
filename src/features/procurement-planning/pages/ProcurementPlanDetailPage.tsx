import { ArrowLeftOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Space, Table, Tabs, Typography, type TableColumnsType } from 'antd';
import { useState, type Key } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProcurementPlanLine } from '@domain/procurement/types';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { StatusTag } from '@shared/components/StatusTag';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { approveProcurementPlan, getProcurementPlan, planningKeys, submitProcurementPlan } from '../api/procurementPlanningApi';

export function ProcurementPlanDetailPage() {
  const { id = '' } = useParams(), navigate = useNavigate(), client = useQueryClient();
  const { message, modal } = App.useApp();
  const [selected, setSelected] = useState<Key[]>([]);
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: planningKeys.planDetail(id), queryFn: () => getProcurementPlan(id) });
  const mutation = useMutation({ mutationFn: (approve: boolean) => approve ? approveProcurementPlan(id) : submitProcurementPlan(id) });
  const process = (approve: boolean) => modal.confirm({ title: approve ? '以采购主管演示身份审批该计划？' : '提交该计划审批？', content: approve ? '审批后将来源占用转为采购承诺，订单仍需独立编制与审批。' : '提交会占用来源需求余额；草稿本身不占量。', onOk: async () => { try { await mutation.mutateAsync(approve); await client.invalidateQueries(); message.success(approve ? '计划已授权，可以分次编制订单。' : '计划已提交。'); } catch (cause) { setError(cause instanceof Error ? cause.message : '处理失败'); } } });
  const plan = query.data;
  if (query.isLoading) return <PageLoading />;
  if (query.isError || !plan) return <PageError onRetry={() => query.refetch()} />;
  const remaining = (line: ProcurementPlanLine) => line.plannedQuantity - line.orderedQuantity - (line.reservedQuantity ?? 0);
  const available = plan.lines.filter((line) => remaining(line) > 0);
  const eligible = plan.approvalStatus === 'APPROVED';
  const columns: TableColumnsType<ProcurementPlanLine> = [
    { title: '采购内容', width: 240, fixed: 'left', render: (_, line) => <div className="primary-cell"><strong>{line.content}</strong><span>{line.materialCode ?? line.materialGroup} · {line.specification}</span></div> },
    { title: '来源需求', width: 180, render: (_, line) => line.sourceDemandNos.join('、') || '独立计划（无需求来源）' },
    { title: '计划授权量', width: 140, align: 'right', render: (_, line) => formatQuantity(line.plannedQuantity, line.unit) },
    { title: '已批准转单', width: 130, align: 'right', render: (_, line) => formatQuantity(line.orderedQuantity, line.unit) },
    { title: '审批中占用', width: 130, align: 'right', render: (_, line) => formatQuantity(line.reservedQuantity ?? 0, line.unit) },
    { title: '当前可转', width: 130, align: 'right', render: (_, line) => <Typography.Text strong>{formatQuantity(remaining(line), line.unit)}</Typography.Text> },
    { title: '参考估算', width: 135, align: 'right', render: (_, line) => line.estimatedAmount === undefined ? '待估' : formatMoney(line.estimatedAmount) },
    { title: '需要日期', dataIndex: 'requiredDate', width: 115 },
  ];
  return <>
    <Button className="back-link" type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/planning/plans')}>返回采购计划</Button>
    <PageHeader title={plan.planNo} description={`${plan.name} · ${plan.purchaseOrganization}`} status={<StatusTag domain="plan" value={plan.status} />} actions={<Space>
      {plan.status === 'DRAFT' && <Button type="primary" loading={mutation.isPending} onClick={() => process(false)}>提交审批</Button>}
      {plan.status === 'PENDING_APPROVAL' && <Button type="primary" loading={mutation.isPending} onClick={() => process(true)}>审批计划（演示）</Button>}
      {eligible && <Button type="primary" icon={<ShoppingCartOutlined />} disabled={!available.length} onClick={() => navigate(`/purchase-orders/new?source=PLAN_ORDER&lines=${encodeURIComponent((selected.length ? selected.map(String) : available.map((line) => line.id)).join(','))}`)}>编制采购订单</Button>}
    </Space>} />
    {error && <Alert className="editor-section" type="error" title={error} showIcon />}
    <MetricStrip items={[{ label: '计划参考估算', value: plan.estimatedAmount === undefined ? '部分待估' : formatMoney(plan.estimatedAmount) }, { label: '采购明细', value: `${plan.lines.length} 行` }, { label: '尚有可转余额', value: `${available.length} 行` }, { label: '本次选择', value: `${selected.length || available.length} 行` }]} />
    <Tabs items={[
      { key: 'lines', label: '计划明细与转单', children: <div className="content-surface"><Alert className="editor-section" type="info" showIcon title="转单进入统一订单编制，不直接生成生效订单" description="可调整本次数量、成交价格和约定交期；建议供应商仅为候选。不同供应商分别编制，来源按实际授权量占用。" /><Table rowKey="id" size="small" columns={columns} dataSource={plan.lines} rowSelection={eligible ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (line) => ({ disabled: remaining(line) <= 0 }) } : undefined} scroll={{ x: 1280 }} pagination={false} /></div> },
      { key: 'basic', label: '计划依据', children: <div className="content-surface"><Descriptions column={3} items={[{ key: 'company', label: '法人', children: plan.company }, { key: 'org', label: '采购组织', children: plan.purchaseOrganization }, { key: 'group', label: '采购组', children: plan.purchaseGroup }, { key: 'owner', label: '负责人', children: plan.owner }, { key: 'date', label: '计划下单日期', children: plan.plannedOrderDate }, { key: 'notes', label: '计划依据', children: plan.notes || '来源需求见明细' }]} /></div> },
    ]} />
  </>;
}
