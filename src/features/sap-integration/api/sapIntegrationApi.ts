import type { SapExecution } from '@domain/procurement/types';
import { apiClient } from '@shared/api/client';
import type { PageResult } from '@shared/api/types';

export const sapKeys = { all: ['sap-executions'] as const };
export const getSapExecutions = () => apiClient<PageResult<SapExecution>>('/api/sap/executions');
export const reconcileSapExecution = (id: string) => apiClient<{ id: string; status: string; sapDocumentNo: string }>(`/api/sap/executions/${id}/reconcile`, { method: 'POST' });
