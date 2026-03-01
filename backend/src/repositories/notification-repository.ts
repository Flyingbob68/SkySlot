/**
 * Data-access layer for notification preferences.
 *
 * Uses the `notificationEnabled` boolean on the Member model to track
 * whether the member wants to receive optional email notifications.
 * Security-critical emails (password reset, email verification) bypass
 * this preference and are always sent.
 *
 * Every function returns new objects -- nothing is mutated.
 */

import { prisma } from '../utils/prisma.js';

// ---------------------------------------------------------------------------
// Preference types
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  readonly notificationEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function getPreferences(
  memberId: string,
): Promise<NotificationPreferences | null> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { notificationEnabled: true },
  });

  if (!member) {
    return null;
  }

  return { notificationEnabled: member.notificationEnabled };
}

export async function updatePreferences(
  memberId: string,
  preferences: NotificationPreferences,
): Promise<NotificationPreferences> {
  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { notificationEnabled: preferences.notificationEnabled },
    select: { notificationEnabled: true },
  });

  return { notificationEnabled: updated.notificationEnabled };
}

/**
 * Check whether a member has notifications enabled.
 * Returns false if the member does not exist.
 */
export async function isNotificationEnabled(
  memberId: string,
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { notificationEnabled: true },
  });

  return member?.notificationEnabled ?? false;
}

/**
 * Fetch minimal member info needed for notification emails.
 */
export async function getMemberEmailInfo(memberId: string) {
  return prisma.member.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      notificationEnabled: true,
    },
  });
}
