import { ExclamationCircleFilled, InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Alert, App, Button, DatePicker, Descriptions, Drawer, Flex, Form, Input, Upload } from 'antd';
import type { ExecutionEvent } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import { formatDateTime, formatQuantity } from '@shared/utils/format';

interface Props { event?: ExecutionEvent; open: boolean; onClose: () => void }

export function ReceiptReversalDrawer({ event, open, onClose }: Props) {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const mutation = useMutation({ mutationFn: (values: object) => apiClient('/api/executions', { method: 'POST', body: JSON.stringify({ type: 'GR_REVERSAL', sourceEventId: event?.id, values }) }) });
  if (!event) return null;
  const confirm = async () => {
    const values = await form.validateFields();
    modal.confirm({
      title: '确认冲销这笔正式收货？', icon: <ExclamationCircleFilled />, okText: '确认冲销', okButtonProps: { danger: true }, cancelText: '返回检查',
      content: '冲销将撤销原收货的业务影响，并向 SAP 提交反向处理。原收货记录不会删除。',
      onOk: async () => { await mutation.mutateAsync(values); message.success('冲销单已生成，原收货记录已保留。'); onClose(); },
    });
  };
  return <Drawer title="收货冲销" size={800} open={open} onClose={onClose} destroyOnHidden footer={<Flex justify="flex-end" gap={8}><Button onClick={onClose}>取消</Button><Button danger loading={mutation.isPending} onClick={confirm}>确认冲销</Button></Flex>}>
    <Alert type="warning" showIcon title="冲销用于撤销错误的收货操作，不等同于采购退货。" description="如果原收货正确、现在需要真实退回供应商，请发起采购退货。" />
    <Descriptions className="drawer-descriptions" size="small" column={2} items={[
      { key: 'po', label: '原采购订单', children: '4500012345 / 00010' }, { key: 'gr', label: '原收货单', children: event.businessDocumentNo },
      { key: 'qty', label: '原收货数量', children: formatQuantity(Math.abs(event.quantity ?? 0), event.unit ?? '') }, { key: 'date', label: '原收货时间', children: formatDateTime(event.occurredAt) },
      { key: 'sap', label: 'SAP物料凭证', children: event.sapDocumentNo ?? '-' }, { key: 'state', label: '当前状态', children: '已正式过账' },
    ]} />
    <Form form={form} layout="vertical"><div className="dynamic-form-grid">
      <Form.Item name="reason" label="冲销原因" rules={[{ required: true, message: '请填写冲销原因' }]}><Input placeholder="说明原收货存在的具体错误" /></Form.Item>
      <Form.Item name="reversalDate" label="冲销日期" rules={[{ required: true, message: '请选择冲销日期' }]}><DatePicker className="field-full" /></Form.Item>
      <Form.Item name="postingDate" label="过账日期" rules={[{ required: true, message: '请选择过账日期' }]}><DatePicker className="field-full" /></Form.Item>
      <Form.Item className="dynamic-form-grid__wide" name="attachments" label="附件" valuePropName="fileList"><Upload.Dragger beforeUpload={() => false}><p className="ant-upload-drag-icon"><InboxOutlined /></p><p>上传错误说明或审批凭证</p></Upload.Dragger></Form.Item>
      <Form.Item className="dynamic-form-grid__wide" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
    </div></Form>
  </Drawer>;
}
