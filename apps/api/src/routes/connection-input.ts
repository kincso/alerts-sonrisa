import type { ChannelConfig, ConnectionInput, FieldErrors } from '@alerts/shared';
import type { NotificationChannel } from '../channels/notification-channel.ts';

export type ParsedInput =
  { ok: true; input: ConnectionInput } | { ok: false; fieldErrors: FieldErrors };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Keeps only the channel's own field keys, as trimmed strings ('' when missing). */
function pickConfig(channel: NotificationChannel, raw: unknown): ChannelConfig {
  const source = asRecord(raw);
  return Object.fromEntries(channel.fields.map((f) => [f.key, asString(source[f.key])]));
}

/**
 * Required fields are checked here; channel config only by the channel's
 * `validate()` (DS1). `findChannel` returns only registered, enabled channels.
 */
export function parseConnectionInput(
  body: unknown,
  findChannel: (type: string) => NotificationChannel | undefined,
): ParsedInput {
  const raw = asRecord(body);
  const type = asString(raw['type']);
  const label = asString(raw['label']);
  const channel = findChannel(type);
  if (!channel) return { ok: false, fieldErrors: { type: 'Choose an available channel.' } };

  const config = pickConfig(channel, raw['config']);
  const fieldErrors: FieldErrors = { ...channel.validate(config) };
  if (!label) fieldErrors['label'] = 'Name is required.';

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, input: { type, label, config } };
}
