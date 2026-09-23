import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [form] = Form.useForm<ExecutionFormValues>();
  const [successNo, setSuccessNo] = useState<string>();
  const query = useQuery({ queryKey: fulfillmentKeys.list({}), queryFn: () => getFulfillmentItems({}) });
  const item = query.data?.items.find((candidate) => candidate.id === itemId);
  const mutation = useMutation({ mutationFn: (values: ExecutionFormValues) => item ? submitExecution(item, values) : Promise.reject(new Error('未找到订单行')) });
  if (query.isLoading) return <PageLoading />;
  if (query.isError || !item) return <PageError onRetry={() => query.refetch()} />;
  if (successNo) return <Result status="success" title="服务验收已提交" subTitle={`验收单 ${successNo} 已进入 SAP 处理队列。`} extra={<Button type="primary" onClick={() => navigate('/fulfillment/workbench')}>返回履约工作台</Button>} />;
  const schema = getExecutionFormSchema(item);
  const submit = async () => {
    const values = await form.validateFields();
    const result = await mutation.mutateAsync(values);
    setSuccessNo(result.businessDocumentNo);
    message.success('服务验收单已生成。');
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
        <Col flex="auto"><Card title="本次服务验收" className="business-card"><DynamicForm schema={schema} form={form} /></Card></Col>
        <Col flex="300px"><Card title="订单执行情况" className="business-card sticky-card"><Progress percent={getExecutionPercent(item)} status="active" /><div className="side-summary"><Typography.Text type="secondary">服务期间</Typography.Text><strong>2026-01-01 至 2026-12-31</strong><Typography.Text type="secondary">采购组织</Typography.Text><strong>{item.purchaseOrganization}</strong><Typography.Text type="secondary">物料组</Typography.Text><strong>{item.materialGroup}</strong></div><Alert type="info" showIcon title="本次验收将继承原采购订单的业务归属和 SAP 科目分配信息。" /></Card></Col>
      </Row>
    </>
  );
}
