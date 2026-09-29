import type { RevisionStatus } from './types';
export const revisionMeta: Record<RevisionStatus, { label: string; color: string }> = {
  WORKING: { label: '编制中', color: 'default' }, SUBMITTED: { label: '审批中', color: 'processing' },
  AUTHORIZED: { label: '已授权 · 待ERP生效', color: 'warning' }, EFFECTIVE: { label: '正式生效', color: 'success' },
  SUPERSEDED: { label: '历史版本', color: 'default' }, REJECTED: { label: '已驳回', color: 'error' }, WITHDRAWN: { label: '已撤回', color: 'default' },
};
