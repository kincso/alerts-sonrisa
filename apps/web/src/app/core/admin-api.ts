import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  AdminAlertView,
  AdminDeliveryView,
  ChannelTypeSummary,
  EnabledPatch,
  PollResult,
  SimulateEventInput,
  SimulateEventResult,
  SourceHealth,
} from '@alerts/shared';

/** HTTP calls for the admin view (A9). The server's requireAdmin is the real check. */
@Service()
export class AdminApi {
  private readonly http = inject(HttpClient);

  alerts(): Observable<AdminAlertView[]> {
    return this.http.get<AdminAlertView[]>('/api/admin/alerts');
  }

  deliveries(): Observable<AdminDeliveryView[]> {
    return this.http.get<AdminDeliveryView[]>('/api/admin/deliveries');
  }

  sources(): Observable<SourceHealth[]> {
    return this.http.get<SourceHealth[]>('/api/admin/sources');
  }

  setSourceEnabled(id: string, enabled: boolean): Observable<SourceHealth> {
    const body: EnabledPatch = { enabled };
    return this.http.patch<SourceHealth>(`/api/admin/sources/${id}`, body);
  }

  pollSource(id: string): Observable<PollResult> {
    return this.http.post<PollResult>(`/api/admin/sources/${id}/poll`, null);
  }

  channels(): Observable<ChannelTypeSummary[]> {
    return this.http.get<ChannelTypeSummary[]>('/api/admin/channels');
  }

  setChannelEnabled(type: string, enabled: boolean): Observable<ChannelTypeSummary> {
    const body: EnabledPatch = { enabled };
    return this.http.patch<ChannelTypeSummary>(`/api/admin/channels/${type}`, body);
  }

  simulate(input: SimulateEventInput): Observable<SimulateEventResult> {
    return this.http.post<SimulateEventResult>('/api/admin/simulate-event', input);
  }
}
