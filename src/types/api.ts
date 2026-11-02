export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

