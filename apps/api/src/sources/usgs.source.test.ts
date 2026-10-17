import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { magnitudeToSeverity, usgsSource } from './usgs.source.ts';

const fixture = readFileSync(new URL('./fixtures/usgs-2.5_day.json', import.meta.url), 'utf8');

function feed(features: unknown[]): string {
  return JSON.stringify({ type: 'FeatureCollection', features });
}

function quake(id: string, mag: number | null): unknown {
  return {
    id,
    properties: { mag, place: 'Somewhere', time: 0, url: 'https://x', title: `M ${mag}` },
    geometry: { coordinates: [0, 0, 10] },
  };
}

// testing.md S2-1
describe('usgsSource.normalise', () => {
  it('maps a feature to an event', () => {
    const [first] = usgsSource.normalise(fixture);

    expect(first).toEqual({
      sourceEventId: 'nc75451211',
      title: 'M 2.6 - 18 km WSW of Petrolia, CA',
      summary: 'Magnitude 2.59 at a depth of 7.3 km, 18 km WSW of Petrolia, CA.',
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/nc75451211',
      severity: 'low',
      occurredAt: new Date(1792273382290).toISOString(),
    });
  });

  it('keeps the real items and skips the one with no magnitude', () => {
    const ids = usgsSource.normalise(fixture).map((e) => e.sourceEventId);
    expect(ids).toEqual(['nc75451211', 'aka2026upisja', 'uu80160531', 'hv75059771']);
  });

  // testing.md S2-4
  it('skips a malformed feature and keeps the rest', () => {
    const events = usgsSource.normalise(feed([{ id: 'broken' }, quake('ok', 5)]));
    expect(events.map((e) => e.sourceEventId)).toEqual(['ok']);
  });

  it('throws when the feed is not a GeoJSON feature list', () => {
    expect(() => usgsSource.normalise('<html>')).toThrow();
    expect(() => usgsSource.normalise('{"type":"Feature"}')).toThrow();
  });
});

// testing.md S2-2, decisions.md DS10
describe('magnitudeToSeverity', () => {
  it.each([
    [2.5, 'low'],
    [4.49, 'low'],
    [4.5, 'medium'],
    [5.99, 'medium'],
    [6, 'high'],
    [8.2, 'high'],
  ] as const)('M %s → %s', (mag, severity) => {
    expect(magnitudeToSeverity(mag)).toBe(severity);
  });

  it('skips a feature whose magnitude is null', () => {
    expect(usgsSource.normalise(feed([quake('none', null)]))).toEqual([]);
  });
});
