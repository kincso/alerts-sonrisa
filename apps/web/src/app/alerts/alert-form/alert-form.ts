import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators, type AbstractControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule, type MatChipInputEvent } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  SEVERITIES,
  type Alert,
  type AlertInput,
  type ChannelConnection,
  type FieldErrors,
  type Severity,
  type SourceSummary,
} from '@alerts/shared';
import { severityLabel } from '../severity-label';

/**
 * The alert fields (A1, A14). Display only: the page loads sources and connections,
 * saves the emitted input and passes server field errors back in.
 */
@Component({
  selector: 'app-alert-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './alert-form.html',
  styleUrl: './alert-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertForm {
  readonly sources = input.required<SourceSummary[]>();
  readonly connections = input.required<ChannelConnection[]>();
  /** The alert being edited (fills the form); omitted for a new one. */
  readonly alert = input<Alert>();
  readonly saving = input(false);
  /** 400 `fieldErrors` from the API, shown on the matching fields. */
  readonly serverErrors = input<FieldErrors>({});

  readonly save = output<AlertInput>();

  protected readonly severities = SEVERITIES;
  protected readonly severityLabel = severityLabel;
  protected readonly separatorKeys = [ENTER, COMMA] as const;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    sourceId: ['', Validators.required],
    keywords: [[] as string[]],
    minSeverity: ['medium' as Severity, Validators.required],
    connectionIds: [[] as string[], Validators.required],
  });

  /** Server errors that match no field. */
  protected readonly otherErrors = signal<string[]>([]);

  private readonly value = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });
  private readonly source = computed(() =>
    this.sources().find((s) => s.id === this.value().sourceId),
  );
  /** D1 / decisions.md S3-3: e.g. "BBC items are always medium". */
  protected readonly fixedSeverityHint = computed(() => {
    const source = this.source();
    const fixed = source?.fixedSeverity;
    if (!source || !fixed) return null;
    const min = this.value().minSeverity ?? 'low';
    const never = SEVERITIES.indexOf(min) > SEVERITIES.indexOf(fixed);
    return (
      `Items from ${source.label} are always ${fixed}` +
      (never ? `, so this alert will never match.` : '.')
    );
  });

  constructor() {
    effect(() => {
      const alert = this.alert();
      if (alert) {
        const { name, sourceId, keywords, minSeverity, connectionIds } = alert;
        this.form.setValue({ name, sourceId, keywords, minSeverity, connectionIds });
      }
    });
    effect(() => this.applyServerErrors(this.serverErrors()));
  }

  protected addKeyword(event: MatChipInputEvent): void {
    const keyword = event.value.trim();
    const { keywords } = this.form.controls;
    const known = keywords.value.some((k) => k.toLowerCase() === keyword.toLowerCase());
    if (keyword && !known) keywords.setValue([...keywords.value, keyword]);
    event.chipInput.clear();
  }

  protected removeKeyword(keyword: string): void {
    const { keywords } = this.form.controls;
    keywords.setValue(keywords.value.filter((k) => k !== keyword));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.save.emit(this.form.getRawValue());
  }

  private applyServerErrors(fieldErrors: FieldErrors): void {
    const controls: Record<string, AbstractControl> = this.form.controls;
    const other: string[] = [];
    for (const [key, message] of Object.entries(fieldErrors)) {
      const control = controls[key];
      if (control) {
        control.setErrors({ server: message });
        control.markAsTouched();
      } else {
        other.push(message);
      }
    }
    this.otherErrors.set(other);
  }
}
