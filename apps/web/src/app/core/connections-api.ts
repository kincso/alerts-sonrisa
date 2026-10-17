import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type {
  ChannelConnection,
  ChannelDescriptor,
  ConnectionInput,
  SendResult,
} from '@alerts/shared';

/** HTTP calls for channels and connections. Identity comes from the interceptor. */
@Service()
export class ConnectionsApi {
  private readonly http = inject(HttpClient);

  channels(): Observable<ChannelDescriptor[]> {
    return this.http.get<ChannelDescriptor[]>('/api/channels');
  }

  list(): Observable<ChannelConnection[]> {
    return this.http.get<ChannelConnection[]>('/api/me/connections');
  }

  create(input: ConnectionInput): Observable<ChannelConnection> {
    return this.http.post<ChannelConnection>('/api/me/connections', input);
  }

  update(id: string, input: ConnectionInput): Observable<ChannelConnection> {
    return this.http.put<ChannelConnection>(`/api/me/connections/${id}`, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`/api/me/connections/${id}`);
  }

  sendTest(id: string): Observable<SendResult> {
    return this.http.post<SendResult>(`/api/me/connections/${id}/test`, null);
  }
}
