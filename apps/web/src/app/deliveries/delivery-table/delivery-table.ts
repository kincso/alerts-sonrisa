import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { DeliveryStatus, DeliveryView } from '@alerts/shared';
import { severityLabel } from '../../alerts/severity-label';

/** A history row; the admin log adds the user's name (decisions.md S4-2). */
export type DeliveryRow = DeliveryView & { userName?: string };

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  'dry-run': 'Dry run',
  failed: 'Failed',
};

/** Display only: the delivery log for the user's history (A17) and the admin (A9). */
@Component({
  selector: 'app-delivery-table',
  imports: [DatePipe],
  templateUrl: './delivery-table.html',
  styleUrl: './delivery-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryTable {
  readonly deliveries = input.required<readonly DeliveryRow[]>();
  readonly caption = input.required<string>();
  /** Adds a User column (admin log). */
  readonly showUser = input(false);

  protected readonly rows = computed(() =>
    this.deliveries().map((delivery) => ({
      delivery,
      alert: delivery.kind === 'test' ? 'Test' : (delivery.alertName ?? 'Deleted alert'),
      severity: delivery.event ? severityLabel(delivery.event.severity) : undefined,
      status: STATUS_LABELS[delivery.status],
    })),
  );
}
