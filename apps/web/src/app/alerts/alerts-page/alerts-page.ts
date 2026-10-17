import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { Alert, ApiError, ChannelConnection, SourceSummary } from '@alerts/shared';
import { AlertsApi } from '../../core/alerts-api';
import { ConnectionsApi } from '../../core/connections-api';
import { CurrentUser } from '../../core/current-user';
import { AlertList, type ToggleRequest, type ToggleState } from '../alert-list/alert-list';

type PageView =
  | { status: 'idle' | 'loading' | 'error' }
  | {
      status: 'ready';
      alerts: Alert[];
      sources: SourceSummary[];
      connections: ChannelConnection[];
      refreshing: boolean;
    };

function apiMessage(error: unknown, fallback: string): string {
  const body =
    error instanceof HttpErrorResponse ? (error.error as Partial<ApiError> | null) : null;
  return body?.message ?? fallback;
}

/** Page: the current user's alerts, with pause/resume and delete (A14). */
@Component({
  selector: 'app-alerts-page',
  imports: [RouterLink, MatButtonModule, MatProgressBarModule, AlertList],
  templateUrl: './alerts-page.html',
  styleUrl: './alerts-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  private readonly alertsApi = inject(AlertsApi);
  private readonly connectionsApi = inject(ConnectionsApi);
  private readonly snackBar = inject(MatSnackBar);
  private readonly currentUser = inject(CurrentUser);

  // Keyed on the user id: switching user reloads all three and drops the old values.
  protected readonly alerts = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.alertsApi.list(),
  });
  private readonly sources = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.alertsApi.sources(),
  });
  private readonly connections = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.connectionsApi.list(),
  });
  private readonly resources = [this.alerts, this.sources, this.connections];

  /** `value()` throws once a resource has errored, so values are read only when all loaded. */
  protected readonly view = computed<PageView>(() => {
    if (this.resources.some((r) => r.status() === 'error')) return { status: 'error' };
    if (this.alerts.status() === 'idle') return { status: 'idle' };
    if (!this.alerts.hasValue() || !this.sources.hasValue() || !this.connections.hasValue()) {
      return { status: 'loading' };
    }
    return {
      status: 'ready',
      alerts: this.alerts.value(),
      sources: this.sources.value(),
      connections: this.connections.value(),
      refreshing: this.resources.some((r) => r.isLoading()),
    };
  });

  /** Active/paused switch states per alert id, reset when the user switches. */
  protected readonly toggleStates = linkedSignal<
    string | undefined,
    Partial<Record<string, ToggleState>>
  >({
    source: this.currentUser.userId,
    computation: () => ({}),
  });

  protected retry(): void {
    for (const resource of this.resources) {
      if (resource.status() === 'error') resource.reload();
    }
  }

  protected setActive({ alert, active }: ToggleRequest): void {
    this.setToggleState(alert.id, { kind: 'pending', active });
    this.alertsApi.setActive(alert.id, active).subscribe({
      next: (saved) => {
        this.alerts.update((list) => list?.map((a) => (a.id === saved.id ? saved : a)));
        this.setToggleState(alert.id, undefined);
      },
      error: (error: unknown) =>
        this.setToggleState(alert.id, {
          kind: 'error',
          message: apiMessage(error, `Could not ${active ? 'resume' : 'pause'} the alert.`),
        }),
    });
  }

  protected remove(alert: Alert): void {
    if (!confirm(`Delete the alert "${alert.name}"?`)) return;
    this.alertsApi.remove(alert.id).subscribe({
      next: () => {
        this.alerts.reload();
        this.snackBar.open(`Deleted "${alert.name}".`, undefined, { duration: 3000 });
      },
      error: (error: unknown) => {
        this.alerts.reload();
        this.snackBar.open(apiMessage(error, 'Could not delete the alert.'), 'Dismiss');
      },
    });
  }

  private setToggleState(id: string, state: ToggleState | undefined): void {
    this.toggleStates.update((states) => {
      const others = Object.fromEntries(Object.entries(states).filter(([key]) => key !== id));
      return state ? { ...others, [id]: state } : others;
    });
  }
}
