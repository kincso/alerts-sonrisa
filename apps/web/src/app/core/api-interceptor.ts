import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import type { ApiError } from '@alerts/shared';
import { CurrentUser } from './current-user';

function messageFor(error: HttpErrorResponse): string | undefined {
  const body = error.error as Partial<ApiError> | null;
  if (error.status === 0) return 'Cannot reach the server. Is the API running?';
  if (error.status === 401 || error.status === 403 || error.status >= 500) {
    return body?.message ?? 'Something went wrong. Please try again.';
  }
  return undefined; // 400/404/409 are handled by the page that made the request
}

/** The one interceptor (A8): adds X-User-Id and shows 401/403/5xx in a snackbar. */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const userId = inject(CurrentUser).userId();
  const snackBar = inject(MatSnackBar);
  const withUser =
    userId && req.url.startsWith('/api/')
      ? req.clone({ setHeaders: { 'X-User-Id': userId } })
      : req;

  return next(withUser).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const message = messageFor(error);
        if (message) snackBar.open(message, 'Dismiss', { duration: 6000 });
      }
      return throwError(() => error);
    }),
  );
};
