import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import type {
  ApiError,
  FieldErrors,
  SimulateEventInput,
  SimulateEventResult,
} from '@alerts/shared';
import { AdminApi } from '../../core/admin-api';
import { AlertsApi } from '../../core/alerts-api';
import { apiMessage } from '../../core/api-message';
import { CurrentUser } from '../../core/current-user';
import { DeliveryTable } from '../../deliveries/delivery-table/delivery-table';
import { SimulateEventForm } from '../simulate-event-form/simulate-event-form';

function fieldErrorsOf(error: unknown): FieldErrors | undefined {
  if (!(error instanceof HttpErrorResponse) || error.status !== 400) return undefined;
  return (error.error as Partial<ApiError> | null)?.fieldErrors;
}

/** Admin tab (container): run a made-up event through the real pipeline (A18). */
@Component({
  selector: 'app-admin-simulate-tab',
  imports: [MatButtonModule, MatProgressBarModule, DeliveryTable, SimulateEventForm],
  templateUrl: './admin-simulate-tab.html',
  styleUrl: './admin-simulate-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSimulateTab {
  private readonly adminApi = inject(AdminApi);
  private readonly alertsApi = inject(AlertsApi);
  private readonly currentUser = inject(CurrentUser);

  protected readonly sources = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.alertsApi.sources(),
  });
  protected readonly sending = signal(false);
  protected readonly serverErrors = signal<FieldErrors>({});
  protected readonly result = signal<SimulateEventResult | undefined>(undefined);
  protected readonly error = signal<string | undefined>(undefined);

  protected simulate(input: SimulateEventInput): void {
    this.sending.set(true);
    this.serverErrors.set({});
    this.error.set(undefined);
    this.result.set(undefined);
    this.adminApi.simulate(input).subscribe({
      next: (result) => {
        this.result.set(result);
        this.sending.set(false);
      },
      error: (error: unknown) => {
        const fieldErrors = fieldErrorsOf(error);
        if (fieldErrors) this.serverErrors.set(fieldErrors);
        else this.error.set(apiMessage(error, 'Could not simulate the event.'));
        this.sending.set(false);
      },
    });
  }
}
