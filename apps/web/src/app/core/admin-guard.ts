import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router, type CanMatchFn } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { CurrentUser } from './current-user';

/**
 * Hides /admin from non-admins (A8). Not a security check: the API's requireAdmin is.
 * Waits for the user list, so a reload on /admin as the admin stays there (S4-5).
 */
export const adminGuard: CanMatchFn = () => {
  const currentUser = inject(CurrentUser);
  const router = inject(Router);
  return toObservable(currentUser.users.isLoading).pipe(
    filter((loading) => !loading),
    take(1),
    map(() => currentUser.isAdmin() || router.parseUrl('/alerts')),
  );
};
