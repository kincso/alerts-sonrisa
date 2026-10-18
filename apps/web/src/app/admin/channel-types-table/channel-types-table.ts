import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { ChannelTypeSummary } from '@alerts/shared';
import { shownValue, type SwitchStates } from '../switch-state';

export interface ChannelSwitch {
  channel: ChannelTypeSummary;
  enabled: boolean;
}

/** Display only: the channel types with an enable switch (A9, decisions.md S1-6). */
@Component({
  selector: 'app-channel-types-table',
  imports: [MatSlideToggleModule],
  templateUrl: './channel-types-table.html',
  styleUrl: './channel-types-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelTypesTable {
  readonly channels = input.required<readonly ChannelTypeSummary[]>();
  readonly switchStates = input.required<SwitchStates>();

  readonly enabledChange = output<ChannelSwitch>();

  protected readonly rows = computed(() =>
    this.channels().map((channel) => {
      const state = this.switchStates()[channel.type];
      return { channel, state, checked: shownValue(channel.enabled, state) };
    }),
  );
}
