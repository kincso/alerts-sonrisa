import { Routes } from '@angular/router';
import { adminGuard } from './core/admin-guard';

const loadEditPage = () =>
  import('./alerts/alert-edit-page/alert-edit-page').then((m) => m.AlertEditPage);

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'alerts' },
  {
    path: 'alerts',
    title: 'Alerts · World Alerts',
    loadComponent: () => import('./alerts/alerts-page/alerts-page').then((m) => m.AlertsPage),
  },
  { path: 'alerts/new', title: 'New alert · World Alerts', loadComponent: loadEditPage },
  { path: 'alerts/:id', title: 'Edit alert · World Alerts', loadComponent: loadEditPage },
  {
    path: 'connections',
    title: 'Connections · World Alerts',
    loadComponent: () =>
      import('./connections/connections-page/connections-page').then((m) => m.ConnectionsPage),
  },
  {
    path: 'history',
    title: 'History · World Alerts',
    loadComponent: () => import('./history/history-page/history-page').then((m) => m.HistoryPage),
  },
  {
    path: 'admin',
    title: 'Admin · World Alerts',
    // Only hides the route (A8): a non-admin is sent to /alerts. The API checks the role.
    canMatch: [adminGuard],
    loadComponent: () => import('./admin/admin-page/admin-page').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: 'alerts' },
];
