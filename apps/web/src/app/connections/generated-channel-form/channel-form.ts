import { FormControl, FormGroup, Validators } from '@angular/forms';
import type { ChannelConfig, ChannelField, FieldErrors } from '@alerts/shared';

/** One string control per channel field (A12). */
export type ChannelForm = FormGroup<Record<string, FormControl<string>>>;

/**
 * Builds the settings form from GET /api/channels metadata. Only `required` is
 * checked here; everything else is the channel's server-side `validate()`.
 */
export function buildChannelForm(fields: ChannelField[], initial: ChannelConfig = {}): ChannelForm {
  const controls: Record<string, FormControl<string>> = {};
  for (const field of fields) {
    controls[field.key] = new FormControl(initial[field.key] ?? '', {
      nonNullable: true,
      validators: field.required ? [Validators.required] : [],
    });
  }
  return new FormGroup(controls);
}

/**
 * Puts server `validate()` messages on matching controls as `{ server: message }`.
 * Returns the errors that matched no control.
 */
export function applyServerErrors(
  controls: Record<string, FormControl<string> | undefined>,
  fieldErrors: FieldErrors,
): FieldErrors {
  const unmatched: FieldErrors = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    const control = controls[key];
    if (control) {
      control.setErrors({ server: message });
      control.markAsTouched();
    } else {
      unmatched[key] = message;
    }
  }
  return unmatched;
}
