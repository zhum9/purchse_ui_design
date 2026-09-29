import { InboxOutlined } from '@ant-design/icons';
import { App, Upload, type UploadFile } from 'antd';
import { getLocalAttachment, saveLocalAttachment } from '@shared/api/localAttachments';

export function LocalAttachmentUpload({ fileList = [], onChange }: { fileList?: UploadFile[]; onChange?: (event: { fileList: UploadFile[] }) => void }) {
  const { message } = App.useApp();
  return <Upload.Dragger fileList={fileList} maxCount={6} beforeUpload={(file) => { if (file.size > 20 * 1024 * 1024) { message.error('附件不得超过20MB。'); return Upload.LIST_IGNORE; } return true; }}
    customRequest={async ({ file, onSuccess, onError }) => { try { if (!(file instanceof File)) throw new Error('附件格式无效。'); const record = await saveLocalAttachment(file); onSuccess?.({ attachmentId: record.id, sha256: record.sha256 }); } catch (error) { onError?.(error instanceof Error ? error : new Error('保存附件失败')); } }}
    onChange={(event) => onChange?.({ fileList: event.fileList })}
    onPreview={async (file) => { const response = file.response as { attachmentId?: string } | undefined; const attachment = response?.attachmentId ? await getLocalAttachment(response.attachmentId) : undefined; if (!attachment) { message.warning('附件尚未保存或不在本机。'); return; } const url = URL.createObjectURL(attachment.blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = attachment.fileName; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>
    <p className="ant-upload-drag-icon"><InboxOutlined /></p><p>选择业务附件（最多6个，每个20MB）</p><p className="ant-upload-hint">仅保存在当前浏览器，未上传服务器，也未进行病毒扫描；同事无法共享此附件。</p>
  </Upload.Dragger>;
}
