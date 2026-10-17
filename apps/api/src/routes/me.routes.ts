import { Router } from 'express';
import { currentUser } from '../auth/auth.middleware.ts';

/** GET /me. Mount after `authenticate`. */
export function meRoutes(): Router {
  const router = Router();
  router.get('/me', (req, res) => {
    res.json(currentUser(req));
  });
  return router;
}
