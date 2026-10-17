import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { UserSummary } from '@alerts/shared';

/** "Acting as" picker. Display only; the shell wires it to CurrentUser. */
@Component({
  selector: 'app-user-switcher',
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './user-switcher.html',
  styleUrl: './user-switcher.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSwitcher {
  readonly users = input.required<UserSummary[]>();
  readonly selectedId = input<string | undefined>();
  readonly selected = output<string>();
}
