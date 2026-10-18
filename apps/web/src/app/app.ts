import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CurrentUser } from './core/current-user';
import { UserSwitcher } from './shell/user-switcher/user-switcher';

/** App shell: toolbar, navigation and the mock "Acting as" switcher. */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    UserSwitcher,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly currentUser = inject(CurrentUser);
  private readonly router = inject(Router);

  constructor() {
    // adminGuard runs only on navigation, so switching to a non-admin while on /admin
    // must leave the page here (testing.md S4-14).
    effect(() => {
      if (this.currentUser.users.isLoading() || this.currentUser.isAdmin()) return;
      if (this.router.url.startsWith('/admin')) void this.router.navigateByUrl('/alerts');
    });
  }
}
