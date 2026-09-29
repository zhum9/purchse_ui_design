import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executionBlockReason } from '@domain/procurement/eligibility';
import { Alert, App, Button, Descriptions, Drawer, Flex, Form, Progress, Result, Typography } from 'antd';
import { useState } from 'react';
import { getExecutionFormSchema } from '@domain/execution-rule/schemas';
import type { ExecutionFormValues } from '@domain/execution-rule/types';
import { getExecutionPercent, getRemainingValue } from '@domain/procurement/calculations';
import { scenarioMeta } from '@domain/procurement/meta';
import type { PurchaseOrderItem } from '@domain/procurement/types';
import { DynamicForm } from '@shared/components/DynamicForm';
import { formatMoney, formatQuantity } from '@shared/utils/format';
import { saveDraft } from '@shared/utils/draft';
import { createClientId } from '@shared/utils/id';
import { submitExecution } from '../api/fulfillmentApi';

interface ExecutionDrawerProps {
  item?: PurchaseOrderItem;
  open: boolean;
  onClose: () => void;
}

export function ExecutionDrawer({ item, open, onClose }: ExecutionDrawerProps) {
  const { message } = App.useApp();
  const client = useQueryClient();
  const [requestKey, setRequestKey] = useState(() => createClientId());
  const [form] = Form.useForm<ExecutionFormValues>();
  const [values, setValues] = useState<ExecutionFormValues>({});
  const [completed, setCompleted] = useState<{ no: string }>();
  const mutation = useMutation({ mutationFn: ({ target, formValues }: { target: PurchaseOrderItem; formValues: ExecutionFormValues }) => submitExecution(target, formValues, requestKey) });

  if (!item) return null;

  const schema = getExecutionFormSchema(item);
  const isMoney = item.unit === '元' || ['AMOUNT', 'LIMIT'].includes(item.controlMode);
  const formatValue = (value: number) => isMoney ? formatMoney(value) : formatQuantity(value, item.unit);
  const currentAmount = typeof values.confirmedAmount === 'number' ? values.confirmedAmount : 0;
  const afterAmount = item.executedValue + currentAmount;
  const ceiling = item.overallLimit ?? item.orderedValue;

  const handleSubmit = async () => {
    const formValues = await form.validateFields();
    try {
      const result = await mutation.mutateAsync({ target: item, formValues });
      setCompleted({ no: result.businessDocumentNo });
      await client.invalidateQueries();
      message.success('业务单据已确认并保存，SAP 待处理（原型未发送真实请求）。');
    } catch { /* Error is retained in the drawer. */ }
  };
  const handleSaveDraft = () => {
    saveDraft(item.id, form.getFieldsValue());
    message.success('草稿已保存到当前浏览器。');
  };
  const handleClose = () => {
    form.resetFields();
    setCompleted(undefined);
    setValues({});
    onClose();
  };

  return (
    <Drawer title={<div><Typography.Title level={4}>{schema.title}</Typography.Title><Typography.Text type="secondary">{item.sapPoNo} / {item.itemNo}</Typography.Text></div>} size={840} open={open} onClose={handleClose} destroyOnHidden
      footer={!completed && <Flex justify="flex-end" gap={8}><Button onClick={handleClose}>取消</Button><Button onClick={handleSaveDraft}>保存草稿</Button><Button type="primary" disabled={Boolean(executionBlockReason(item))} loading={mutation.isPending} onClick={handleSubmit}>{schema.submitLabel}</Button></Flex>}>
      {completed ? (
        <Result status="success" title="业务事实已确认，SAP 待处理" subTitle={`单据 ${completed.no} 已保存到本机，可在履约记录及 SAP 监控查看；原型未连接真实 SAP。`} extra={<Button type="primary" onClick={handleClose}>返回履约工作台</Button>} />
      ) : (
        <>
          <div className="drawer-context">
            <Flex justify="space-between" align="flex-start" gap={16}>
              <div><Typography.Text type="secondary">{scenarioMeta[item.executionScenario].label}</Typography.Text><Typography.Title level={4}>{item.content}</Typography.Title><Typography.Text>{item.supplier}</Typography.Text></div>
              <div className="drawer-context__progress"><Progress type="circle" size={64} percent={getExecutionPercent(item)} /><Typography.Text type="secondary">当前执行进度</Typography.Text></div>
            </Flex>
            <Descriptions size="small" column={3} className="context-descriptions" items={[
              { key: 'order', label: isMoney ? '订单金额/额度' : '订单数量', children: formatValue(item.overallLimit ?? item.orderedValue) },
              { key: 'executed', label: '已执行', children: formatValue(item.executedValue) },
              { key: 'remaining', label: '剩余可执行', children: <strong>{formatValue(getRemainingValue(item))}</strong> },
            ]} />
          </div>
          {item.executionScenario === 'SERVICE_LIMIT' && (
            <Alert showIcon icon={<InfoCircleOutlined />} type={afterAmount > ceiling ? 'error' : 'info'} className="execution-live-summary"
              title={`本次执行后累计 ${formatMoney(afterAmount)}，剩余额度 ${formatMoney(Math.max(0, ceiling - afterAmount))}`} />
          )}
          {mutation.isError && <Alert className="editor-section" type="error" showIcon title={mutation.error.message} />}
          {executionBlockReason(item) && <Alert type="warning" showIcon title={executionBlockReason(item)} />}
          <DynamicForm schema={schema} form={form} onValuesChange={(next) => { setValues(next); setRequestKey(createClientId()); }} />
          <Alert icon={<CheckCircleOutlined />} showIcon type="success" title="提交后将生成独立执行事件，SAP 处理结果可在执行监控中查看。" />
        </>
      )}
    </Drawer>
  );
}
