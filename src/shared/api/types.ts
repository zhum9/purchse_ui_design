export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  traceId?: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
