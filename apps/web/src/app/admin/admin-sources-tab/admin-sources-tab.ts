import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type { SourceHealth } from '@alerts/shared';
import { AdminApi } from '../../core/admin-api';
import { apiMessage } from '../../core/api-message';
import { CurrentUser } from '../../core/current-user';
import {
  SourceHealthTable,
  type PollState,
  type SourceSwitch,
} from '../source-health-table/source-health-table';
import { withSwitchState, type SwitchState, type SwitchStates } from '../switch-state';

/** Admin tab (container): source health, the enable switch and "Poll now" (A9). */
@Component({
  selector: 'app-admin-sources-tab',
  imports: [MatButtonModule, MatProgressBarModule, SourceHealthTable],
  templateUrl: './admin-sources-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSourcesTab {
  private readonly adminApi = inject(AdminApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly sources = rxResource({
    params: () => this.currentUser.adminId(),
    stream: () => this.adminApi.sources(),
  });
  protected readonly switchStates = signal<SwitchStates>({});
  protected readonly pollStates = signal<Partial<Record<string, PollState>>>({});

  protected setEnabled({ source, enabled }: SourceSwitch): void {
    this.setSwitch(source.id, { kind: 'pending', enabled });
    this.adminApi.setSourceEnabled(source.id, enabled).subscribe({
      next: (saved) => {
        this.sources.update((list) => list?.map((s) => (s.id === saved.id ? saved : s)));
        this.setSwitch(source.id, undefined);
      },
      error: (error: unknown) =>
        this.setSwitch(source.id, {
          kind: 'error',
          message: apiMessage(error, `Could not turn ${source.label} ${enabled ? 'on' : 'off'}.`),
        }),
    });
  }

  /** Reloads the list afterwards, so "Last poll" and "Last error" are current. */
  protected poll(source: SourceHealth): void {
    this.setPoll(source.id, { kind: 'pending' });
    this.adminApi.pollSource(source.id).subscribe({
      next: (result) => {
        this.setPoll(source.id, { kind: 'done', result });
        this.sources.reload();
      },
      error: (error: unknown) =>
        this.setPoll(source.id, {
          kind: 'error',
          message: apiMessage(error, `Could not poll ${source.label}.`),
        }),
    });
  }

  private setSwitch(id: string, state: SwitchState | undefined): void {
    this.switchStates.update((states) => withSwitchState(states, id, state));
  }

  private setPoll(id: string, state: PollState): void {
    this.pollStates.update((states) => ({ ...states, [id]: state }));
  }
}
