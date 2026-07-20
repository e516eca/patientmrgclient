import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'patients',
    loadComponent: () =>
      import('./features/patients/pages/patient-list-page/patient-list-page.component')
        .then((m) => m.PatientListPageComponent),
    title: 'Patients'
  },
  {
    path: 'patients/:id',
    loadComponent: () =>
      import('./features/patients/pages/patient-detail-page/patient-detail-page.component')
        .then((m) => m.PatientDetailPageComponent),
    title: 'Patient Details'
  },
  {
    path: 'patients/:id/summary',
    loadComponent: () =>
      import('./features/patients/pages/patient-summary-page/patient-summary-page.component')
        .then((m) => m.PatientSummaryPageComponent),
    title: 'Patient Summary'
  },
  { path: '', pathMatch: 'full', redirectTo: 'patients' },
  { path: '**', redirectTo: 'patients' }
];
