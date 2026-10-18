import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApi } from '../../core/admin-api';
import { CurrentUser } from '../../core/current-user';
import { DeliveryTable } from '../../deliveries/delivery-table/delivery-table';

/** Admin tab (container): the whole delivery log (A9, A16). */
@Component({
  selector: 'app-admin-deliveries-tab',
  imports: [MatButtonModule, MatProgressBarModule, DeliveryTable],
  templateUrl: './admin-deliveries-tab.html',
  styleUrl: './admin-deliveries-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDeliveriesTab {
  private readonly adminApi = inject(AdminApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly deliveries = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.adminApi.deliveries(),
  });
}
