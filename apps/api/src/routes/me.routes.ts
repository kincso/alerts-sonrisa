import { Router } from 'express';
import type { DeliveryView } from '@alerts/shared';
import { currentUser } from '../auth/auth.middleware.ts';
import type { Db } from '../db/database.ts';
import { listUserDeliveries } from '../db/deliveries.ts';

/** GET /me and /me/deliveries (A17). Mount after `authenticate`. */
export function meRoutes(db: Db): Router {
  const router = Router();
  router.get('/me', (req, res) => {
    res.json(currentUser(req));
  });
  router.get('/me/deliveries', (req, res) => {
    const body: DeliveryView[] = listUserDeliveries(db, currentUser(req).id);
    res.json(body);
  });
  return router;
}
