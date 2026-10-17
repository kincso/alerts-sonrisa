/** Field key → message. `{}` means valid. */
export type FieldErrors = Record<string, string>;

/** Body of every error response; `fieldErrors` only on 400. */
export interface ApiError {
  message: string;
  fieldErrors?: FieldErrors;
}
