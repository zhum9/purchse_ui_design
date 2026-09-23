import { Alert, App, Button, DatePicker, Descriptions, Drawer, Flex, Form, Input, InputNumber, Radio, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import type { ExecutionEvent } from '@domain/procurement/types';
import { formatDateTime, formatQuantity } from '@shared/utils/format';
import { apiClient } from '@shared/api/client';

interface Props { event?: ExecutionEvent; open: boolean; onClose: () => void }

export function PurchaseReturnDrawer({ event, open, onClose }: Props) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const mutation = useMutation({ mutationFn: (values: object) => apiClient('/api/executions', { method: 'POST', body: JSON.stringify({ type: 'PURCHASE_RETURN', sourceEventId: event?.id, values }) }) });
  if (!event) return null;
  const max = Math.abs(event.quantity ?? 0);
  const submit = async () => {
    const values = await form.validateFields();
    await mutation.mutateAsync(values);
    message.success('采购退货单已生成，原收货记录已保留。');
    onClose();
  };
  return <Drawer title="采购退货" size={800} open={open} onClose={onClose} destroyOnHidden footer={<Flex justify="flex-end" gap={8}><Button onClick={onClose}>取消</Button><Button type="primary" loading={mutation.isPending} onClick={submit}>提交退货</Button></Flex>}>
    <Alert type="info" showIcon title="采购退货适用于原收货正确、后续真实退回供应商的业务。" />
    <Descriptions className="drawer-descriptions" size="small" column={2} items={[
      { key: 'po', label: '原采购订单', children: '4500012345 / 00010' }, { key: 'gr', label: '原收货单', children: event.businessDocumentNo },
      { key: 'date', label: '原收货时间', children: formatDateTime(event.occurredAt) }, { key: 'qty', label: '原收货数量', children: formatQuantity(max, event.unit ?? '') },
      { key: 'returned', label: '历史已退', children: formatQuantity(0, event.unit ?? '') }, { key: 'available', label: '当前可退', children: <strong>{formatQuantity(max, event.unit ?? '')}</strong> },
    ]} />
    <Form form={form} layout="vertical">
      <div className="dynamic-form-grid">
        <Form.Item name="quantity" label="本次退货数量" rules={[{ required: true, message: '请填写本次退货数量' }]}><InputNumber className="field-full" min={0.001} max={max} suffix={event.unit} /></Form.Item>
        <Form.Item name="returnDate" label="退货日期" rules={[{ required: true, message: '请选择退货日期' }]}><DatePicker className="field-full" /></Form.Item>
        <Form.Item name="reason" label="退货原因" rules={[{ required: true, message: '请填写退货原因' }]}><Input placeholder="例如：质量复检不合格" /></Form.Item>
        <Form.Item name="storageLocation" label="退货库存地点" initialValue="原粮一库（1001）"><Input /></Form.Item>
        <Form.Item name="batch" label="批次"><Input /></Form.Item>
        <Form.Item name="needReplacement" label="是否需要供应商补货"><Radio.Group options={[{ label: '需要补货', value: true }, { label: '无需补货', value: false }]} /></Form.Item>
        <Form.Item className="dynamic-form-grid__wide" name="qualityIssue" label="质量问题说明"><Input.TextArea rows={3} /></Form.Item>
        <Form.Item className="dynamic-form-grid__wide" name="attachments" label="附件" valuePropName="fileList"><Upload.Dragger beforeUpload={() => false}><p className="ant-upload-drag-icon"><InboxOutlined /></p><p>上传质量报告、退货凭证或现场照片</p></Upload.Dragger></Form.Item>
        <Form.Item className="dynamic-form-grid__wide" name="remark" label="备注"><Input.TextArea rows={3} /></Form.Item>
      </div>
    </Form>
  </Drawer>;
}
