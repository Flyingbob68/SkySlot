/**
 * Express routes for the booking domain.
 *
 * All routes require authentication.  Permission checks for creation
 * are delegated to the service layer because they depend on the
 * slot type.
 */

import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createBookingSchema,
  updateBookingSchema,
  bookingQuerySchema,
  calendarQuerySchema,
  conflictCheckSchema,
  bookingIdParamSchema,
} from '../schemas/booking-schemas.js';
import * as ctrl from '../controllers/booking-controller.js';

export const bookingsRouter = Router();

// GET /bookings — list all bookings (requires booking:view_all)
bookingsRouter.get(
  '/',
  authenticate,
  requirePermission('booking:view_all'),
  validateQuery(bookingQuerySchema),
  ctrl.listBookings,
);

// GET /bookings/calendar — calendar grid data
bookingsRouter.get(
  '/calendar',
  authenticate,
  validateQuery(calendarQuerySchema),
  ctrl.getCalendar,
);

// GET /bookings/my — current user's bookings
bookingsRouter.get(
  '/my',
  authenticate,
  ctrl.getMyBookings,
);

// GET /bookings/conflicts — pre-creation conflict check
bookingsRouter.get(
  '/conflicts',
  authenticate,
  validateQuery(conflictCheckSchema),
  ctrl.checkConflicts,
);

// GET /bookings/:id — single booking detail
bookingsRouter.get(
  '/:id',
  authenticate,
  validateParams(bookingIdParamSchema),
  ctrl.getBooking,
);

// POST /bookings — create booking (permission checked in service)
bookingsRouter.post(
  '/',
  authenticate,
  validateBody(createBookingSchema),
  ctrl.createBooking,
);

// PUT /bookings/:id — update booking
bookingsRouter.put(
  '/:id',
  authenticate,
  validateParams(bookingIdParamSchema),
  validateBody(updateBookingSchema),
  ctrl.updateBooking,
);

// DELETE /bookings/:id — delete booking
bookingsRouter.delete(
  '/:id',
  authenticate,
  validateParams(bookingIdParamSchema),
  ctrl.deleteBooking,
);
