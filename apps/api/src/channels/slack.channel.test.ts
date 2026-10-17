import { describe, expect, it } from 'vitest';
import { renderSlackText, slackChannel, validateSlackConfig } from './slack.channel.ts';

// testing.md S1-10, decisions.md S1-3
describe('validateSlackConfig', () => {
  it('accepts an empty URL (dry run)', () => {
    expect(validateSlackConfig({})).toEqual({});
    expect(validateSlackConfig({ webhookUrl: '' })).toEqual({});
  });

  it('accepts a Slack webhook URL', () => {
    expect(validateSlackConfig({ webhookUrl: 'https://hooks.slack.com/services/T/B/x' })).toEqual(
      {},
    );
  });

  it('rejects any other URL', () => {
    expect(validateSlackConfig({ webhookUrl: 'https://example.com/hook' })).toHaveProperty(
      'webhookUrl',
    );
    expect(validateSlackConfig({ webhookUrl: 'http://hooks.slack.com/services/x' })).toHaveProperty(
      'webhookUrl',
    );
  });
});

describe('slackChannel.send', () => {
  it('is a dry run without a webhook URL', async () => {
    const outcome = await slackChannel.send(
      { title: 'Test', summary: '', sourceLabel: 'Test', occurredAt: '2026-10-17T00:00:00.000Z' },
      { webhookUrl: '' },
      new AbortController().signal,
    );

    expect(outcome).toEqual({ status: 'dry-run' });
  });
});

// testing.md S1-14
describe('renderSlackText', () => {
  it('escapes user and feed text so it cannot become a mention or link', () => {
    const text = renderSlackText({
      title: 'A & B <!channel>',
      summary: 'See <https://evil.example|here>',
      alertName: '<@U123>',
      sourceLabel: 'Test',
      occurredAt: '2026-10-17T00:00:00.000Z',
      url: 'https://www.bbc.co.uk/news/1',
    });

    expect(text).toContain('*A &amp; B &lt;!channel&gt;*');
    expect(text).toContain('See &lt;https://evil.example|here&gt;');
    expect(text).toContain('Matched alert: &lt;@U123&gt;');
    expect(text).toContain('<https://www.bbc.co.uk/news/1|Read more>');
  });
});
