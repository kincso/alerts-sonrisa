import type { NextFunction, Request, Response } from 'express';
import type { ApiError } from '@alerts/shared';
import { currentUser } from './auth.middleware.ts';

/** The only admin check (A8). The web adminGuard just hides the route. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (currentUser(req).role !== 'admin') {
    const body: ApiError = { message: 'Admins only.' };
    res.status(403).json(body);
    return;
  }
  next();
}
