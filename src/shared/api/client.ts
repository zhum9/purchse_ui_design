import type { ApiResponse } from './types';

export class AppApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}

export async function apiClient<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) throw new AppApiError('数据请求失败，请稍后重试。', response.status);
  const result = (await response.json()) as ApiResponse<T>;
  if (!result.success) throw new AppApiError(result.message ?? '业务处理失败。', response.status);
  return result.data;
}
