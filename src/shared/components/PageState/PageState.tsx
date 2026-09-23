import { Button, Result, Skeleton } from 'antd';

export function PageLoading() {
  return <div className="content-surface"><Skeleton active paragraph={{ rows: 8 }} /></div>;
}

export function PageError({ onRetry }: { onRetry?: () => void }) {
  return <Result status="error" title="数据加载失败" subTitle="请检查网络连接后重试，当前筛选条件已为你保留。" extra={onRetry && <Button onClick={onRetry}>重新加载</Button>} />;
}

export function PermissionDenied() {
  return <Result status="403" title="暂无访问权限" subTitle="如需处理该业务，请联系系统管理员配置相应权限。" />;
}
