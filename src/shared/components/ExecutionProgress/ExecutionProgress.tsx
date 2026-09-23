import { Progress, Space, Typography } from 'antd';
import { getExecutionPercent, getRemainingValue } from '@domain/procurement/calculations';
import type { PurchaseOrderItem } from '@domain/procurement/types';
import { formatMoney, formatQuantity } from '@shared/utils/format';

export function ExecutionProgress({ item, compact = false }: { item: PurchaseOrderItem; compact?: boolean }) {
  const isMoney = item.controlMode === 'AMOUNT' || item.controlMode === 'LIMIT' || item.unit === '元';
  const format = (value: number) => isMoney ? formatMoney(value) : formatQuantity(value, item.unit);
  return (
    <Space orientation="vertical" size={compact ? 2 : 6} className="execution-progress">
      <Progress percent={getExecutionPercent(item)} size="small" showInfo={!compact} status={item.status.fulfillmentStatus === 'OVERDUE' ? 'exception' : 'normal'} />
      <Typography.Text type="secondary" className="text-compact">
        已执行 {format(item.executedValue)} · 剩余 {format(getRemainingValue(item))}
      </Typography.Text>
    </Space>
  );
}
