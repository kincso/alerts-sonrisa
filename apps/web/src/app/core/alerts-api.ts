import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { Alert, AlertActivePatch, AlertInput, SourceSummary } from '@alerts/shared';

/** HTTP calls for alerts and the sources they watch. Identity comes from the interceptor. */
@Service()
export class AlertsApi {
  private readonly http = inject(HttpClient);

  sources(): Observable<SourceSummary[]> {
    return this.http.get<SourceSummary[]>('/api/sources');
  }

  list(): Observable<Alert[]> {
    return this.http.get<Alert[]>('/api/me/alerts');
  }

  create(input: AlertInput): Observable<Alert> {
    return this.http.post<Alert>('/api/me/alerts', input);
  }

  update(id: string, input: AlertInput): Observable<Alert> {
    return this.http.put<Alert>(`/api/me/alerts/${id}`, input);
  }

  setActive(id: string, active: boolean): Observable<Alert> {
    const body: AlertActivePatch = { active };
    return this.http.patch<Alert>(`/api/me/alerts/${id}`, body);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/me/alerts/${id}`);
  }
}
