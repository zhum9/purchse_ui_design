import type { ReactNode } from 'react';
import { Flex, Typography } from 'antd';

interface PageHeaderProps {
  title: string;
  description?: string;
  status?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, status, actions }: PageHeaderProps) {
  return (
    <Flex className="page-header" justify="space-between" align="flex-start" gap={24}>
      <div>
        <Flex align="center" gap={10}>
          <Typography.Title level={2}>{title}</Typography.Title>
          {status}
        </Flex>
        {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      </div>
      {actions && <Flex gap={8}>{actions}</Flex>}
    </Flex>
  );
}
