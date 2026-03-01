/**
 * Zod validation schemas for notification endpoints.
 *
 * Defines the expected shape and constraints for notification
 * preference update requests.
 */

import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  notificationEnabled: z
    .boolean({ message: 'Il campo notificationEnabled e\' obbligatorio.' }),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
