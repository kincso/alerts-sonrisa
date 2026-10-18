import { HttpErrorResponse } from '@angular/common/http';
import type { ApiError } from '@alerts/shared';

/** The API's `message` for a failed request, or `fallback`. */
export function apiMessage(error: unknown, fallback: string): string {
  const body =
    error instanceof HttpErrorResponse ? (error.error as Partial<ApiError> | null) : null;
  return body?.message ?? fallback;
}
