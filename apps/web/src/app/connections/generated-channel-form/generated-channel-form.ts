import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import type { ChannelField } from '@alerts/shared';
import type { ChannelForm } from './channel-form';

/**
 * Renders one labelled input per channel field (A12). Display only: the parent
 * builds the form with `buildChannelForm` and owns submit.
 */
@Component({
  selector: 'app-generated-channel-form',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './generated-channel-form.html',
  styleUrl: './generated-channel-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GeneratedChannelForm {
  readonly fields = input.required<ChannelField[]>();
  readonly form = input.required<ChannelForm>();
}
