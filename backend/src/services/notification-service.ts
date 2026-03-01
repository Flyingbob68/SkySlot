/**
 * Notification service -- subscribes to all domain events and sends emails.
 *
 * Call `initNotifications()` once at startup to register all event handlers.
 * Each handler looks up the relevant member(s), checks notification
 * preferences, renders the appropriate template, and queues the email.
 *
 * Security emails (password reset, email verification) always bypass
 * the notification-enabled preference.
 */

import { eventBus } from '../utils/event-bus.js';
import { prisma } from '../utils/prisma.js';
import { sendEmail } from './email-service.js';
import {
  bookingCreatedTemplate,
  bookingModifiedTemplate,
  bookingCancelledTemplate,
  bookingMovedTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  emailVerificationTemplate,
  qualificationExpiringTemplate,
  subscriptionExpiringTemplate,
} from './email-templates.js';
import type { AppEvents } from '../utils/event-bus.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(date: Date): string {
  return date.toLocaleString('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Rome',
  });
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`;
}

async function getMemberInfo(memberId: string) {
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

async function getBookingWithDetails(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      aircraft: { select: { callsign: true } },
      member: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          notificationEnabled: true,
        },
      },
      instructor: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          notificationEnabled: true,
        },
      },
    },
  });
}

function sendTemplate(
  email: string,
  template: { readonly subject: string; readonly html: string; readonly text: string },
): void {
  sendEmail(email, template.subject, template.html, template.text);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleBookingCreated(
  data: AppEvents['booking.created'],
): Promise<void> {
  const booking = await getBookingWithDetails(data.bookingId);
  if (!booking) return;

  const { member, instructor, aircraft } = booking;

  const templateData = {
    pilotName: fullName(member.firstName, member.lastName),
    aircraftCallsign: aircraft.callsign,
    startDate: formatDateTime(booking.startDate),
    endDate: formatDateTime(booking.endDate),
    slotType: booking.slotType,
    instructorName: instructor
      ? fullName(instructor.firstName, instructor.lastName)
      : undefined,
  };

  const template = bookingCreatedTemplate(templateData);

  if (member.notificationEnabled) {
    sendTemplate(member.email, template);
  }

  if (instructor?.notificationEnabled) {
    sendTemplate(instructor.email, template);
  }
}

async function handleBookingUpdated(
  data: AppEvents['booking.updated'],
): Promise<void> {
  const booking = await getBookingWithDetails(data.bookingId);
  if (!booking) return;

  const { member, instructor, aircraft } = booking;

  const templateData = {
    pilotName: fullName(member.firstName, member.lastName),
    aircraftCallsign: aircraft.callsign,
    startDate: formatDateTime(booking.startDate),
    endDate: formatDateTime(booking.endDate),
    slotType: booking.slotType,
    instructorName: instructor
      ? fullName(instructor.firstName, instructor.lastName)
      : undefined,
  };

  const template = bookingModifiedTemplate(templateData);

  if (member.notificationEnabled) {
    sendTemplate(member.email, template);
  }

  // Notify current instructor
  if (instructor?.notificationEnabled) {
    sendTemplate(instructor.email, template);
  }

  // Notify old instructor if changed
  if (data.oldInstructorId && data.oldInstructorId !== data.newInstructorId) {
    const oldInstructor = await getMemberInfo(data.oldInstructorId);
    if (oldInstructor?.notificationEnabled) {
      sendTemplate(oldInstructor.email, template);
    }
  }
}

async function handleBookingDeleted(
  data: AppEvents['booking.deleted'],
): Promise<void> {
  // Booking is already deleted, so we look up member/instructor directly
  const member = await getMemberInfo(data.memberId);
  if (!member) return;

  // We can't get booking details since it's deleted, so we need
  // the event payload to carry enough info. For now, send a generic
  // cancellation based on available data.
  const booking = await getBookingWithDetails(data.bookingId);

  // If booking still exists (soft delete or pre-delete event)
  if (booking) {
    const templateData = {
      pilotName: fullName(member.firstName, member.lastName),
      aircraftCallsign: booking.aircraft.callsign,
      startDate: formatDateTime(booking.startDate),
      endDate: formatDateTime(booking.endDate),
      slotType: booking.slotType,
      instructorName: booking.instructor
        ? fullName(booking.instructor.firstName, booking.instructor.lastName)
        : undefined,
    };

    const template = bookingCancelledTemplate(templateData);

    if (member.notificationEnabled) {
      sendTemplate(member.email, template);
    }

    if (booking.instructor?.notificationEnabled) {
      sendTemplate(booking.instructor.email, template);
    }
    return;
  }

  // Fallback: if booking was already hard-deleted, notify with minimal info
  if (data.instructorId) {
    const instructor = await getMemberInfo(data.instructorId);
    if (instructor?.notificationEnabled) {
      // Minimal notification about cancellation
      const fallbackTemplate = bookingCancelledTemplate({
        pilotName: fullName(member.firstName, member.lastName),
        aircraftCallsign: 'N/D',
        startDate: 'N/D',
        endDate: 'N/D',
        slotType: 'SOLO',
      });
      sendTemplate(instructor.email, fallbackTemplate);
    }
  }
}

async function handleBookingMoved(
  data: AppEvents['booking.moved'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member?.notificationEnabled) return;

  const [oldAircraft, newAircraft, booking] = await Promise.all([
    prisma.aircraft.findUnique({
      where: { id: data.oldAircraftId },
      select: { callsign: true },
    }),
    prisma.aircraft.findUnique({
      where: { id: data.newAircraftId },
      select: { callsign: true },
    }),
    prisma.booking.findUnique({
      where: { id: data.bookingId },
      select: { startDate: true, endDate: true },
    }),
  ]);

  if (!oldAircraft || !newAircraft || !booking) return;

  const template = bookingMovedTemplate({
    pilotName: fullName(member.firstName, member.lastName),
    oldAircraft: oldAircraft.callsign,
    newAircraft: newAircraft.callsign,
    startDate: formatDateTime(booking.startDate),
    endDate: formatDateTime(booking.endDate),
  });

  sendTemplate(member.email, template);
}

async function handleMemberCreated(
  data: AppEvents['member.created'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member) return;

  const template = welcomeTemplate({
    memberName: fullName(member.firstName, member.lastName),
    email: member.email,
  });

  // Welcome emails are always sent
  sendTemplate(member.email, template);
}

async function handlePasswordReset(
  data: AppEvents['auth.password_reset'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member) return;

  const template = passwordResetTemplate({
    memberName: fullName(member.firstName, member.lastName),
    resetLink: `${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}/reset-password?token=${data.token}`,
  });

  // Security email: always sent, no opt-out
  sendTemplate(data.email, template);
}

async function handleVerifyEmail(
  data: AppEvents['auth.verify_email'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member) return;

  const template = emailVerificationTemplate({
    memberName: fullName(member.firstName, member.lastName),
    verificationLink: `${process.env.CORS_ORIGIN ?? 'http://localhost:5173'}/verify-email?token=${data.token}`,
  });

  // Security email: always sent, no opt-out
  sendTemplate(data.email, template);
}

async function handleQualificationExpiring(
  data: AppEvents['qualification.expiring'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member?.notificationEnabled) return;

  // Check if noAlert is set for this specific qualification
  const memberQualification = await prisma.memberQualification.findFirst({
    where: {
      memberId: data.memberId,
      qualificationId: data.qualificationId,
    },
    select: {
      noAlert: true,
      qualification: { select: { name: true } },
    },
  });

  if (!memberQualification || memberQualification.noAlert) return;

  const template = qualificationExpiringTemplate({
    memberName: fullName(member.firstName, member.lastName),
    qualificationName: memberQualification.qualification.name,
    expiryDate: data.expiryDate,
  });

  sendTemplate(member.email, template);
}

async function handleSubscriptionExpiring(
  data: AppEvents['subscription.expiring'],
): Promise<void> {
  const member = await getMemberInfo(data.memberId);
  if (!member?.notificationEnabled) return;

  const template = subscriptionExpiringTemplate({
    memberName: fullName(member.firstName, member.lastName),
    expiryDate: data.expiryDate,
  });

  sendTemplate(member.email, template);
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Register all event-bus subscriptions for sending notification emails.
 * Call once at application startup.
 */
export function initNotifications(): void {
  eventBus.on('booking.created', (data) => {
    void handleBookingCreated(data);
  });

  eventBus.on('booking.updated', (data) => {
    void handleBookingUpdated(data);
  });

  eventBus.on('booking.deleted', (data) => {
    void handleBookingDeleted(data);
  });

  eventBus.on('booking.moved', (data) => {
    void handleBookingMoved(data);
  });

  eventBus.on('member.created', (data) => {
    void handleMemberCreated(data);
  });

  eventBus.on('auth.password_reset', (data) => {
    void handlePasswordReset(data);
  });

  eventBus.on('auth.verify_email', (data) => {
    void handleVerifyEmail(data);
  });

  eventBus.on('qualification.expiring', (data) => {
    void handleQualificationExpiring(data);
  });

  eventBus.on('subscription.expiring', (data) => {
    void handleSubscriptionExpiring(data);
  });

  console.log('[notifications] Event subscriptions registered');
}
