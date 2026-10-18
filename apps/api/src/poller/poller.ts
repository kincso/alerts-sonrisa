import type { Event, PollResult } from '@alerts/shared';
import type { Db } from '../db/database.ts';
import { insertNewEvents } from '../db/events.ts';
import { findSource, recordPoll } from '../db/sources.ts';
import type { SourceRegistry } from '../sources/registry.ts';
import type { Source } from '../sources/source.ts';
import { withTimeout } from '../util/with-timeout.ts';

export const POLL_TIMEOUT_MS = 10_000;

export interface PollerOptions {
  timeoutMs?: number;
  /** Gets each poll's newly stored events; server.ts passes the dispatcher. */
  onNewEvents?: (events: Event[]) => Promise<unknown>;
}

export interface Poller {
  /**
   * One cycle for one source. Failures come back as status 'failed'; only a DB error in the
   * enabled check before the cycle starts can reject.
   */
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
  { timeoutMs = POLL_TIMEOUT_MS, onNewEvents }: PollerOptions = {},
): Poller {
  const running = new Set<string>();
  const skipped = (sourceId: string): PollResult => ({
    sourceId,
    status: 'skipped',
    fetched: 0,
    inserted: 0,
  });

  async function fetchAndStore(source: Source): Promise<{ result: PollResult; inserted: Event[] }> {
    try {
      const raw = await withTimeout((signal) => source.fetchRaw(signal), timeoutMs);
      const events = source.normalise(raw);
      const inserted = insertNewEvents(db, source.id, events);
      recordPoll(db, source.id, null);
      const result: PollResult = {
        sourceId: source.id,
        status: 'ok',
        fetched: events.length,
        inserted: inserted.length,
      };
      return { result, inserted };
    } catch (err) {
      const error = errorMessage(err);
      recordFailure(source.id, error);
      const result: PollResult = {
        sourceId: source.id,
        status: 'failed',
        fetched: 0,
        inserted: 0,
        error,
      };
      return { result, inserted: [] };
    }
  }

  /** Recording the failure can fail too (DB gone, S2 review m2): logged, so the cycle still ends. */
  function recordFailure(sourceId: string, error: string): void {
    try {
      recordPoll(db, sourceId, error);
    } catch (recordErr) {
      console.error(`Could not record the failed poll of ${sourceId}:`, recordErr);
    }
  }

  /** A dispatch problem is not a source problem: it is logged and the poll stays 'ok'. */
  async function notify(sourceId: string, events: Event[]): Promise<void> {
    if (events.length === 0 || !onNewEvents) return;
    try {
      await onNewEvents(events);
    } catch (err) {
      console.error(`Dispatch after polling ${sourceId} failed:`, err);
    }
  }

  async function pollSource(source: Source): Promise<PollResult> {
    if (!findSource(db, source.id)?.enabled || running.has(source.id)) return skipped(source.id);
    running.add(source.id);
    try {
      const { result, inserted } = await fetchAndStore(source);
      await notify(source.id, inserted);
      return result;
    } finally {
      running.delete(source.id);
    }
  }

  const pollAll = () => Promise.all(sources.all().map(pollSource));

  function start(intervalMs: number): () => void {
    const tick = () => {
      // Only guards against a DB error in pollSource's enabled check.
      pollAll().catch((err: unknown) => console.error('Poll cycle failed:', err));
    };
    tick();
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }

  return { pollSource, pollAll, start };
}
