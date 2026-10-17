import { Router } from 'express';
import type { ApiError, UserSummary } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { findPreview } from '../db/previews.ts';
import { listUsers } from '../db/users.ts';

/** Mounted before `authenticate`: the switcher list (DS6) and email previews (DS7). */
export function publicRoutes(db: Db): Router {
  const router = Router();

  router.get('/users', (_req, res) => {
    const body: UserSummary[] = listUsers(db);
    res.json(body);
  });

  router.get('/previews/:id', (req, res) => {
    const preview = findPreview(db, req.params.id);
    if (!preview) {
      const body: ApiError = { message: 'Preview not found.' };
      res.status(404).json(body);
      return;
    }
    res.type('html').send(preview.html);
  });

  return router;
}
