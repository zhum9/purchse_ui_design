import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Descriptions, Empty, Space, Steps, Table, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useBeforeUnload, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { moneyText, newCommercialLine, newOrderDraft, orderTotals, validateOrder } from '@domain/purchase-order/rules';
import { refName } from '@domain/purchase-order/catalog';
import type { OrderDraft } from '@domain/purchase-order/types';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { getPurchaseOrder, purchaseOrderKeys } from '../api/purchaseOrderApi';
import { getOrderSourceDraft, orderDraftKeys, saveOrderDraft } from '../api/orderDraftApi';
import { CommercialLineEditor } from '../components/CommercialLineEditor';
import { OrderHeaderEditor } from '../components/OrderHeaderEditor';

export function PurchaseOrderEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const kind = params.get('source') ?? '', sourceIds = params.get('lines') ?? '';
  const navigate = useNavigate(), queryClient = useQueryClient();
  const { message, modal } = App.useApp();
  const [edited, setDraft] = useState<OrderDraft>();
  const [emptyDraft] = useState<OrderDraft>(() => ({ ...newOrderDraft(), lines: kind ? [] : [newCommercialLine()] }));
  const [step, setStep] = useState(kind ? 0 : 1);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const query = useQuery({ queryKey: purchaseOrderKeys.detail(id ?? ''), queryFn: () => getPurchaseOrder(id!), enabled: Boolean(id) });
  const sourceQuery = useQuery({ queryKey: orderDraftKeys.source(kind, sourceIds), queryFn: () => getOrderSourceDraft(kind, sourceIds), enabled: Boolean(kind && !id) });
  const mutation = useMutation({ mutationFn: saveOrderDraft });
  const document = query.data?.commercial;
  const revision = document?.revisions.find((entry) => entry.id === document.workingRevisionId);
  const amendment = Boolean(document?.effectiveRevisionId);
  const draft = edited ?? revision?.content ?? sourceQuery.data ?? emptyDraft;
  const blocker = useBlocker(dirty && !mutation.isSuccess);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      const dialog = modal.confirm({ title: '离开订单编制？', content: '尚有未保存的内容。已保存草稿仍可从采购订单列表打开。', okText: '放弃未保存内容', cancelText: '继续编制', onOk: () => blocker.proceed(), onCancel: () => blocker.reset() });
      return () => dialog.destroy();
    }
  }, [blocker, modal]);
  useBeforeUnload((event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  const update = (next: OrderDraft) => { setDraft(next); setDirty(true); setRequestKey(crypto.randomUUID()); };
  const totals = orderTotals(draft), issues = validateOrder(draft), errors = issues.filter((issue) => issue.level === 'ERROR');
  const save = async (submit: boolean) => {
    setError('');
    if (submit && errors.length) { setStep(2); setError('请先处理核对面板中的阻断项，或保存为草稿后补充。'); return; }
    try {
      const result = await mutation.mutateAsync({ requestKey, id, expectedRowVersion: document?.rowVersion, submit, content: draft });
      setDirty(false);
      await queryClient.invalidateQueries();
      message.success(submit ? '已提交审批，来源已占用；尚未成为可执行订单。' : '草稿已保存到本机浏览器，尚未占用来源。');
      navigate(`/purchase-orders/${result.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，输入已保留。'); }
  };
  if (query.isLoading || sourceQuery.isLoading) return <PageLoading />;
  if (query.isError || sourceQuery.isError) return <PageError onRetry={() => { if (id) void query.refetch(); else void sourceQuery.refetch(); }} />;
  if (id && (!revision || revision.revisionStatus !== 'WORKING')) return <Alert type="warning" showIcon title="当前版本不可直接编辑" description="提交内容已冻结；请从订单详情撤回或发起新版本。" action={<Button onClick={() => navigate(`/purchase-orders/${id}`)}>返回订单</Button>} />;
  return <div className="order-composer">
    <Button type="link" className="back-link" icon={<ArrowLeftOutlined />} onClick={() => navigate(id ? `/purchase-orders/${id}` : '/purchase-orders')}>返回采购订单</Button>
    <PageHeader title={amendment ? '采购订单交期变更' : id ? '继续编制采购订单' : '编制采购订单'} description="统一处理需求转单、计划转单及直接采购；原始来源不被下游改价或调整交期覆盖。" status={<Tag>{revision ? `工作版本 V${revision.revisionNo}` : '新草稿'}</Tag>} />
    <section className="content-surface editor-section"><Steps current={step} onChange={setStep} items={[{ title: '来源与范围' }, { title: '商业与交付' }, { title: '核对提交' }]} /></section>
    {error && <Alert className="editor-section" type="error" showIcon title={error} />}
    {amendment && <Alert className="editor-section" type="warning" showIcon title="正式版本保持有效；本次仅开放交期及说明变更，数量/价格变更尚未适配，不能直接修改。" />}
    {step === 0 && <section className="content-surface editor-section"><h3>本次采购范围</h3><Alert type="info" showIcon title="可以删除本次不采购的行，或在下一步调小采购量。每张订单一个法人、实际供应商和币种。" description="建议供应商非必选；需要分给不同供应商时分别编制订单。当前逐行保留来源，不隐式合并不同规格、日期或单位。" /><Table rowKey="lineId" dataSource={draft.lines} pagination={false} scroll={{ x: 760 }} columns={[
      { title: '采购内容', dataIndex: 'content', width: 200 }, { title: '来源', render: (_, line) => line.source?.sourceDocumentNo ?? '独立采购' },
      { title: '可分配', align: 'right', render: (_, line) => line.source ? `${line.source.available} ${refName('units', line.orderUomId)}` : '无来源约束' },
      { title: '建议供应商', render: (_, line) => line.source?.suggestedSuppliers.join('、') || '无建议' },
      { title: '操作', render: (_, line) => <Button type="link" disabled={amendment} onClick={() => update({ ...draft, lines: draft.lines.filter((entry) => entry.lineId !== line.lineId) })}>本次不采购</Button> },
    ]} locale={{ emptyText: <Empty description="没有来源限制，可在商业与交付步骤添加独立明细。" /> }} /></section>}
    {step === 1 && <><OrderHeaderEditor value={draft} onChange={update} amendment={amendment} /><CommercialLineEditor lines={draft.lines} onChange={(lines) => update({ ...draft, lines })} amendment={amendment} /></>}
    {step === 2 && <section className="content-surface editor-section"><h3>提交前核对</h3><Descriptions column={3} items={[
      { key: 'supplier', label: '实际供应商', children: refName('suppliers', draft.supplierId) }, { key: 'org', label: '采购组织', children: refName('organizations', draft.purchaseOrgId) }, { key: 'count', label: '采购明细', children: `${draft.lines.length} 行` },
      { key: 'net', label: '已定价未税金额', children: moneyText(totals.net) }, { key: 'tax', label: '已定价税额', children: moneyText(totals.tax) }, { key: 'gross', label: '已定价含税金额', children: moneyText(totals.gross) },
    ]} /><Table rowKey="lineId" pagination={false} dataSource={draft.lines} columns={[{ title: '采购内容', dataIndex: 'content' }, { title: '来源', render: (_, line) => line.source?.sourceDocumentNo ?? '独立采购' }, { title: '数量 / 金额', render: (_, line) => line.pricingMethod === 'UNIT_PRICE' ? `${line.orderedQty ?? '未填'} ${refName('units', line.orderUomId)}` : moneyText(line.fixedAmount ?? line.expectedAmount) }, { title: '约定交期', render: (_, line) => line.schedule.requiredDate || '未填' }]} />
      <h3>完整性与风险检查</h3>{issues.length ? <div className="validation-list">{issues.map((issue, index) => <Alert key={`${issue.path}-${index}`} type={issue.level === 'ERROR' ? 'error' : issue.level === 'WARNING' ? 'warning' : 'info'} showIcon title={issue.message} action={<Button size="small" onClick={() => setStep(1)}>返回完善</Button>} />)}</div> : <Alert type="success" showIcon title="当前编制校验通过；提交时仍会重新核验来源余额和版本。" />}
      <Alert className="detail-section" type="info" showIcon title="提交不是生效" description="提交后进入采购主管审批。审批通过仍需 SAP 确认，期间不能收货/验收。原型使用明确标识的模拟 ERP 操作，不会连接真实 SAP。" />
    </section>}
    <footer className="order-composer-footer"><div><Typography.Text type="secondary">{totals.unpriced ? `已定价 ${draft.lines.length - totals.unpriced}/${draft.lines.length} 行 · 含税` : '约定 / 预计含税合计'}</Typography.Text><strong>{moneyText(totals.gross)}</strong>{totals.unpriced > 0 && <Tag color="warning">{totals.unpriced} 行待定价</Tag>}<small>最高承诺（含限额上限）{moneyText(totals.exposureGross)}</small></div><Space><Button icon={<SaveOutlined />} loading={mutation.isPending} onClick={() => save(false)}>保存草稿</Button>{step < 2 ? <Button type="primary" onClick={() => setStep(step + 1)}>下一步</Button> : <Button type="primary" icon={<SendOutlined />} loading={mutation.isPending} onClick={() => save(true)}>提交审批</Button>}</Space></footer>
  </div>;
}
