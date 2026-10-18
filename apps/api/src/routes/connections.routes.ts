import { Router } from 'express';
import type {
  ChannelConnection,
  ChannelDescriptor,
  ConnectionInUseError,
  SendResult,
  User,
} from '@alerts/shared';
import { currentUser } from '../auth/auth.middleware.ts';
import type { ChannelRegistry } from '../channels/registry.ts';
import { sendTest } from '../channels/send-test.ts';
import { alertsUsingConnection } from '../db/alerts.ts';
import { enabledChannelTypes } from '../db/channel-types.ts';
import {
  deleteConnection,
  findConnection,
  insertConnection,
  listConnections,
  updateConnection,
} from '../db/connections.ts';
import type { Db } from '../db/database.ts';
import { parseConnectionInput } from './connection-input.ts';
import { sendFieldErrors, sendNotFound } from './respond.ts';

const NOT_FOUND = 'Connection not found.';

/** GET /channels and /me/connections (A12, A13, A18). Mount after `authenticate`. */
export function connectionRoutes(db: Db, channels: ChannelRegistry): Router {
  const router = Router();

  const findEnabledChannel = (type: string) =>
    enabledChannelTypes(db).has(type) ? channels.get(type) : undefined;

  const findOwn = (user: User, id: string): ChannelConnection | undefined =>
    findConnection(db, user.id, id);

  router.get('/channels', (_req, res) => {
    const enabled = enabledChannelTypes(db);
    const body: ChannelDescriptor[] = channels
      .all()
      .filter((c) => enabled.has(c.type))
      .map(({ type, label, fields }) => ({ type, label, fields }));
    res.json(body);
  });

  router.get('/me/connections', (req, res) => {
    res.json(listConnections(db, currentUser(req).id));
  });

  router.post('/me/connections', (req, res) => {
    const parsed = parseConnectionInput(req.body, findEnabledChannel);
    if (!parsed.ok) return sendFieldErrors(res, parsed.fieldErrors);
    res.status(201).json(insertConnection(db, currentUser(req).id, parsed.input));
  });

  router.put('/me/connections/:id', (req, res) => {
    const existing = findOwn(currentUser(req), req.params.id);
    if (!existing) return sendNotFound(res, NOT_FOUND);
    // Any registered type: a connection stays editable while an admin has its channel off.
    const parsed = parseConnectionInput(req.body, (type) => channels.get(type));
    if (!parsed.ok) return sendFieldErrors(res, parsed.fieldErrors);
    if (parsed.input.type !== existing.type) {
      return sendFieldErrors(res, { type: 'The channel of a connection cannot change.' });
    }
    res.json(updateConnection(db, existing, parsed.input));
  });

  router.delete('/me/connections/:id', (req, res) => {
    const existing = findOwn(currentUser(req), req.params.id);
    if (!existing) return sendNotFound(res, NOT_FOUND);
    // D6, DS4: alerts never lose a target silently; the user unlinks it first.
    const alerts = alertsUsingConnection(db, existing.id);
    if (alerts.length > 0) {
      const body: ConnectionInUseError = {
        message: `"${existing.label}" is used by: ${alerts.map((a) => a.name).join(', ')}.`,
        alerts,
      };
      res.status(409).json(body);
      return;
    }
    deleteConnection(db, existing.id);
    res.status(204).end();
  });

  router.post('/me/connections/:id/test', async (req, res) => {
    const user = currentUser(req);
    const connection = findOwn(user, req.params.id);
    if (!connection) return sendNotFound(res, NOT_FOUND);
    const channel = findEnabledChannel(connection.type);
    const result: SendResult = channel
      ? await sendTest(db, user.id, connection, channel)
      : { status: 'failed', error: 'Channel disabled by admin.' };
    res.json(result);
  });

  return router;
}
