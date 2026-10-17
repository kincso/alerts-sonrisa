import { describe, expect, it } from 'vitest';
import { renderEmail, validateEmailConfig } from './email.channel.ts';

// testing.md S1-10
describe('validateEmailConfig', () => {
  it('requires an address', () => {
    expect(validateEmailConfig({})).toHaveProperty('to');
    expect(validateEmailConfig({ to: '   ' })).toHaveProperty('to');
  });

  it('rejects an invalid address', () => {
    expect(validateEmailConfig({ to: 'not-an-email' })).toHaveProperty('to');
    expect(validateEmailConfig({ to: 'a@b' })).toHaveProperty('to');
  });

  it('accepts a valid address', () => {
    expect(validateEmailConfig({ to: 'alice@example.com' })).toEqual({});
  });
});

describe('renderEmail', () => {
  it('escapes HTML from event text', () => {
    const { html } = renderEmail({
      title: '<script>alert(1)</script>',
      summary: 'Tom & Jerry',
      sourceLabel: 'Test',
      occurredAt: '2026-10-17T00:00:00.000Z',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Tom &amp; Jerry');
  });

  it('puts the alert name in the subject when an alert matched', () => {
    const { subject } = renderEmail({
      title: 'M 6.1 - Somewhere',
      summary: '',
      sourceLabel: 'USGS',
      occurredAt: '2026-10-17T00:00:00.000Z',
      alertName: 'Big quakes',
    });

    expect(subject).toBe('[Big quakes] M 6.1 - Somewhere');
  });
});
