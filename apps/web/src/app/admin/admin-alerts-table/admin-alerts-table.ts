import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { AdminAlertView, SourceSummary } from '@alerts/shared';
import { severityLabel } from '../../alerts/severity-label';

/** Display only: every user's alerts, read-only (A9). */
@Component({
  selector: 'app-admin-alerts-table',
  templateUrl: './admin-alerts-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAlertsTable {
  readonly alerts = input.required<readonly AdminAlertView[]>();
  readonly sources = input.required<readonly SourceSummary[]>();

  protected readonly rows = computed(() =>
    this.alerts().map((alert) => ({
      alert,
      source: this.sources().find((s) => s.id === alert.sourceId)?.label ?? alert.sourceId,
      keywords: alert.keywords.length > 0 ? alert.keywords.join(', ') : 'Any item',
      severity: `${severityLabel(alert.minSeverity)} or higher`,
      targets: alert.connectionLabels.join(', '),
    })),
  );
}
