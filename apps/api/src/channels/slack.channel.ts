import type { ChannelConfig, FieldErrors } from '@alerts/shared';
import type { Notification, NotificationChannel, SendOutcome } from './notification-channel.ts';

const SLACK_WEBHOOK_PREFIX = 'https://hooks.slack.com/';

/** Empty is valid: it means dry run (decisions.md S1-3). */
export function validateSlackConfig(config: ChannelConfig): FieldErrors {
  const url = config['webhookUrl']?.trim() ?? '';
  if (url && !url.startsWith(SLACK_WEBHOOK_PREFIX)) {
    return { webhookUrl: `Must start with ${SLACK_WEBHOOK_PREFIX}` };
  }
  return {};
}

/** Slack mrkdwn text (A15). */
export function renderSlackText(n: Notification): string {
  const lines = [`*${n.title}*`, n.summary];
  if (n.url) lines.push(`<${n.url}|Read more>`);
  if (n.alertName) lines.push(`Matched alert: ${n.alertName}`);
  lines.push(`_Source: ${n.sourceLabel} · ${n.occurredAt}_`);
  return lines.join('\n');
}

/** Slack Incoming Webhook channel (A11). No URL → dry run. */
export const slackChannel: NotificationChannel = {
  type: 'slack',
  label: 'Slack',
  fields: [{ key: 'webhookUrl', label: 'Slack webhook URL', type: 'url', required: false }],
  validate: validateSlackConfig,
  async send(n, config, signal): Promise<SendOutcome> {
    const url = config['webhookUrl']?.trim() ?? '';
    const text = renderSlackText(n);
    if (!url) {
      console.log(`[slack] dry run (no webhook URL): ${n.title}`);
      return { status: 'dry-run' };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    });
    if (!res.ok) throw new Error(`Slack returned ${res.status}: ${await res.text()}`);
    return { status: 'sent' };
  },
};
