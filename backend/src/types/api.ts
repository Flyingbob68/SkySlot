/**
 * API response envelope types.
 *
 * Every endpoint in SkySlot returns a consistent envelope so that clients
 * can rely on a single shape for success, error, and paginated responses.
 */

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
  readonly meta?: PaginationMeta;
}
