import { describe, expect, it } from 'vitest';
import type { Event } from '@alerts/shared';
import { matchAlert, type MatchableAlert } from './match-alert.ts';

const alert = (over: Partial<MatchableAlert> = {}): MatchableAlert => ({
  sourceId: 'usgs',
  keywords: [],
  minSeverity: 'medium',
  ...over,
});

const event = (over: Partial<Event> = {}): Event => ({
  id: 'e1',
  sourceId: 'usgs',
  sourceEventId: 'us1',
  title: 'M 5.1 - Earthquake near Lima, Peru',
  summary: 'Magnitude 5.1 at a depth of 10 km.',
  severity: 'medium',
  occurredAt: '2026-10-18T10:00:00.000Z',
  receivedAt: '2026-10-18T10:01:00.000Z',
  ...over,
});

describe('matchAlert', () => {
  // testing.md S3-1
  it('matches any event from the source when there are no keywords', () => {
    expect(matchAlert(alert(), event())).toBe(true);
  });

  // testing.md S3-2
  it('finds a keyword case-insensitively in the title or the summary', () => {
    expect(matchAlert(alert({ keywords: ['QUAKE'] }), event())).toBe(true);
    expect(matchAlert(alert({ keywords: ['depth'] }), event())).toBe(true);
  });

  // testing.md S3-3
  it('needs only one of several keywords (any-of, D8)', () => {
    expect(matchAlert(alert({ keywords: ['flood', 'quake'] }), event())).toBe(true);
    expect(matchAlert(alert({ keywords: ['flood', 'storm'] }), event())).toBe(false);
  });

  // testing.md S3-4
  it('requires severity at or above the minimum (A1)', () => {
    const min = alert({ minSeverity: 'medium' });
    expect(matchAlert(min, event({ severity: 'low' }))).toBe(false);
    expect(matchAlert(min, event({ severity: 'medium' }))).toBe(true);
    expect(matchAlert(min, event({ severity: 'high' }))).toBe(true);
  });

  // testing.md S3-5
  it('never matches an event from another source', () => {
    expect(matchAlert(alert({ keywords: ['quake'] }), event({ sourceId: 'bbc' }))).toBe(false);
  });
});
