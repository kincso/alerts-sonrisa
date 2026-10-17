import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'connections' },
  {
    path: 'connections',
    title: 'Connections · World Alerts',
    loadComponent: () =>
      import('./connections/connections-page/connections-page').then((m) => m.ConnectionsPage),
  },
  { path: '**', redirectTo: 'connections' },
];
