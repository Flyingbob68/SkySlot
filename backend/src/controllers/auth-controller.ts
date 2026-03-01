/**
 * Request handlers for authentication endpoints.
 *
 * Each handler delegates to the auth service and wraps the result in
 * the standard API envelope.  Errors are thrown as `AppError` instances
 * and caught by the global error handler.
 */

import type { Request, Response } from 'express';
import { successResponse } from '../utils/api-response.js';
import * as authService from '../services/auth-service.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName } = req.body;

  const result = await authService.register(
    email,
    password,
    firstName,
    lastName,
  );

  res.status(201).json(
    successResponse({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }),
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { identifier, password } = req.body;
  const ip = req.ip;

  const result = await authService.login(identifier, password, ip);

  res.json(
    successResponse({
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }),
  );
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  const { token } = req.body;

  const result = await authService.refreshToken(token);

  res.json(
    successResponse({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    }),
  );
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.json(successResponse({ message: 'Logout effettuato con successo.' }));
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  // Always return success to prevent email enumeration
  res.json(
    successResponse({
      message:
        'Se l\'indirizzo email e\' registrato, riceverai le istruzioni per il reset della password.',
    }),
  );
};

export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password);

  res.json(
    successResponse({
      message: 'Password aggiornata con successo. Effettua il login con la nuova password.',
    }),
  );
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const memberId = req.user!.id;

  const user = await authService.getMe(memberId);

  res.json(successResponse(user));
};
