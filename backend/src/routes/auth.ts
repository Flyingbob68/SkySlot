/**
 * Authentication route definitions.
 *
 * Wires middleware (validation, rate limiting, auth) to the controller
 * handlers for each auth endpoint.
 */

import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { rateLimiter } from '../middleware/rate-limiter.js';
import { authenticate } from '../middleware/auth.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from '../schemas/auth-schemas.js';
import * as authController from '../controllers/auth-controller.js';

export const authRouter = Router();

// POST /register
authRouter.post(
  '/register',
  rateLimiter({ windowMs: 60_000, maxRequests: 5 }),
  validateBody(registerSchema),
  authController.register,
);

// POST /login
authRouter.post(
  '/login',
  rateLimiter({ windowMs: 60_000, maxRequests: 10 }),
  validateBody(loginSchema),
  authController.login,
);

// POST /refresh
authRouter.post(
  '/refresh',
  validateBody(refreshTokenSchema),
  authController.refresh,
);

// POST /logout (requires authentication)
authRouter.post(
  '/logout',
  authenticate,
  authController.logout,
);

// POST /forgot-password
authRouter.post(
  '/forgot-password',
  rateLimiter({ windowMs: 60_000, maxRequests: 3 }),
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);

// POST /reset-password
authRouter.post(
  '/reset-password',
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);

// GET /me (requires authentication)
authRouter.get(
  '/me',
  authenticate,
  authController.getMe,
);
