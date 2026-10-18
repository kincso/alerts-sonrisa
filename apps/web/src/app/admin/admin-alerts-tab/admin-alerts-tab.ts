import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApi } from '../../core/admin-api';
import { AlertsApi } from '../../core/alerts-api';
import { CurrentUser } from '../../core/current-user';
import { AdminAlertsTable } from '../admin-alerts-table/admin-alerts-table';

/** Admin tab (container): loads every user's alerts and the source labels. */
@Component({
  selector: 'app-admin-alerts-tab',
  imports: [MatButtonModule, MatProgressBarModule, AdminAlertsTable],
  templateUrl: './admin-alerts-tab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAlertsTab {
  private readonly adminApi = inject(AdminApi);
  private readonly alertsApi = inject(AlertsApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly alerts = rxResource({
    params: () => this.currentUser.adminId(),
    stream: () => this.adminApi.alerts(),
  });
  protected readonly sources = rxResource({
    params: () => this.currentUser.adminId(),
    stream: () => this.alertsApi.sources(),
  });

  protected readonly failed = computed(
    () => this.alerts.status() === 'error' || this.sources.status() === 'error',
  );

  protected reload(): void {
    this.alerts.reload();
    this.sources.reload();
  }
}
