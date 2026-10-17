import type { PollResult } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { insertNewEvents } from '../db/events.ts';
import { findSource, recordPoll } from '../db/sources.ts';
import type { SourceRegistry } from '../sources/registry.ts';
import type { Source } from '../sources/source.ts';
import { withTimeout } from '../util/with-timeout.ts';

export const POLL_TIMEOUT_MS = 10_000;

export interface Poller {
  /** One cycle for one source. Never throws: failures come back as status 'failed'. */
  pollSource(source: Source): Promise<PollResult>;
  pollAll(): Promise<PollResult[]>;
  /** Polls now and then every `intervalMs` (A5). Returns a stop function. */
  start(intervalMs: number): () => void;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Knows only the `Source` interface; which sources exist comes from the registry. */
export function createPoller(
  db: Db,
  sources: SourceRegistry,
  { timeoutMs = POLL_TIMEOUT_MS } = {},
): Poller {
  const running = new Set<string>();
  const skipped = (sourceId: string): PollResult => ({
    sourceId,
    status: 'skipped',
    fetched: 0,
    inserted: 0,
  });

  async function fetchAndStore(source: Source): Promise<PollResult> {
    try {
      const raw = await withTimeout((signal) => source.fetchRaw(signal), timeoutMs);
      const events = source.normalise(raw);
      const inserted = insertNewEvents(db, source.id, events);
      recordPoll(db, source.id, null);
      return {
        sourceId: source.id,
        status: 'ok',
        fetched: events.length,
        inserted: inserted.length,
      };
    } catch (err) {
      const error = errorMessage(err);
      recordPoll(db, source.id, error);
      return { sourceId: source.id, status: 'failed', fetched: 0, inserted: 0, error };
    }
  }

  async function pollSource(source: Source): Promise<PollResult> {
    if (!findSource(db, source.id)?.enabled || running.has(source.id)) return skipped(source.id);
    running.add(source.id);
    try {
      return await fetchAndStore(source);
    } finally {
      running.delete(source.id);
    }
  }

  const pollAll = () => Promise.all(sources.all().map(pollSource));

  function start(intervalMs: number): () => void {
    const tick = () => {
      // pollSource doesn't throw; this only guards against a DB error in recordPoll.
      pollAll().catch((err: unknown) => console.error('Poll cycle failed:', err));
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }

  return { pollSource, pollAll, start };
}
