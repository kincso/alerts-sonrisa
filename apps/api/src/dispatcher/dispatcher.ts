import type { DeliveryView, Event } from '@alerts/shared';
import { deliver } from '../channels/deliver.ts';
import type { Notification } from '../channels/notification-channel.ts';
import type { ChannelRegistry } from '../channels/registry.ts';
import { activeAlertsForSource, type OwnedAlert } from '../db/alerts.ts';
import { enabledChannelTypes } from '../db/channel-types.ts';
import { findConnection } from '../db/connections.ts';
import type { Db } from '../db/database.ts';
import { claimAlertDelivery, findDeliveryView } from '../db/deliveries.ts';
import { findSource } from '../db/sources.ts';
import { matchAlert } from '../matcher/match-alert.ts';
import { isAfterBaseline } from '../sources/baseline.ts';
import { SEND_TIMEOUT_MS } from '../util/with-timeout.ts';

export interface Dispatcher {
  /**
   * Sends every new match once (A6, A7) and returns only the deliveries this call
   * created. Never throws for a failed send; that delivery is logged 'failed'.
   */
  dispatch(events: readonly Event[]): Promise<DeliveryView[]>;
}

/** A claimed delivery row and what to send to it. */
interface Job {
  deliveryId: string;
  send(): Promise<unknown>;
}

function notificationFor(event: Event, alert: OwnedAlert, sourceLabel: string): Notification {
  return {
    title: event.title,
    summary: event.summary,
    url: event.url,
    sourceLabel,
    occurredAt: event.occurredAt,
    alertName: alert.name,
  };
}

/** Knows only `NotificationChannel` and the registry, never a specific channel. */
export function createDispatcher(
  db: Db,
  channels: ChannelRegistry,
  { timeoutMs = SEND_TIMEOUT_MS } = {},
): Dispatcher {
  /** Claims a row per (matching alert, enabled connection); a conflict = already sent. */
  function claimJobs(event: Event): Job[] {
    const source = findSource(db, event.sourceId);
    if (!source?.enabled || !isAfterBaseline(event, source.enabledAt)) return [];
    const enabledTypes = enabledChannelTypes(db);
    const jobs: Job[] = [];
    for (const alert of activeAlertsForSource(db, event.sourceId)) {
      if (!matchAlert(alert, event)) continue;
      for (const connectionId of alert.connectionIds) {
        const connection = findConnection(db, alert.userId, connectionId);
        const channel = connection && channels.get(connection.type);
        if (!connection || !channel || !enabledTypes.has(connection.type)) continue;
        const deliveryId = claimAlertDelivery(db, {
          userId: alert.userId,
          alert,
          eventId: event.id,
          connection,
        });
        if (!deliveryId) continue;
        const notification = notificationFor(event, alert, source.label);
        jobs.push({
          deliveryId,
          send: () => deliver(db, deliveryId, channel, notification, connection.config, timeoutMs),
        });
      }
    }
    return jobs;
  }

  async function dispatch(events: readonly Event[]): Promise<DeliveryView[]> {
    const jobs = events.flatMap(claimJobs);
    await Promise.all(
      jobs.map((job) =>
        // deliver() only throws if recording the result fails; the row stays 'pending'.
        job.send().catch((err: unknown) => console.error('Could not record a delivery:', err)),
      ),
    );
    return jobs
      .map((job) => findDeliveryView(db, job.deliveryId))
      .filter((d): d is DeliveryView => d !== undefined);
  }

  return { dispatch };
}
