import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CurrentUser } from '../../core/current-user';
import { DeliveriesApi } from '../../core/deliveries-api';
import { DeliveryTable } from '../../deliveries/delivery-table/delivery-table';

/** Page: the notifications the current user received, test sends included (A17, DS8). */
@Component({
  selector: 'app-history-page',
  imports: [MatButtonModule, MatProgressBarModule, DeliveryTable],
  templateUrl: './history-page.html',
  styleUrl: './history-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPage {
  private readonly deliveriesApi = inject(DeliveriesApi);
  private readonly currentUser = inject(CurrentUser);

  // Keyed on the user id: switching user reloads and drops the old rows.
  protected readonly deliveries = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.deliveriesApi.mine(),
  });

  // No user id yet: the user list is loading, has failed (the shell shows that error), or has no user.
  protected readonly usersLoading = computed(() => this.currentUser.users.isLoading());
  protected readonly usersFailed = computed(() => this.currentUser.users.status() === 'error');
}
