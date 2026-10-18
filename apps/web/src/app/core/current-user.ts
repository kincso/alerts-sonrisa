import { computed, inject, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import type { UserSummary } from '@alerts/shared';

const STORAGE_KEY = 'alerts.actingAs';

function readStoredId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked: fall back to the default user
  }
}

function storeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage blocked: the choice just won't survive a reload
  }
}

/**
 * The only place identity lives in the web app (A8). Mock: the "Acting as"
 * switcher picks a seeded user; the API interceptor sends their id.
 */
@Service()
export class CurrentUser {
  private readonly http = inject(HttpClient);
  private readonly selectedId = signal<string | null>(readStoredId());

  /** GET /api/users is public (DS6), so it loads before anyone is selected. */
  readonly users = rxResource({
    stream: () => this.http.get<UserSummary[]>('/api/users'),
    defaultValue: [],
  });

  /** The stored choice, or the first non-admin user (decisions.md S1-4). */
  readonly user = computed<UserSummary | undefined>(() => {
    const users = this.users.hasValue() ? this.users.value() : [];
    return users.find((u) => u.id === this.selectedId()) ?? users.find((u) => u.role === 'user');
  });

  readonly userId = computed(() => this.user()?.id);
  readonly isAdmin = computed(() => this.user()?.role === 'admin');

  /**
   * Key for admin-only resources: the id while the user is an admin, otherwise
   * undefined, so they go idle instead of reloading as a user (decisions.md S5-2).
   */
  readonly adminId = computed(() => (this.isAdmin() ? this.userId() : undefined));

  select(id: string): void {
    this.selectedId.set(id);
    storeId(id);
  }
}
