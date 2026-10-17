import { Routes } from '@angular/router';

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
  { path: '**', redirectTo: 'alerts' },
];
