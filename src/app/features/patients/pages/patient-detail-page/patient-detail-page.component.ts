import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';
import { PatientDetailDto } from '../../../../core/models/patient-detail.model';
import { PatientApiService } from '../../../../core/services/patient-api.service';

@Component({
  selector: 'app-patient-detail-page',
  standalone: true,
  imports: [RouterLink, DatePipe, TitleCasePipe],
  templateUrl: './patient-detail-page.component.html',
  styleUrl: './patient-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly patientApi = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly patient = signal<PatientDetailDto | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  readonly vitalCards = [
    { key: 'bloodPressure', label: 'Blood pressure', symbol: 'BP' },
    { key: 'heartRate', label: 'Heart rate', symbol: 'HR' },
    { key: 'temperature', label: 'Temperature', symbol: 'T' },
    { key: 'respiratoryRate', label: 'Respiratory rate', symbol: 'RR' },
    { key: 'oxygenSaturation', label: 'Oxygen saturation', symbol: 'O₂' },
    { key: 'height', label: 'Height', symbol: 'H' },
    { key: 'weight', label: 'Weight', symbol: 'W' },
    { key: 'bodyMassIndex', label: 'Body mass index', symbol: 'BMI' }
  ] as const;

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((patientId) => {
          this.loading.set(true);
          this.errorMessage.set('');
          return this.patientApi.getPatientDetails(patientId);
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (patient) => {
          this.patient.set(patient);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          console.error(error);
          this.loading.set(false);
          this.errorMessage.set('Patient details could not be loaded.');
        }
      });
  }
}
