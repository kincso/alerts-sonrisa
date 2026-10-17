import { describe, expect, it } from 'vitest';
import { isAfterBaseline } from './baseline.ts';

const enabledAt = '2026-10-17T12:00:00.000Z';

// testing.md S2-5, D7
describe('isAfterBaseline', () => {
  it('rejects an event from before the source was enabled', () => {
    expect(isAfterBaseline({ occurredAt: '2026-10-17T11:59:59.999Z' }, enabledAt)).toBe(false);
  });

  it('accepts an event at the exact moment it was enabled', () => {
    expect(isAfterBaseline({ occurredAt: enabledAt }, enabledAt)).toBe(true);
  });

  it('accepts a later event', () => {
    expect(isAfterBaseline({ occurredAt: '2026-10-17T12:00:01.000Z' }, enabledAt)).toBe(true);
  });
});
