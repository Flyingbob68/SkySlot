import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './error-handler.js';

interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return undefined;
  }
  return header.slice(7);
}

function decodeToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

function attachUser(req: Request, payload: JwtPayload): void {
  req.user = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles,
    permissions: payload.permissions,
  };
}

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    throw new AppError(401, 'Authentication required');
  }

  const payload = decodeToken(token);
  attachUser(req, payload);
  next();
}

export function requirePermission(
  ...requiredPermissions: readonly string[]
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const userPermissions = req.user?.permissions ?? [];

    const missing = requiredPermissions.filter(
      (perm) => !userPermissions.includes(perm),
    );

    if (missing.length > 0) {
      throw new AppError(403, 'Insufficient permissions');
    }

    next();
  };
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractToken(req);

  if (!token) {
    next();
    return;
  }

  const payload = decodeToken(token);
  attachUser(req, payload);
  next();
}
