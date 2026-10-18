import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { AdminAlertsTab } from '../admin-alerts-tab/admin-alerts-tab';
import { AdminChannelsTab } from '../admin-channels-tab/admin-channels-tab';
import { AdminDeliveriesTab } from '../admin-deliveries-tab/admin-deliveries-tab';
import { AdminSimulateTab } from '../admin-simulate-tab/admin-simulate-tab';
import { AdminSourcesTab } from '../admin-sources-tab/admin-sources-tab';

/**
 * Page: the admin view (A9). Each tab loads its own data the first time it is opened
 * (decisions.md S4-5). Behind adminGuard, which only hides it; the API checks the role.
 */
@Component({
  selector: 'app-admin-page',
  imports: [
    MatTabsModule,
    AdminAlertsTab,
    AdminChannelsTab,
    AdminDeliveriesTab,
    AdminSimulateTab,
    AdminSourcesTab,
  ],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPage {}
