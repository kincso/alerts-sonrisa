import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { DeliveryView } from '@alerts/shared';

/** The current user's notification history (A17). Identity comes from the interceptor. */
@Service()
export class DeliveriesApi {
  private readonly http = inject(HttpClient);

  mine(): Observable<DeliveryView[]> {
    return this.http.get<DeliveryView[]>('/api/me/deliveries');
  }
}
