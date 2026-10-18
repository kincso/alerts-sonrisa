import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApi } from '../../core/admin-api';
import { apiMessage } from '../../core/api-message';
import { CurrentUser } from '../../core/current-user';
import { ChannelTypesTable, type ChannelSwitch } from '../channel-types-table/channel-types-table';
import { withSwitchState, type SwitchState, type SwitchStates } from '../switch-state';

/** Admin tab (container): turn channel types on and off (A9). */
@Component({
  selector: 'app-admin-channels-tab',
  imports: [MatButtonModule, MatProgressBarModule, ChannelTypesTable],
  templateUrl: './admin-channels-tab.html',
  styleUrl: './admin-channels-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminChannelsTab {
  private readonly adminApi = inject(AdminApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly channels = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.adminApi.channels(),
  });
  protected readonly switchStates = signal<SwitchStates>({});

  protected setEnabled({ channel, enabled }: ChannelSwitch): void {
    this.setSwitch(channel.type, { kind: 'pending', enabled });
    this.adminApi.setChannelEnabled(channel.type, enabled).subscribe({
      next: (saved) => {
        this.channels.update((list) => list?.map((c) => (c.type === saved.type ? saved : c)));
        this.setSwitch(channel.type, undefined);
      },
      error: (error: unknown) =>
        this.setSwitch(channel.type, {
          kind: 'error',
          message: apiMessage(error, `Could not turn ${channel.label} ${enabled ? 'on' : 'off'}.`),
        }),
    });
  }

  private setSwitch(type: string, state: SwitchState | undefined): void {
    this.switchStates.update((states) => withSwitchState(states, type, state));
  }
}
