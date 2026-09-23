import { CheckCircleOutlined, RetweetOutlined, RollbackOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { Button, Empty, Timeline, Typography } from 'antd';
import { eventTypeMeta } from '@domain/procurement/meta';
import type { ExecutionEvent } from '@domain/procurement/types';
import { formatDateTime, formatMoney, formatQuantity } from '@shared/utils/format';

const eventIcons = {
  GOODS_RECEIPT: <ShoppingCartOutlined />,
  SERVICE_ACCEPTANCE: <CheckCircleOutlined />,
  AMOUNT_CONFIRMATION: <CheckCircleOutlined />,
  GR_REVERSAL: <RollbackOutlined />,
  PURCHASE_RETURN: <RetweetOutlined />,
  RETURN_REVERSAL: <RollbackOutlined />,
  DELIVERY_COMPLETE: <CheckCircleOutlined />,
};

export function DocumentFlow({ events, onSelect }: { events: ExecutionEvent[]; onSelect?: (event: ExecutionEvent) => void }) {
  if (!events.length) return <Empty description="该采购订单尚未产生履约单据。" />;
  return (
    <Timeline
      className="document-flow"
      items={events.map((event) => ({
        icon: eventIcons[event.type],
        color: event.sapStatus === 'FAILED' ? 'red' : event.sapStatus === 'PROCESSING' ? 'blue' : 'green',
        content: (
          <div className="document-flow__node">
            <Typography.Text type="secondary">{formatDateTime(event.occurredAt)}</Typography.Text>
            <div>
              <Button type="link" className="document-flow__link" onClick={() => onSelect?.(event)}>{event.businessDocumentNo}</Button>
              <Typography.Text strong>{eventTypeMeta[event.type].label}</Typography.Text>
            </div>
            <Typography.Text>{event.title}</Typography.Text>
            <Typography.Text type="secondary">
              {event.quantity !== undefined && formatQuantity(event.quantity, event.unit ?? '')}
              {event.amount !== undefined && formatMoney(event.amount)} · 经办人 {event.operator}
            </Typography.Text>
          </div>
        ),
      }))}
    />
  );
}
