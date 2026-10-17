import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { catchError, map, of, startWith } from 'rxjs';
import { SEVERITIES, type HealthResponse } from '@alerts/shared';

type HealthState = { kind: 'loading' } | { kind: 'ok'; body: HealthResponse } | { kind: 'error' };

// S0 scaffold check: proves the shared package works in the browser and over the API.
// Replaced by the real app shell in S1.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly severities = SEVERITIES;

  protected readonly health = toSignal(
    inject(HttpClient)
      .get<HealthResponse>('/api/health')
      .pipe(
        map((body): HealthState => ({ kind: 'ok', body })),
        catchError(() => of<HealthState>({ kind: 'error' })),
        startWith<HealthState>({ kind: 'loading' }),
      ),
    { requireSync: true },
  );
}
