import type { Response } from 'express';
import type { ApiError, FieldErrors } from '@alerts/shared';

export function sendFieldErrors(res: Response, fieldErrors: FieldErrors): void {
  const body: ApiError = { message: 'Please fix the highlighted fields.', fieldErrors };
  res.status(400).json(body);
}

/** Also used for another user's resource, so the API never reveals that it exists. */
export function sendNotFound(res: Response, message: string): void {
  const body: ApiError = { message };
  res.status(404).json(body);
}
