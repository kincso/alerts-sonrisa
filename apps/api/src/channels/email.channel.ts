import nodemailer from 'nodemailer';
import type { ChannelConfig, FieldErrors } from '@alerts/shared';
import type { EmailPreview } from '../db/previews.ts';
import type { Notification, NotificationChannel, SendOutcome } from './notification-channel.ts';
import { SEND_TIMEOUT_MS } from '../util/with-timeout.ts';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SmtpEnv {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
}

export function validateEmailConfig(config: ChannelConfig): FieldErrors {
  const to = config['to']?.trim() ?? '';
  if (!to) return { to: 'Email address is required.' };
  if (!EMAIL_PATTERN.test(to)) return { to: 'Enter a valid email address.' };
  return {};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Plain template (A15): title, summary, source, link, time, matched alert. */
export function renderEmail(n: Notification): EmailPreview {
  const subject = n.alertName ? `[${n.alertName}] ${n.title}` : n.title;
  const link = n.url ? `<p><a href="${escapeHtml(n.url)}">Read more</a></p>` : '';
  const alert = n.alertName ? `<p>Matched alert: ${escapeHtml(n.alertName)}</p>` : '';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="font-family: sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem">
<h1 style="font-size: 1.25rem">${escapeHtml(n.title)}</h1>
<p>${escapeHtml(n.summary)}</p>${link}${alert}
<p style="color: #555">Source: ${escapeHtml(n.sourceLabel)} · ${escapeHtml(n.occurredAt)}</p>
</body></html>`;
  return { subject, html };
}

/**
 * Email channel (A10). With SMTP_HOST set it sends through SMTP; otherwise it only
 * logs. Either way the rendered message is returned as a preview (S1-2).
 */
export function createEmailChannel(env: SmtpEnv): NotificationChannel {
  const transport = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT ?? 587),
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
        connectionTimeout: SEND_TIMEOUT_MS,
        greetingTimeout: SEND_TIMEOUT_MS,
        socketTimeout: SEND_TIMEOUT_MS,
      })
    : undefined;
  const from = env.SMTP_FROM ?? 'World Alerts <alerts@localhost>';

  return {
    type: 'email',
    label: 'Email',
    fields: [{ key: 'to', label: 'Email address', type: 'email', required: true }],
    validate: validateEmailConfig,
    async send(n, config): Promise<SendOutcome> {
      const preview = renderEmail(n);
      const to = config['to'] ?? '';
      if (transport) {
        await transport.sendMail({ from, to, subject: preview.subject, html: preview.html });
      } else {
        console.log(`[email] log-only (no SMTP_HOST): "${preview.subject}" → ${to}`);
      }
      // Log-only still counts as "sent": the message is delivered to the preview (plan-v2 S1).
      return { status: 'sent', preview };
    },
  };
}
