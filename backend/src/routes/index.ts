import { Router } from 'express';
import { authRouter } from './auth.js';
import { membersRouter } from './members.js';
import { aircraftRouter } from './aircraft.js';
import { bookingsRouter } from './bookings.js';
import { qualificationsRouter } from './qualifications.js';
import { instructorsRouter } from './instructors.js';
import { adminRouter } from './admin.js';
import { notificationsRouter } from './notifications.js';

export const apiRouter = Router();

// Public / auth routes
apiRouter.use('/auth', authRouter);

// Resource routes
apiRouter.use('/members', membersRouter);
apiRouter.use('/aircraft', aircraftRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/qualifications', qualificationsRouter);
apiRouter.use('/instructors', instructorsRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/notifications', notificationsRouter);

// API info
apiRouter.get('/', (_req, res) => {
  res.json({
    success: true,
    data: { message: 'SkySlot API v0.1.0' },
    error: null,
  });
});
