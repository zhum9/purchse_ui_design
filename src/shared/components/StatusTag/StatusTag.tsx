import { CheckCircleFilled, ClockCircleFilled, CloseCircleFilled, ExclamationCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import { Tag } from 'antd';
import { demandStatusMeta, fulfillmentStatusMeta, planStatusMeta, receiptStatusMeta, sapStatusMeta, type StatusTone } from '@domain/procurement/meta';
import type { FulfillmentStatus, ProcurementDemandStatus, ProcurementPlanStatus, ReceiptStatus, SapSyncStatus } from '@domain/procurement/types';

type StatusTagProps =
  | { domain: 'fulfillment'; value: FulfillmentStatus }
  | { domain: 'receipt'; value: ReceiptStatus }
  | { domain: 'sap'; value: SapSyncStatus }
  | { domain: 'demand'; value: ProcurementDemandStatus }
  | { domain: 'plan'; value: ProcurementPlanStatus };

const toneConfig: Record<StatusTone, { color: string; icon: React.ReactNode }> = {
  success: { color: 'success', icon: <CheckCircleFilled /> },
  processing: { color: 'processing', icon: <ClockCircleFilled /> },
  warning: { color: 'warning', icon: <ExclamationCircleFilled /> },
  error: { color: 'error', icon: <CloseCircleFilled /> },
  default: { color: 'default', icon: <MinusCircleFilled /> },
};

export function StatusTag(props: StatusTagProps) {
  const meta = props.domain === 'fulfillment'
    ? fulfillmentStatusMeta[props.value]
    : props.domain === 'receipt'
      ? receiptStatusMeta[props.value]
      : props.domain === 'sap'
        ? sapStatusMeta[props.value]
        : props.domain === 'demand'
          ? demandStatusMeta[props.value]
          : planStatusMeta[props.value];
  const tone = toneConfig[meta.tone];
  return <Tag color={tone.color} icon={tone.icon}>{meta.label}</Tag>;
}
