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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  SEVERITIES,
  type FieldErrors,
  type Severity,
  type SimulateEventInput,
  type SourceSummary,
} from '@alerts/shared';
import { severityLabel } from '../../alerts/severity-label';

/**
 * The simulate-event fields (A18). Display only: the tab sends the emitted input and
 * passes server field errors back in. A source with `fixedSeverity` locks the severity
 * (decisions.md S4-4); the server checks it again (S3-2).
 */
@Component({
  selector: 'app-simulate-event-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './simulate-event-form.html',
  styleUrl: './simulate-event-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulateEventForm {
  readonly sources = input.required<readonly SourceSummary[]>();
  readonly sending = input(false);
  /** 400 `fieldErrors` from the API, shown on the matching fields. */
  readonly serverErrors = input<FieldErrors>({});

  readonly simulate = output<SimulateEventInput>();

  protected readonly severities = SEVERITIES;
  protected readonly severityLabel = severityLabel;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    sourceId: ['', Validators.required],
    title: ['', Validators.required],
    summary: [''],
    severity: ['medium' as Severity, Validators.required],
    sourceEventId: [''],
  });

  /** Server errors that match no field. */
  protected readonly otherErrors = signal<string[]>([]);

  private readonly sourceId = toSignal(this.form.controls.sourceId.valueChanges, {
    initialValue: '',
  });
  protected readonly fixedSeverity = computed(
    () => this.sources().find((s) => s.id === this.sourceId())?.fixedSeverity,
  );

  constructor() {
    effect(() => this.lockSeverity(this.fixedSeverity()));
    effect(() => this.applyServerErrors(this.serverErrors()));
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // getRawValue: the severity control is disabled while it is locked.
    const { sourceId, title, summary, severity, sourceEventId } = this.form.getRawValue();
    this.simulate.emit({
      sourceId,
      title,
      severity,
      ...(summary.trim() ? { summary } : {}),
      ...(sourceEventId.trim() ? { sourceEventId } : {}),
    });
  }

  private lockSeverity(fixed: Severity | undefined): void {
    const { severity } = this.form.controls;
    if (fixed) {
      severity.setValue(fixed);
      severity.disable();
    } else {
      severity.enable();
    }
  }

  private applyServerErrors(fieldErrors: FieldErrors): void {
    const controls: Record<string, AbstractControl> = this.form.controls;
    const other: string[] = [];
    for (const [key, message] of Object.entries(fieldErrors)) {
      const control = controls[key];
      if (control?.enabled) {
        control.setErrors({ server: message });
        control.markAsTouched();
      } else {
        other.push(message);
      }
    }
    this.otherErrors.set(other);
  }
}
