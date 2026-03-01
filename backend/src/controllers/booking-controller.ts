/**
 * Request handlers for the booking domain.
 *
 * Each handler maps an HTTP request to a service call and returns
 * the standard API envelope.  No business logic lives here.
 */

import type { Request, Response } from 'express';
import { successResponse, paginatedResponse } from '../utils/api-response.js';
import { AppError } from '../middleware/error-handler.js';
import * as bookingService from '../services/booking-service.js';
import type {
  CreateBookingInput,
  UpdateBookingInput,
  BookingQueryInput,
  CalendarQueryInput,
  ConflictCheckInput,
} from '../schemas/booking-schemas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireUser(req: Request) {
  if (!req.user) {
    throw new AppError(401, 'Autenticazione richiesta');
  }
  return req.user;
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/** GET /bookings */
export const listBookings = async (req: Request, res: Response): Promise<void> => {
  requireUser(req);
  const query = req.query as unknown as BookingQueryInput;

  const { items, total } = await bookingService.getBookings({
    page: query.page,
    limit: query.limit,
    memberId: query.memberId,
    aircraftId: query.aircraftId,
    from: query.from,
    to: query.to,
    slotType: query.slotType,
  });

  res.json(paginatedResponse(items, total, query.page, query.limit));
};

/** GET /bookings/calendar */
export const getCalendar = async (req: Request, res: Response): Promise<void> => {
  requireUser(req);
  const query = req.query as unknown as CalendarQueryInput;

  const data = await bookingService.getCalendarData(query.date, query.aircraftIds);

  res.json(successResponse(data));
};

/** GET /bookings/my */
export const getMyBookings = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req);
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const { items, total } = await bookingService.getMyBookings(user.id, { page, limit });

  res.json(paginatedResponse(items, total, page, limit));
};

/** GET /bookings/conflicts */
export const checkConflicts = async (req: Request, res: Response): Promise<void> => {
  requireUser(req);
  const query = req.query as unknown as ConflictCheckInput;

  const conflicts = await bookingService.checkConflicts({
    startDate: query.startDate,
    endDate: query.endDate,
    aircraftId: query.aircraftId,
    memberId: query.memberId,
    instructorId: query.instructorId,
    excludeBookingId: query.excludeBookingId,
  });

  res.json(successResponse(conflicts));
};

/** GET /bookings/:id */
export const getBooking = async (req: Request, res: Response): Promise<void> => {
  requireUser(req);

  const booking = await bookingService.getBookingById(req.params.id as string);

  res.json(successResponse(booking));
};

/** POST /bookings */
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req);
  const body = req.body as CreateBookingInput;

  const { booking, validation } = await bookingService.createBooking(
    {
      startDate: body.startDate,
      endDate: body.endDate,
      aircraftId: body.aircraftId,
      slotType: body.slotType,
      instructorId: body.instructorId,
      freeSeats: body.freeSeats,
      comments: body.comments,
    },
    user.id,
    user.permissions,
    body.confirmed,
  );

  // If validation failed or warnings need confirmation
  if (!booking) {
    if (!validation.valid) {
      res.status(422).json({
        success: false,
        data: null,
        error: 'Validazione fallita',
        validation,
      });
      return;
    }

    // Warnings present, needs confirmation
    res.status(200).json({
      success: true,
      data: null,
      error: null,
      validation,
      needsConfirmation: true,
    });
    return;
  }

  res.status(201).json(successResponse(booking));
};

/** PUT /bookings/:id */
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req);
  const body = req.body as UpdateBookingInput;

  const { booking, validation } = await bookingService.updateBooking(
    req.params.id as string,
    {
      startDate: body.startDate,
      endDate: body.endDate,
      aircraftId: body.aircraftId,
      slotType: body.slotType,
      instructorId: body.instructorId,
      freeSeats: body.freeSeats,
      comments: body.comments,
    },
    user.id,
    user.permissions,
    body.confirmed,
  );

  if (!booking) {
    if (!validation.valid) {
      res.status(422).json({
        success: false,
        data: null,
        error: 'Validazione fallita',
        validation,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: null,
      error: null,
      validation,
      needsConfirmation: true,
    });
    return;
  }

  res.json(successResponse(booking));
};

/** DELETE /bookings/:id */
export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  const user = requireUser(req);

  await bookingService.deleteBooking(req.params.id as string, user.id, user.permissions);

  res.json(successResponse({ deleted: true }));
};
