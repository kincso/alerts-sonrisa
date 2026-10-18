import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { AdminDeliveryView, DeliveryStatus, DeliveryView } from '@alerts/shared';
import { severityLabel } from '../../alerts/severity-label';

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
  /** History rows, or admin log rows, which add the user's name (decisions.md S4-2). */
  readonly deliveries = input.required<readonly DeliveryView[] | readonly AdminDeliveryView[]>();
  readonly caption = input.required<string>();

  /** The User column follows the data: only admin log rows have `userName`. */
  protected readonly showUser = computed(() => this.deliveries().some((d) => 'userName' in d));

  protected readonly rows = computed(() =>
    this.deliveries().map((delivery: DeliveryView | AdminDeliveryView) => ({
      delivery,
      userName: 'userName' in delivery ? delivery.userName : undefined,
      alert: delivery.kind === 'test' ? 'Test' : (delivery.alertName ?? 'Deleted alert'),
      severity: delivery.event ? severityLabel(delivery.event.severity) : undefined,
      status: STATUS_LABELS[delivery.status],
    })),
  );
}
