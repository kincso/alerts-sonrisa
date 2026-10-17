import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import type {
  Alert,
  AlertInput,
  ApiError,
  ChannelConnection,
  FieldErrors,
  SourceSummary,
} from '@alerts/shared';
import { AlertsApi } from '../../core/alerts-api';
import { ConnectionsApi } from '../../core/connections-api';
import { CurrentUser } from '../../core/current-user';
import { AlertForm } from '../alert-form/alert-form';

type EditView =
  | { status: 'idle' | 'loading' | 'error' | 'not-found' }
  | {
      status: 'ready';
      sources: SourceSummary[];
      connections: ChannelConnection[];
      alert: Alert | undefined;
    };

/** Page for /alerts/new and /alerts/:id: loads what the form needs and saves it. */
@Component({
  selector: 'app-alert-edit-page',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, AlertForm],
  templateUrl: './alert-edit-page.html',
  styleUrl: './alert-edit-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertEditPage {
  private readonly alertsApi = inject(AlertsApi);
  private readonly connectionsApi = inject(ConnectionsApi);
  private readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  /** Route param (withComponentInputBinding); absent on /alerts/new. */
  readonly id = input<string>();

  // Keyed on the user id: switching user reloads everything for the new user.
  private readonly sources = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.alertsApi.sources(),
  });
  private readonly connections = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.connectionsApi.list(),
  });
  /** There is no GET /me/alerts/:id (design.md §4), so the edit page reads the list. */
  private readonly alerts = rxResource({
    params: () => (this.id() ? this.currentUser.userId() : undefined),
    stream: () => this.alertsApi.list(),
  });
  private readonly resources = [this.sources, this.connections, this.alerts];

  protected readonly view = computed<EditView>(() => {
    if (this.resources.some((r) => r.status() === 'error')) return { status: 'error' };
    if (!this.currentUser.userId()) return { status: 'idle' };
    const editing = !!this.id();
    if (!this.sources.hasValue() || !this.connections.hasValue()) return { status: 'loading' };
    if (editing && !this.alerts.hasValue()) return { status: 'loading' };
    const alert = editing ? this.alerts.value()?.find((a) => a.id === this.id()) : undefined;
    if (editing && !alert) return { status: 'not-found' };
    return {
      status: 'ready',
      sources: this.sources.value(),
      connections: this.connections.value(),
      alert,
    };
  });

  protected readonly saving = signal(false);
  protected readonly serverErrors = signal<FieldErrors>({});

  protected retry(): void {
    for (const resource of this.resources) {
      if (resource.status() === 'error') resource.reload();
    }
  }

  protected save(input: AlertInput): void {
    const id = this.id();
    const request = id ? this.alertsApi.update(id, input) : this.alertsApi.create(input);
    this.saving.set(true);
    request.subscribe({
      next: (saved) => {
        this.snackBar.open(`Saved "${saved.name}".`, undefined, { duration: 3000 });
        void this.router.navigate(['/alerts']);
      },
      error: (error: unknown) => this.showError(error),
    });
  }

  private showError(error: unknown): void {
    this.saving.set(false);
    const body =
      error instanceof HttpErrorResponse ? (error.error as Partial<ApiError> | null) : null;
    if (body?.fieldErrors) {
      this.serverErrors.set({ ...body.fieldErrors });
    } else if (error instanceof HttpErrorResponse && error.status === 404) {
      this.snackBar.open('This alert no longer exists.', 'Dismiss');
    }
    // 401/403/5xx and network errors are shown by the interceptor.
  }
}
