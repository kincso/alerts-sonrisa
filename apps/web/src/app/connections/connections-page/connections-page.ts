import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ApiError, ChannelConnection, ChannelDescriptor } from '@alerts/shared';
import { ConnectionsApi } from '../../core/connections-api';
import { CurrentUser } from '../../core/current-user';
import { ConnectionList } from '../connection-list/connection-list';
import {
  ConnectionFormDialog,
  type ConnectionDialogData,
} from '../connection-form-dialog/connection-form-dialog';
import type { TestState } from '../send-test-button/send-test-button';

type PageView =
  | { status: 'idle' | 'loading' | 'error' }
  | {
      status: 'ready';
      channels: ChannelDescriptor[];
      connections: ChannelConnection[];
      refreshing: boolean;
    };

function apiMessage(error: unknown, fallback: string): string {
  const body =
    error instanceof HttpErrorResponse ? (error.error as Partial<ApiError> | null) : null;
  return body?.message ?? fallback;
}

/** Page: loads the current user's connections and channels; handles add/edit/delete/test. */
@Component({
  selector: 'app-connections-page',
  imports: [MatButtonModule, MatProgressBarModule, ConnectionList],
  templateUrl: './connections-page.html',
  styleUrl: './connections-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionsPage {
  private readonly api = inject(ConnectionsApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly currentUser = inject(CurrentUser);

  // Keyed on the user id: switching user reloads both and drops the old values.
  protected readonly channels = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.api.channels(),
    defaultValue: [],
  });
  protected readonly connections = rxResource({
    params: () => this.currentUser.userId(),
    stream: () => this.api.list(),
  });
  /**
   * One view of both requests: the page needs channels (for the form) and connections.
   * `value()` throws once a resource has errored, so values are only read here, once both loaded.
   */
  protected readonly view = computed<PageView>(() => {
    if (this.channels.status() === 'error' || this.connections.status() === 'error') {
      return { status: 'error' };
    }
    if (this.connections.status() === 'idle') return { status: 'idle' };
    if (!this.channels.hasValue() || !this.connections.hasValue()) return { status: 'loading' };
    return {
      status: 'ready',
      channels: this.channels.value(),
      connections: this.connections.value(),
      refreshing: this.channels.isLoading() || this.connections.isLoading(),
    };
  });
  /** Send-test results per connection id, reset when the user switches. */
  protected readonly testStates = linkedSignal<string | undefined, Record<string, TestState>>({
    source: this.currentUser.userId,
    computation: () => ({}),
  });

  /** Reloads only the requests that failed. */
  protected retry(): void {
    for (const resource of [this.channels, this.connections]) {
      if (resource.status() === 'error') resource.reload();
    }
  }

  protected openDialog(connection?: ChannelConnection): void {
    const data: ConnectionDialogData = { channels: this.channels.value(), connection };
    this.dialog
      .open<ConnectionFormDialog, ConnectionDialogData, ChannelConnection>(ConnectionFormDialog, {
        data,
        width: '32rem',
        maxWidth: 'calc(100vw - 2rem)',
      })
      .afterClosed()
      .subscribe((saved) => {
        if (!saved) return;
        this.connections.reload();
        this.snackBar.open(`Saved "${saved.label}".`, undefined, { duration: 3000 });
      });
  }

  protected remove(connection: ChannelConnection): void {
    if (!confirm(`Delete the connection "${connection.label}"?`)) return;
    this.api.remove(connection.id).subscribe({
      next: () => {
        this.connections.reload();
        this.snackBar.open(`Deleted "${connection.label}".`, undefined, { duration: 3000 });
      },
      error: (error: unknown) => {
        this.connections.reload();
        this.snackBar.open(apiMessage(error, 'Could not delete the connection.'), 'Dismiss');
      },
    });
  }

  protected sendTest(connection: ChannelConnection): void {
    this.setTestState(connection.id, { kind: 'pending' });
    this.api.sendTest(connection.id).subscribe({
      next: (result) => this.setTestState(connection.id, { kind: 'done', result }),
      error: (error: unknown) =>
        this.setTestState(connection.id, {
          kind: 'error',
          message: apiMessage(error, 'Could not send the test.'),
        }),
    });
  }

  private setTestState(id: string, state: TestState): void {
    this.testStates.update((states) => ({ ...states, [id]: state }));
  }
}
