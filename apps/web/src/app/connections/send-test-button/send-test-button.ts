import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import type { SendResult } from '@alerts/shared';

export type TestState =
  { kind: 'pending' } | { kind: 'done'; result: SendResult } | { kind: 'error'; message: string };

const STATUS_TEXT: Record<SendResult['status'], string> = {
  sent: 'Sent',
  'dry-run': 'Dry run: nothing was sent (no webhook URL)',
  failed: 'Failed',
};

/** "Send test" (A18) with its pending state and result. Display only. */
@Component({
  selector: 'app-send-test-button',
  imports: [MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './send-test-button.html',
  styleUrl: './send-test-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendTestButton {
  readonly state = input<TestState>();
  /** Connection name, for the button's accessible label. */
  readonly connectionLabel = input.required<string>();
  readonly send = output();

  protected readonly statusText = STATUS_TEXT;
}
