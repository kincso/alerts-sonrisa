import type { Router } from 'express';
import type {
  AdminAlertView,
  AdminDeliveryView,
  ChannelTypeSummary,
  EnabledPatch,
  SourceHealth,
} from '@alerts/shared';
import type { ChannelRegistry } from '../channels/registry.ts';
import { listAllAlerts } from '../db/alerts.ts';
import { listChannelTypes, setChannelTypeEnabled } from '../db/channel-types.ts';
import type { Db } from '../db/database.ts';
import { listAllDeliveries } from '../db/deliveries.ts';
import {
  findSourceHealth,
  listSourceHealth,
  setSourceEnabled,
  type SourceHealthRow,
} from '../db/sources.ts';
import type { SourceRegistry } from '../sources/registry.ts';
import { isRecord } from '../util/is-record.ts';
import { sendFieldErrors, sendNotFound } from './respond.ts';

export interface AdminViewDeps {
  db: Db;
  sources: SourceRegistry;
  channels: ChannelRegistry;
}

function parseEnabledPatch(body: unknown): EnabledPatch | undefined {
  const enabled = isRecord(body) ? body['enabled'] : undefined;
  return typeof enabled === 'boolean' ? { enabled } : undefined;
}

const ENABLED_ERROR = { enabled: 'Must be true or false.' };

/**
 * The admin's read-only views and on/off switches (A9, plan-v2 S4). `router` must
 * already run requireAdmin for /admin.
 */
export function addAdminViewRoutes(router: Router, { db, sources, channels }: AdminViewDeps): void {
  const toHealth = (row: SourceHealthRow): SourceHealth => {
    const fixedSeverity = sources.get(row.id)?.fixedSeverity;
    return fixedSeverity ? { ...row, fixedSeverity } : row;
  };

  /** Registered channel types only, in registry order. */
  const channelTypes = (): ChannelTypeSummary[] => {
    const enabled = new Map(listChannelTypes(db).map((t) => [t.type, t.enabled]));
    return channels
      .all()
      .filter((c) => enabled.has(c.type))
      .map((c) => ({ type: c.type, label: c.label, enabled: enabled.get(c.type) === true }));
  };

  router.get('/admin/alerts', (_req, res) => {
    const body: AdminAlertView[] = listAllAlerts(db);
    res.json(body);
  });

  router.get('/admin/deliveries', (_req, res) => {
    const body: AdminDeliveryView[] = listAllDeliveries(db);
    res.json(body);
  });

  router.get('/admin/sources', (_req, res) => {
    const body: SourceHealth[] = listSourceHealth(db)
      .filter((row) => sources.get(row.id))
      .map(toHealth);
    res.json(body);
  });

  router.patch('/admin/sources/:id', (req, res) => {
    const id = req.params.id;
    if (!sources.get(id)) return sendNotFound(res, 'Source not found.');
    const patch = parseEnabledPatch(req.body);
    if (!patch) return sendFieldErrors(res, ENABLED_ERROR);
    setSourceEnabled(db, id, patch.enabled);
    const row = findSourceHealth(db, id);
    if (!row) return sendNotFound(res, 'Source not found.');
    res.json(toHealth(row));
  });

  router.get('/admin/channels', (_req, res) => {
    res.json(channelTypes());
  });

  router.patch('/admin/channels/:type', (req, res) => {
    const type = req.params.type;
    if (!channels.get(type)) return sendNotFound(res, 'Channel type not found.');
    const patch = parseEnabledPatch(req.body);
    if (!patch) return sendFieldErrors(res, ENABLED_ERROR);
    if (!setChannelTypeEnabled(db, type, patch.enabled)) {
      return sendNotFound(res, 'Channel type not found.');
    }
    res.json(channelTypes().find((t) => t.type === type));
  });
}
