import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { PollResult, SourceHealth } from '@alerts/shared';
import { shownValue, type SwitchStates } from '../switch-state';

/** "Poll now" while it runs, its result, or why it failed. */
export type PollState =
  { kind: 'pending' } | { kind: 'done'; result: PollResult } | { kind: 'error'; message: string };

export interface SourceSwitch {
  source: SourceHealth;
  enabled: boolean;
}

function pollSummary(result: PollResult): string {
  if (result.status === 'skipped') return 'Skipped: the source is off or already polling.';
  if (result.status === 'failed') return `Failed: ${result.error ?? 'unknown error'}`;
  return `Fetched ${result.fetched}, ${result.inserted} new.`;
}

/** Display only: source health with an enable switch and "Poll now" (A9). */
@Component({
  selector: 'app-source-health-table',
  imports: [DatePipe, MatButtonModule, MatSlideToggleModule],
  templateUrl: './source-health-table.html',
  styleUrl: './source-health-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SourceHealthTable {
  readonly sources = input.required<readonly SourceHealth[]>();
  readonly switchStates = input.required<SwitchStates>();
  readonly pollStates = input.required<Partial<Record<string, PollState>>>();

  readonly enabledChange = output<SourceSwitch>();
  readonly poll = output<SourceHealth>();

  protected readonly rows = computed(() =>
    this.sources().map((source) => {
      const switchState = this.switchStates()[source.id];
      const pollState = this.pollStates()[source.id];
      return {
        source,
        switchState,
        checked: shownValue(source.enabled, switchState),
        pollState,
        pollNote:
          pollState?.kind === 'pending'
            ? 'Polling…'
            : pollState?.kind === 'done'
              ? pollSummary(pollState.result)
              : '',
      };
    }),
  );
}
