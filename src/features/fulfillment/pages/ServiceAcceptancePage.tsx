import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { executionBlockReason } from '@domain/procurement/eligibility';
import { Alert, App, Button, Card, Col, Form, Progress, Result, Row, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getExecutionFormSchema } from '@domain/execution-rule/schemas';
import type { ExecutionFormValues } from '@domain/execution-rule/types';
import { getExecutionPercent, getRemainingValue } from '@domain/procurement/calculations';
import { DynamicForm } from '@shared/components/DynamicForm';
import { MetricStrip } from '@shared/components/MetricStrip';
import { PageHeader } from '@shared/components/PageHeader';
import { PageError, PageLoading } from '@shared/components/PageState';
import { formatMoney } from '@shared/utils/format';
import { saveDraft } from '@shared/utils/draft';
import { fulfillmentKeys, getFulfillmentItems, submitExecution } from '../api/fulfillmentApi';

export function ServiceAcceptancePage() {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [form] = Form.useForm<ExecutionFormValues>();
  const [successNo, setSuccessNo] = useState<string>();
  const query = useQuery({ queryKey: fulfillmentKeys.list({}), queryFn: () => getFulfillmentItems({}) });
  const item = query.data?.items.find((candidate) => candidate.id === itemId);
  const mutation = useMutation({ mutationFn: (values: ExecutionFormValues) => item ? submitExecution(item, values, requestKey) : Promise.reject(new Error('未找到订单行')) });
  if (query.isLoading) return <PageLoading />;
  if (query.isError || !item) return <PageError onRetry={() => query.refetch()} />;
  if (successNo) return <Result status="success" title="服务验收已登记" subTitle={`验收单 ${successNo} 已保存到本机，SAP 待处理；未连接真实 SAP。`} extra={<Button type="primary" onClick={() => navigate('/fulfillment/workbench')}>返回履约工作台</Button>} />;
  if (executionBlockReason(item)) return <Alert type="warning" showIcon title="当前不能新增验收" description={executionBlockReason(item)} action={<Button onClick={() => navigate('/fulfillment/workbench')}>返回工作台</Button>} />;
  const schema = getExecutionFormSchema(item);
  const submit = async () => {
    const values = await form.validateFields();
    try { const result = await mutation.mutateAsync(values); setSuccessNo(result.businessDocumentNo); await client.invalidateQueries(); message.success('服务验收单已生成，业务事实已保存。'); } catch { /* Inline error preserves the form. */ }
  };
  const handleSaveDraft = () => {
    saveDraft(item.id, form.getFieldsValue());
    message.success('服务验收草稿已保存到当前浏览器。');
  };
  return (
    <>
      <Button type="link" className="back-link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/fulfillment/workbench')}>返回履约工作台</Button>
      <PageHeader title="服务验收" description={`${item.sapPoNo} / ${item.itemNo} · ${item.content}`} actions={<Space><Button onClick={handleSaveDraft}>保存草稿</Button><Button type="primary" icon={<CheckOutlined />} loading={mutation.isPending} onClick={submit}>提交验收</Button></Space>} />
      <MetricStrip items={[{ label: '订单金额', value: formatMoney(item.orderedValue) }, { label: '已验收', value: formatMoney(item.executedValue) }, { label: '剩余可验收', value: formatMoney(getRemainingValue(item)), tone: 'warning' }, { label: '供应商', value: item.supplier }]} />
      <Row gutter={16} align="top">
        <Col flex="auto"><Card title="本次服务验收" className="business-card">{mutation.isError && <Alert type="error" showIcon title={mutation.error.message} />}<DynamicForm schema={schema} form={form} onValuesChange={() => setRequestKey(crypto.randomUUID())} /></Card></Col>
        <Col flex="300px"><Card title="订单执行情况" className="business-card sticky-card"><Progress percent={getExecutionPercent(item)} status="active" /><div className="side-summary"><Typography.Text type="secondary">服务期间</Typography.Text><strong>{item.serviceStart && item.serviceEnd ? `${item.serviceStart} 至 ${item.serviceEnd}` : '原订单期间待核对'}</strong><Typography.Text type="secondary">采购组织</Typography.Text><strong>{item.purchaseOrganization}</strong><Typography.Text type="secondary">物料组</Typography.Text><strong>{item.materialGroup}</strong></div><Alert type="info" showIcon title="本次验收将继承原采购订单的业务归属和 SAP 科目分配信息。" /></Card></Col>
      </Row>
    </>
  );
}
