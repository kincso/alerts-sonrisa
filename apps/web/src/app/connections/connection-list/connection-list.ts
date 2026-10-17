import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import type { ChannelConnection, ChannelDescriptor } from '@alerts/shared';
import { SendTestButton, type TestState } from '../send-test-button/send-test-button';

/** Shows a URL as origin + last 4 characters, so secrets in webhook paths stay hidden (S1-4). */
export function maskUrl(value: string): string {
  try {
    return `${new URL(value).origin}/…${value.slice(-4)}`;
  } catch {
    return '…';
  }
}

/** The connection's target, e.g. its email address, from the channel's first field. */
export function targetSummary(
  connection: ChannelConnection,
  channel: ChannelDescriptor | undefined,
): string {
  const field = channel?.fields[0];
  const value = field ? (connection.config[field.key] ?? '') : '';
  if (!field || !value) return 'Not set';
  return field.type === 'url' ? maskUrl(value) : value;
}

/** Display only: the page loads data and handles the outputs. */
@Component({
  selector: 'app-connection-list',
  imports: [MatButtonModule, SendTestButton],
  templateUrl: './connection-list.html',
  styleUrl: './connection-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionList {
  readonly connections = input.required<ChannelConnection[]>();
  readonly channels = input.required<ChannelDescriptor[]>();
  readonly testStates = input.required<Record<string, TestState>>();

  readonly edit = output<ChannelConnection>();
  readonly remove = output<ChannelConnection>();
  readonly test = output<ChannelConnection>();

  protected readonly rows = computed(() =>
    this.connections().map((connection) => {
      const channel = this.channels().find((c) => c.type === connection.type);
      return {
        connection,
        channelLabel: channel?.label ?? connection.type,
        target: targetSummary(connection, channel),
      };
    }),
  );
}
