import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error-handler.js';

interface RateLimitEntry {
  readonly count: number;
  readonly resetAt: number;
}

interface RateLimiterOptions {
  readonly windowMs: number;
  readonly maxRequests: number;
}

const CLEANUP_INTERVAL_MS = 60_000;

export function rateLimiter(options: RateLimiterOptions) {
  const { windowMs, maxRequests } = options;
  const store = new Map<string, RateLimitEntry>();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the process to exit without waiting for the cleanup timer
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (existing.count >= maxRequests) {
      throw new AppError(429, 'Too many requests, please try again later');
    }

    store.set(key, { ...existing, count: existing.count + 1 });
    next();
  };
}
