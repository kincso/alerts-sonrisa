import { XMLParser } from 'fast-xml-parser';
import type { Severity } from '@alerts/shared';
import { isRecord } from '../util/is-record.ts';
import { fetchText, type NewEvent, type Source } from './source.ts';

const FEED_URL = 'https://feeds.bbci.co.uk/news/world/rss.xml';

/** News has no severity signal yet (D1); set only in this adapter. */
const NEWS_SEVERITY: Severity = 'medium';

// Attributes (e.g. guid isPermaLink) are ignored, so <guid> parses to its text.
// Values stay strings (no number parsing), and `item` is always an array.
const parser = new XMLParser({ parseTagValue: false, isArray: (name) => name === 'item' });

function textOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The guid's `#n` suffix changes when a story is updated (F6, testing.md S2-12), so it
 * is dropped: an updated story keeps its id and is not sent again (DS9, revised).
 */
function withoutSuffix(guid: string): string {
  const hash = guid.indexOf('#');
  return hash === -1 ? guid : guid.slice(0, hash);
}

/** One RSS item → event, or undefined if guid, title or date is missing (design.md §6). */
function toEvent(item: unknown): NewEvent | undefined {
  if (!isRecord(item)) return undefined;
  const guid = textOf(item['guid']);
  const title = textOf(item['title']);
  const pubDate = textOf(item['pubDate']);
  const time = pubDate === undefined ? NaN : Date.parse(pubDate);
  if (!guid || !title || Number.isNaN(time)) return undefined;
  return {
    sourceEventId: withoutSuffix(guid),
    title,
    summary: textOf(item['description']) ?? '',
    url: textOf(item['link']),
    severity: NEWS_SEVERITY,
    occurredAt: new Date(time).toISOString(),
  };
}

function normalise(raw: string): NewEvent[] {
  const doc: unknown = parser.parse(raw);
  const channel = isRecord(doc) && isRecord(doc['rss']) ? doc['rss']['channel'] : undefined;
  if (!isRecord(channel)) throw new Error('BBC feed is not an RSS channel');
  const items = channel['item'] ?? [];
  if (!Array.isArray(items)) throw new Error('BBC feed items could not be read');
  return items.map(toEvent).filter((e): e is NewEvent => e !== undefined);
}

export const bbcSource: Source = {
  id: 'bbc',
  label: 'BBC World News',
  fixedSeverity: NEWS_SEVERITY,
  fetchRaw: (signal) => fetchText(FEED_URL, signal),
  normalise,
};
