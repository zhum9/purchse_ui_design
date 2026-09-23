import { Alert, Collapse, Descriptions, Drawer, Typography } from 'antd';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { SapExecution } from '@domain/procurement/types';
import { StatusTag } from '@shared/components/StatusTag';
import { formatDateTime } from '@shared/utils/format';

export function SapDetailDrawer({ execution, open, onClose }: { execution?: SapExecution; open: boolean; onClose: () => void }) {
  if (!execution) return null;
  return <Drawer title="SAP执行详情" size={760} open={open} onClose={onClose} destroyOnHidden>
    {execution.status === 'UNKNOWN' && <Alert type="warning" showIcon title="SAP状态待核对" description="该请求可能已经在 SAP 成功执行。完成状态核对前，不允许直接重新执行，以避免重复凭证。" />}
    {execution.errorSummary && <Alert className="drawer-alert" type={execution.status === 'FAILED' ? 'error' : 'warning'} showIcon title={execution.errorSummary} />}
    <section className="detail-section"><Typography.Title level={5}>业务信息</Typography.Title><Descriptions column={2} items={[
      { key: 'businessNo', label: '业务单号', children: execution.businessDocumentNo }, { key: 'action', label: '业务动作', children: eventTypeMeta[execution.businessAction].label },
      { key: 'po', label: 'SAP采购订单', children: execution.sapPoNo }, { key: 'item', label: '行项目', children: execution.itemNo },
      { key: 'time', label: '执行时间', children: formatDateTime(execution.executedAt) }, { key: 'status', label: 'SAP状态', children: <StatusTag domain="sap" value={execution.status} /> },
      { key: 'document', label: 'SAP凭证', children: execution.sapDocumentNo ?? '-' },
    ]} /></section>
    <Collapse className="technical-collapse" items={[{ key: 'technical', label: '技术信息（接口运维可见）', children: <Descriptions size="small" column={1} items={[
      { key: 'request', label: '业务请求ID', children: execution.requestId }, { key: 'code', label: '技术错误码', children: execution.technicalCode ?? '-' },
      { key: 'interface', label: '接口通道', children: 'SAP Adapter / OData' }, { key: 'raw', label: '原始返回摘要', children: <Typography.Text code>{execution.errorSummary ?? 'Execution completed successfully.'}</Typography.Text> },
    ]} /> }]} />
  </Drawer>;
}
