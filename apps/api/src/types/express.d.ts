import type { User } from '@alerts/shared';

declare global {
  namespace Express {
    interface Request {
      /** Set only by the auth middleware (A8). Read it through `currentUser(req)`. */
      user?: User;
    }
  }
}

export {};
