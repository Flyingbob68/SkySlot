/**
 * Augment the Express Request interface so that authentication middleware
 * can attach the authenticated user without type casts elsewhere.
 */

declare global {
  namespace Express {
    interface Request {
      user?: {
        readonly id: string;
        readonly email: string;
        readonly roles: readonly string[];
        readonly permissions: readonly string[];
      };
    }
  }
}

export {};
