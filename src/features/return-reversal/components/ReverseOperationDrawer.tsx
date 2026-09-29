import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Descriptions, Drawer, Flex, Form, Input, InputNumber, Radio } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import type { ReverseAction, ReverseContext } from '@domain/procurement/reversals';
import type { ExecutionEvent } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import { PageError, PageLoading } from '@shared/components/PageState';
import { eventTypeMeta } from '@domain/procurement/meta';

export function ReverseOperationDrawer({ event, action, open, onClose }: { event?: ExecutionEvent; action: ReverseAction; open: boolean; onClose: () => void }) {
  const { modal, message } = App.useApp(), client = useQueryClient();
  const [form] = Form.useForm<{ quantity: string; businessDate: Dayjs; reason: string; replacementRequired?: boolean }>();
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const query = useQuery({ queryKey: ['reverse-context', event?.id], queryFn: () => apiClient<ReverseContext>(`/api/executions/${event!.id}/reverse-context`), enabled: Boolean(event && open) });
  const mutation = useMutation({ mutationFn: (input: object) => apiClient<ExecutionEvent>(`/api/executions/${event!.id}/reverse`, { method: 'POST', body: JSON.stringify(input) }) });
  const context = query.data, returnAction = action === 'PURCHASE_RETURN';
  const submit = async () => {
    const values = await form.validateFields();
    modal.confirm({ title: `确认${eventTypeMeta[action].label}？`, content: `${event?.businessDocumentNo}：本次 ${returnAction ? values.quantity : context?.originalValue} ${context?.unit}。原记录保留；在途阶段占用原记录可反向量，不提前释放新收货余额。`, okText: '确认提交', okButtonProps: { danger: !returnAction }, onOk: async () => {
      const result = await mutation.mutateAsync({ ...values, requestKey, action, quantity: returnAction ? values.quantity : String(context?.originalValue), businessDate: values.businessDate.format('YYYY-MM-DD') });
      await client.invalidateQueries(); message.success(`${result.businessDocumentNo} 已登记，反向处理中。`); onClose();
    } });
  };
  return <Drawer title={eventTypeMeta[action].label} size={820} open={open} onClose={onClose} destroyOnHidden footer={<Flex justify="flex-end" gap={8}><Button onClick={onClose}>取消</Button><Button type={returnAction ? 'primary' : 'default'} danger={!returnAction} disabled={!context || Boolean(context.blockedReason) || (!returnAction && context.available !== context.originalValue)} loading={mutation.isPending} onClick={submit}>提交{eventTypeMeta[action].label}</Button></Flex>}>
    <Alert showIcon type={returnAction ? 'info' : 'warning'} title={returnAction ? '原业务正确，后续真实退回供应商。' : '撤销错误业务影响，不删除原单，不等同于真实退货。'} />
    {query.isLoading ? <PageLoading /> : query.isError ? <PageError onRetry={() => query.refetch()} /> : context && <>
      <Descriptions className="drawer-descriptions" column={2} items={[{ key: 'original', label: '原执行单', children: event?.businessDocumentNo }, { key: 'item', label: '原订单 / 行ID', children: `${event?.poId} / ${event?.itemId}` }, { key: 'qty', label: '原数量 / 金额', children: `${context.originalValue} ${context.unit}` }, { key: 'effective', label: '已生效反向净额', children: `${context.effectiveReversed} ${context.unit}` }, { key: 'pending', label: '反向处理中', children: `${context.pending} ${context.unit}` }, { key: 'available', label: '当前可反向', children: `${context.available} ${context.unit}` }]} />
      <Alert className="editor-section" showIcon type={context.blockedReason ? 'warning' : 'info'} title={context.blockedReason ?? '内置样例具备演示依赖快照；不代表已查询真实库存或发票。'} />
      {mutation.isError && <Alert type="error" showIcon title={mutation.error.message} />}
      <Form form={form} layout="vertical" initialValues={{ businessDate: dayjs(), replacementRequired: true }} onValuesChange={() => setRequestKey(crypto.randomUUID())}>
        {returnAction && <Form.Item name="quantity" label="本次退货数量" rules={[{ required: true }]}><InputNumber<string> stringMode min="0.000001" max={String(context.available)} suffix={context.unit} /></Form.Item>}
        {!returnAction && <Alert className="editor-section" type="warning" title="按完整原执行行冲销；若已部分退货或存在其他占用，当前不可整笔冲销。" />}
        <Form.Item name="businessDate" label="业务日期" rules={[{ required: true }]}><DatePicker /></Form.Item>
        <Form.Item name="reason" label="原因及业务依据" rules={[{ required: true, whitespace: true }]}><Input.TextArea rows={3} maxLength={2000} /></Form.Item>
        {returnAction && <Form.Item name="replacementRequired" label="后续是否补货" rules={[{ required: true }]}><Radio.Group options={[{ value: true, label: '需要补货' }, { value: false, label: '不补货，交采购员关闭/变更处理' }]} /></Form.Item>}
        <Alert showIcon type="info" title="不补货不会自动取消需求或释放来源。反向生效后，该行保持受控阻断，待采购员确定另行采购或关闭未执行部分。" />
      </Form>
    </>}
  </Drawer>;
}
