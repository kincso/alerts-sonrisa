import { Router } from 'express';
import type { ApiError, SourceSummary, User } from '@alerts/shared';
import { currentUser } from '../auth/auth.middleware.ts';
import {
  deleteAlert,
  findAlert,
  insertAlert,
  listAlerts,
  setAlertActive,
  updateAlert,
  withoutOwner,
} from '../db/alerts.ts';
import { findConnection } from '../db/connections.ts';
import type { Db } from '../db/database.ts';
import { listSources } from '../db/sources.ts';
import type { SourceRegistry } from '../sources/registry.ts';
import { isRecord } from '../util/is-record.ts';
import { parseAlertInput, type AlertInputChecks } from './alert-input.ts';
import { sendFieldErrors, sendNotFound } from './respond.ts';

const NOT_FOUND = 'Alert not found.';

/** GET /sources and /me/alerts (A1, A14). Mount after `authenticate`. */
export function alertRoutes(db: Db, sources: SourceRegistry): Router {
  const router = Router();

  const checksFor = (user: User): AlertInputChecks => ({
    sourceExists: (id) => sources.get(id) !== undefined,
    ownsConnection: (id) => findConnection(db, user.id, id) !== undefined,
  });

  // Every source, also disabled ones: the form labels them (decisions.md S3-5).
  router.get('/sources', (_req, res) => {
    const body: SourceSummary[] = listSources(db)
      .filter((row) => sources.get(row.id))
      .map(({ id, label, enabled }) => {
        const fixedSeverity = sources.get(id)?.fixedSeverity;
        return fixedSeverity ? { id, label, enabled, fixedSeverity } : { id, label, enabled };
      });
    res.json(body);
  });

  router.get('/me/alerts', (req, res) => {
    res.json(listAlerts(db, currentUser(req).id).map(withoutOwner));
  });

  router.post('/me/alerts', (req, res) => {
    const user = currentUser(req);
    const parsed = parseAlertInput(req.body, checksFor(user));
    if (!parsed.ok) return sendFieldErrors(res, parsed.fieldErrors);
    res.status(201).json(withoutOwner(insertAlert(db, user.id, parsed.input)));
  });

  router.put('/me/alerts/:id', (req, res) => {
    const user = currentUser(req);
    const existing = findAlert(db, user.id, req.params.id);
    if (!existing) return sendNotFound(res, NOT_FOUND);
    const parsed = parseAlertInput(req.body, checksFor(user));
    if (!parsed.ok) return sendFieldErrors(res, parsed.fieldErrors);
    res.json(withoutOwner(updateAlert(db, existing, parsed.input)));
  });

  router.patch('/me/alerts/:id', (req, res) => {
    const existing = findAlert(db, currentUser(req).id, req.params.id);
    if (!existing) return sendNotFound(res, NOT_FOUND);
    const active = isRecord(req.body) ? req.body['active'] : undefined;
    if (typeof active !== 'boolean') {
      const body: ApiError = { message: '"active" must be true or false.' };
      res.status(400).json(body);
      return;
    }
    res.json(withoutOwner(setAlertActive(db, existing, active)));
  });

  router.delete('/me/alerts/:id', (req, res) => {
    const existing = findAlert(db, currentUser(req).id, req.params.id);
    if (!existing) return sendNotFound(res, NOT_FOUND);
    deleteAlert(db, existing.id);
    res.status(204).end();
  });

  return router;
}
