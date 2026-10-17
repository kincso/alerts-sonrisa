import type { Event } from '@alerts/shared';

/**
 * D7: events that happened before the source was (re-)enabled are stored but never
 * matched, so enabling a source doesn't flood users with old items. Used by the
 * matcher step in S3.
 */
export function isAfterBaseline(event: Pick<Event, 'occurredAt'>, enabledAt: string): boolean {
  return Date.parse(event.occurredAt) >= Date.parse(enabledAt);
}
