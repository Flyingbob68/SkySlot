/**
 * Frontend notification API client.
 *
 * Thin wrappers around the generic api-client that call the backend
 * notification endpoints and return typed responses.
 */

import { get, put } from '@/services/api-client';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  readonly notificationEnabled: boolean;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export const getPreferences = () =>
  get<NotificationPreferences>('/notifications/preferences');

export const updatePreferences = (data: NotificationPreferences) =>
  put<NotificationPreferences>('/notifications/preferences', data);
