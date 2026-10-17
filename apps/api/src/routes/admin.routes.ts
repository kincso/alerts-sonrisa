import { Router } from 'express';
import {
  SEVERITIES,
  type ApiError,
  type Event,
  type FieldErrors,
  type SimulateEventResult,
} from '@alerts/shared';
import { requireAdmin } from '../auth/require-admin.ts';
import { newId, now, type Db } from '../db/database.ts';
import { findEventBySourceEventId, insertNewEvents } from '../db/events.ts';
import type { Dispatcher } from '../dispatcher/dispatcher.ts';
import type { Poller } from '../poller/poller.ts';
import type { SourceRegistry } from '../sources/registry.ts';
import type { NewEvent } from '../sources/source.ts';
import { isRecord } from '../util/is-record.ts';
import { sendFieldErrors } from './respond.ts';

export interface AdminDeps {
  db: Db;
  sources: SourceRegistry;
  poller: Poller;
  dispatcher: Dispatcher;
}

type ParsedSimulation =
  { ok: true; sourceId: string; event: NewEvent } | { ok: false; fieldErrors: FieldErrors };

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Any severity, also for BBC (decisions.md S3-2); `occurredAt` = now, so D7 passes. */
function parseSimulation(body: unknown, sources: SourceRegistry): ParsedSimulation {
  const raw = isRecord(body) ? body : {};
  const sourceId = asString(raw['sourceId']);
  const title = asString(raw['title']);
  const severity = SEVERITIES.find((s) => s === raw['severity']);
  const fieldErrors: FieldErrors = {};
  if (!sources.get(sourceId)) fieldErrors['sourceId'] = 'Choose a source.';
  if (!title) fieldErrors['title'] = 'Title is required.';
  if (!severity) fieldErrors['severity'] = 'Choose a severity.';
  if (!severity || Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };
  return {
    ok: true,
    sourceId,
    event: {
      sourceEventId: asString(raw['sourceEventId']) || `sim-${newId()}`,
      title,
      summary: asString(raw['summary']),
      severity,
      occurredAt: now(),
    },
  };
}

/** Stores the event, or finds the one already stored for its sourceEventId (S3-1). */
function storeOrFind(db: Db, sourceId: string, event: NewEvent): Event {
  const [inserted] = insertNewEvents(db, sourceId, [event]);
  const stored = inserted ?? findEventBySourceEventId(db, sourceId, event.sourceEventId);
  if (!stored) throw new Error('Simulated event was neither inserted nor found');
  return stored;
}

/** /admin/... (A9). Mount after `authenticate`; every route needs requireAdmin. */
export function adminRoutes({ db, sources, poller, dispatcher }: AdminDeps): Router {
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

  // A18: the same path as a polled event, from dedupe on. Reusing a sourceEventId
  // re-dispatches the stored event; the delivery dedupe stops any resend (S3-1).
  router.post('/admin/simulate-event', async (req, res) => {
    const parsed = parseSimulation(req.body, sources);
    if (!parsed.ok) return sendFieldErrors(res, parsed.fieldErrors);
    const event = storeOrFind(db, parsed.sourceId, parsed.event);
    const body: SimulateEventResult = { event, deliveries: await dispatcher.dispatch([event]) };
    res.json(body);
  });

  return router;
}
