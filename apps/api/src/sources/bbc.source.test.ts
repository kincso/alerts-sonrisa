import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bbcSource } from './bbc.source.ts';

const fixture = readFileSync(new URL('./fixtures/bbc-world.xml', import.meta.url), 'utf8');

function rss(items: string): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>T</title>${items}</channel></rss>`;
}

// testing.md S2-3
describe('bbcSource.normalise', () => {
  it('maps an item to an event', () => {
    const [first] = bbcSource.normalise(fixture);

    expect(first).toEqual({
      sourceEventId: 'https://www.bbc.co.uk/news/articles/c6d937wedj7jo#0',
      title:
        'Violent clashes, looting and buildings ablaze in France as over 1,000 arrested after protests',
      summary:
        'Disorder broke out in cities across the country on a day in which more than half a million joined cost of living protests.',
      url: 'https://www.bbc.co.uk/news/articles/c6d937wedj7jo?at_medium=RSS&at_campaign=rss',
      severity: 'medium',
      occurredAt: '2026-10-17T20:52:17.000Z',
    });
  });

  it('gives every item severity medium (D1)', () => {
    const severities = new Set(bbcSource.normalise(fixture).map((e) => e.severity));
    expect([...severities]).toEqual(['medium']);
  });

  it('keeps the full guid, #n suffix included (DS9)', () => {
    const ids = bbcSource.normalise(fixture).map((e) => e.sourceEventId);
    expect(ids).toContain('https://www.bbc.co.uk/news/articles/cqe9lx54g7x9o#1');
  });

  // testing.md S2-4
  it('skips the item without a guid and keeps the rest', () => {
    const events = bbcSource.normalise(fixture);
    expect(events).toHaveLength(5);
    expect(events.map((e) => e.title)).not.toContain('Hand-made: item without a guid');
  });

  it('skips an item with an unreadable date', () => {
    const events = bbcSource.normalise(
      rss(`<item><title>A</title><guid>a</guid><pubDate>not a date</pubDate></item>
           <item><title>B</title><guid>b</guid><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item>`),
    );
    expect(events.map((e) => e.sourceEventId)).toEqual(['b']);
  });

  it('reads a feed with a single item', () => {
    const events = bbcSource.normalise(
      rss(
        '<item><title>A</title><guid>a</guid><pubDate>Sat, 17 Oct 2026 12:00:00 GMT</pubDate></item>',
      ),
    );
    expect(events).toHaveLength(1);
  });

  it('throws when the feed is not RSS', () => {
    expect(() => bbcSource.normalise('{"not":"xml"}')).toThrow();
    expect(() => bbcSource.normalise('<html><body>Oops</body></html>')).toThrow();
  });
});
