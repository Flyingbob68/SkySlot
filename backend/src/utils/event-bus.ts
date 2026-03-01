/**
 * Typed event bus for cross-module notifications.
 *
 * Wraps Node's `EventEmitter` with a strongly-typed API so that event
 * names and their payloads are checked at compile time.
 */

import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Event type map — every domain event and its payload live here.
// ---------------------------------------------------------------------------

export interface AppEvents {
  'booking.created': {
    readonly bookingId: string;
    readonly memberId: string;
    readonly instructorId?: string;
  };
  'booking.updated': {
    readonly bookingId: string;
    readonly memberId: string;
    readonly oldInstructorId?: string;
    readonly newInstructorId?: string;
  };
  'booking.deleted': {
    readonly bookingId: string;
    readonly memberId: string;
    readonly instructorId?: string;
  };
  'booking.moved': {
    readonly bookingId: string;
    readonly memberId: string;
    readonly oldAircraftId: string;
    readonly newAircraftId: string;
  };
  'member.created': {
    readonly memberId: string;
    readonly email: string;
  };
  'auth.password_reset': {
    readonly memberId: string;
    readonly email: string;
    readonly token: string;
  };
  'auth.verify_email': {
    readonly memberId: string;
    readonly email: string;
    readonly token: string;
  };
  'qualification.expiring': {
    readonly memberId: string;
    readonly qualificationId: string;
    readonly expiryDate: string;
  };
  'subscription.expiring': {
    readonly memberId: string;
    readonly expiryDate: string;
  };
}

// ---------------------------------------------------------------------------
// Typed wrapper
// ---------------------------------------------------------------------------

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  /** Emit a domain event with its associated payload. */
  emit<K extends keyof AppEvents>(event: K, data: AppEvents[K]): void {
    this.emitter.emit(event, data);
  }

  /** Subscribe to a domain event. */
  on<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void,
  ): void {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
  }

  /** Unsubscribe from a domain event. */
  off<K extends keyof AppEvents>(
    event: K,
    handler: (data: AppEvents[K]) => void,
  ): void {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }
}

/** Singleton event bus shared across the entire backend. */
export const eventBus = new TypedEventBus();
