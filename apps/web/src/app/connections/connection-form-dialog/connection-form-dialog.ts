import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type {
  ApiError,
  ChannelConnection,
  ChannelDescriptor,
  ConnectionInput,
} from '@alerts/shared';
import { ConnectionsApi } from '../../core/connections-api';
import { applyServerErrors, buildChannelForm } from '../generated-channel-form/channel-form';
import { GeneratedChannelForm } from '../generated-channel-form/generated-channel-form';

export interface ConnectionDialogData {
  channels: ChannelDescriptor[];
  /** Set when editing; the channel type then can't change (DS12). */
  connection?: ChannelConnection;
}

/** Add / edit a connection. Saves through the API and closes with the saved connection. */
@Component({
  selector: 'app-connection-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    GeneratedChannelForm,
  ],
  templateUrl: './connection-form-dialog.html',
  styleUrl: './connection-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionFormDialog {
  private readonly api = inject(ConnectionsApi);
  private readonly dialogRef =
    inject<MatDialogRef<ConnectionFormDialog, ChannelConnection>>(MatDialogRef);
  protected readonly data = inject<ConnectionDialogData>(MAT_DIALOG_DATA);
  protected readonly existing = this.data.connection;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    type: [
      {
        value: this.existing?.type ?? this.data.channels[0]?.type ?? '',
        disabled: !!this.existing,
      },
      Validators.required,
    ],
    label: [this.existing?.label ?? '', Validators.required],
  });

  private readonly type = toSignal(this.form.controls.type.valueChanges, {
    initialValue: this.form.controls.type.getRawValue(),
  });
  protected readonly descriptor = computed(() =>
    this.data.channels.find((c) => c.type === this.type()),
  );
  /** Rebuilt when the channel type changes (new connections only). */
  protected readonly configForm = computed(() =>
    buildChannelForm(this.descriptor()?.fields ?? [], this.existing?.config),
  );

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected submit(): void {
    const config = this.configForm();
    if (this.form.invalid || config.invalid) {
      this.form.markAllAsTouched();
      config.markAllAsTouched();
      return;
    }
    const input: ConnectionInput = { ...this.form.getRawValue(), config: config.getRawValue() };
    const request = this.existing
      ? this.api.update(this.existing.id, input)
      : this.api.create(input);

    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: (saved) => this.dialogRef.close(saved),
      error: (error: unknown) => this.showError(error),
    });
  }

  private showError(error: unknown): void {
    this.saving.set(false);
    const body =
      error instanceof HttpErrorResponse ? (error.error as Partial<ApiError> | null) : null;
    if (body?.fieldErrors) {
      const { type, label } = this.form.controls;
      const unmatched = applyServerErrors(
        { type, label, ...this.configForm().controls },
        body.fieldErrors,
      );
      const leftover = Object.values(unmatched);
      this.formError.set(leftover.length > 0 ? leftover.join(' ') : null);
      return;
    }
    this.formError.set(body?.message ?? 'Could not save the connection. Please try again.');
  }
}
