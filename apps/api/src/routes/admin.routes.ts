import { Router } from 'express';
import type { ApiError } from '@alerts/shared';
import { requireAdmin } from '../auth/require-admin.ts';
import type { Poller } from '../poller/poller.ts';
import type { SourceRegistry } from '../sources/registry.ts';

/** /admin/... (A9). Mount after `authenticate`; every route needs requireAdmin. */
export function adminRoutes(sources: SourceRegistry, poller: Poller): Router {
  const router = Router();
  router.use('/admin', requireAdmin);

  // "Poll now" (plan-v2 S2, decisions.md S2-4): a disabled source comes back 'skipped'.
  router.post('/admin/sources/:id/poll', async (req, res) => {
    const source = sources.get(req.params.id);
    if (!source) {
      const body: ApiError = { message: 'Source not found.' };
      res.status(404).json(body);
      return;
    }
    res.json(await poller.pollSource(source));
  });

  return router;
}
