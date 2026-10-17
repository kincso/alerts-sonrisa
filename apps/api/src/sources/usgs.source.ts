import type { Severity } from '@alerts/shared';
import { isRecord } from '../util/is-record.ts';
import { fetchText, type NewEvent, type Source } from './source.ts';

const FEED_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';

/** Band edges from decisions.md DS10. */
export function magnitudeToSeverity(mag: number): Severity {
  if (mag >= 6) return 'high';
  if (mag >= 4.5) return 'medium';
  return 'low';
}

function summaryOf(mag: number, depthKm: number, place: string): string {
  return `Magnitude ${mag} at a depth of ${depthKm.toFixed(1)} km, ${place}.`;
}

/** One GeoJSON feature → event, or undefined if a field is missing (design.md §6). */
function toEvent(feature: unknown): NewEvent | undefined {
  if (!isRecord(feature) || !isRecord(feature['properties']) || !isRecord(feature['geometry'])) {
    return undefined;
  }
  const { id } = feature;
  const { mag, place, time, url, title } = feature['properties'];
  const coordinates = feature['geometry']['coordinates'];
  const depth = Array.isArray(coordinates) ? coordinates[2] : undefined;
  if (typeof id !== 'string' || typeof title !== 'string' || typeof place !== 'string') {
    return undefined;
  }
  // USGS can publish a quake before its magnitude is known; it can't be banded yet.
  if (typeof mag !== 'number' || typeof time !== 'number' || typeof depth !== 'number') {
    return undefined;
  }
  return {
    sourceEventId: id,
    title,
    summary: summaryOf(mag, depth, place),
    url: typeof url === 'string' ? url : undefined,
    severity: magnitudeToSeverity(mag),
    occurredAt: new Date(time).toISOString(),
  };
}

function normalise(raw: string): NewEvent[] {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed['features'])) {
    throw new Error('USGS feed has no "features" list');
  }
  return parsed['features'].map(toEvent).filter((e): e is NewEvent => e !== undefined);
}

export const usgsSource: Source = {
  id: 'usgs',
  label: 'USGS earthquakes',
  fetchRaw: (signal) => fetchText(FEED_URL, signal),
  normalise,
};
