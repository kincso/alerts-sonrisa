import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ApiError, User } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { findUser } from '../db/users.ts';

/** The only place identity is resolved (A8): X-User-Id → req.user, unknown → 401. */
export function authenticate(db: Db): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.header('X-User-Id');
    const user = id ? findUser(db, id) : undefined;
    if (!user) {
      const body: ApiError = { message: 'Unknown or missing user. Pick a user in "Acting as".' };
      res.status(401).json(body);
      return;
    }
    req.user = user;
    next();
  };
}

/** For handlers mounted after `authenticate`. Throws if that order is broken. */
export function currentUser(req: Request): User {
  if (!req.user) throw new Error('currentUser() called on a route without authenticate()');
  return req.user;
}
