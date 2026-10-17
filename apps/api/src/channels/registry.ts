import type { NotificationChannel } from './notification-channel.ts';

/** The only place that knows which channels exist (A12). */
export interface ChannelRegistry {
  get(type: string): NotificationChannel | undefined;
  all(): readonly NotificationChannel[];
}

export function createChannelRegistry(channels: readonly NotificationChannel[]): ChannelRegistry {
  const byType = new Map(channels.map((c) => [c.type, c]));
  return {
    get: (type) => byType.get(type),
    all: () => channels,
  };
}
