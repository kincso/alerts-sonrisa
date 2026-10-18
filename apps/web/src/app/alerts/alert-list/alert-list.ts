import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import type { Alert, ChannelConnection, SourceSummary } from '@alerts/shared';
import { severityLabel } from '../severity-label';

/** The state of an active/paused switch while its PATCH runs, or after it failed. */
export type ToggleState = { kind: 'pending'; active: boolean } | { kind: 'error'; message: string };

export interface ToggleRequest {
  alert: Alert;
  active: boolean;
}

/** Display only: the page loads data and handles the outputs. */
@Component({
  selector: 'app-alert-list',
  imports: [RouterLink, MatButtonModule, MatSlideToggleModule],
  templateUrl: './alert-list.html',
  styleUrl: './alert-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertList {
  readonly alerts = input.required<Alert[]>();
  readonly sources = input.required<SourceSummary[]>();
  readonly connections = input.required<ChannelConnection[]>();
  readonly toggleStates = input.required<Partial<Record<string, ToggleState>>>();

  readonly activeChange = output<ToggleRequest>();
  readonly remove = output<Alert>();

  protected readonly rows = computed(() =>
    this.alerts().map((alert) => {
      const state = this.toggleStates()[alert.id];
      return {
        alert,
        state,
        // While pending the switch shows the requested value; after a failure it
        // goes back to the saved one.
        checked: state?.kind === 'pending' ? state.active : alert.active,
        source: this.sources().find((s) => s.id === alert.sourceId)?.label ?? alert.sourceId,
        keywords: alert.keywords.length > 0 ? alert.keywords.join(', ') : 'Any item',
        severity: `${severityLabel(alert.minSeverity)} or higher`,
        targets: alert.connectionIds
          .map((id) => this.connections().find((c) => c.id === id)?.label ?? 'Unknown')
          .join(', '),
      };
    }),
  );
}
