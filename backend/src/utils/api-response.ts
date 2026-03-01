/**
 * Helper functions that produce the standard SkySlot API envelope.
 *
 * Every response returned by the backend conforms to `ApiResponse<T>` so that
 * clients can rely on a single, predictable shape.
 */

import type { ApiResponse, PaginationMeta } from '../types/api.js';

/**
 * Build a successful response.
 *
 * @param data  - The payload to send to the client.
 * @param meta  - Optional pagination metadata.
 */
export const successResponse = <T>(
  data: T,
  meta?: PaginationMeta,
): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  ...(meta !== undefined ? { meta } : {}),
});

/**
 * Build an error response.
 *
 * @param message - A user-facing error description.
 */
export const errorResponse = (message: string): ApiResponse<null> => ({
  success: false,
  data: null,
  error: message,
});

/**
 * Build a paginated success response.
 *
 * @param data  - The current page of items.
 * @param total - Total number of matching items across all pages.
 * @param page  - The current page number (1-based).
 * @param limit - Maximum items per page.
 */
export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<T[]> => ({
  success: true,
  data,
  error: null,
  meta: { total, page, limit },
});
