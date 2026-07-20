import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { PatientDemographic, PatientFormValue } from '../../../../core/models/patient.model';
import { PatientApiService } from '../../../../core/services/patient-api.service';
import { PaginationComponent } from '../../components/pagination/pagination.component';
import { PatientFormComponent } from '../../components/patient-form/patient-form.component';
import { PatientTableComponent } from '../../components/patient-table/patient-table.component';

@Component({
  selector: 'app-patient-list-page',
  standalone: true,
  imports: [PatientTableComponent, PatientFormComponent, PaginationComponent],
  templateUrl: './patient-list-page.component.html',
  styleUrl: './patient-list-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientListPageComponent {
  private readonly patientApi = inject(PatientApiService);
  private readonly router = inject(Router);

  readonly patients = signal<PatientDemographic[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly searchTerm = signal('');
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly formOpen = signal(false);
  readonly editingPatient = signal<PatientDemographic | null>(null);

  readonly filteredPatients = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.patients();
    }

    return this.patients().filter((patient) =>
      `${patient.fullName} ${patient.givenName} ${patient.familyName}`
        .toLowerCase()
        .includes(term)
    );
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPatients().length / this.pageSize()))
  );

  readonly pagedPatients = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPatients().slice(start, start + this.pageSize());
  });

  readonly rangeStart = computed(() =>
    this.filteredPatients().length === 0
      ? 0
      : (this.currentPage() - 1) * this.pageSize() + 1
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize(), this.filteredPatients().length)
  );

  constructor() {
    this.loadPatients();
  }

  loadPatients(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.patientApi
      .getAllPatients()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (patients) => {
          this.patients.set(patients);
          this.ensureValidPage();
        },
        error: (error: unknown) => {
          console.error(error);
          this.errorMessage.set(
            'Could not load patients. Verify that the ASP.NET Core API is running, its HTTPS certificate is trusted, and CORS allows the Angular origin.'
          );
        }
      });
  }

  setSearchTerm(value: string): void {
    const normalizedValue = value.trim();
    this.searchTerm.set(normalizedValue);
    this.currentPage.set(1);
    this.clearMessages();

    if (!normalizedValue) {
      this.loadPatients();
      return;
    }

    this.loading.set(true);
    this.patientApi
      .searchPatientsByLastName(normalizedValue)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (patients) => {
          this.patients.set(patients);
          this.ensureValidPage();
        },
        error: (error: unknown) => {
          console.error(error);
          this.errorMessage.set('Could not search patients. Verify that the API endpoint is reachable and accepts the lastName query parameter.');
        }
      });
  }

  setPage(page: number): void {
    this.currentPage.set(page);
  }

  startCreate(): void {
    this.clearMessages();
    this.editingPatient.set(null);
    this.formOpen.set(true);
  }

  startEdit(patient: PatientDemographic): void {
    this.clearMessages();
    this.editingPatient.set(patient);
    this.formOpen.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingPatient.set(null);
  }

  savePatient(value: PatientFormValue): void {
    this.saving.set(true);
    this.clearMessages();
    const patient = this.editingPatient();
    const request$ = patient
      ? this.patientApi.updatePatient(patient.patientId, value)
      : this.patientApi.createPatient(value);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(patient ? 'Patient updated successfully.' : 'Patient created successfully.');
          this.closeForm();
          this.loadPatients();
        },
        error: (error: unknown) => {
          console.error(error);
          this.errorMessage.set(
            patient
              ? 'The patient could not be updated. Check the API response and FHIR validation errors.'
              : 'The patient could not be created. Check the API response and FHIR validation errors.'
          );
        }
      });
  }

  confirmDelete(patient: PatientDemographic): void {
    const confirmed = window.confirm(
      `Delete ${patient.fullName}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    this.deletingId.set(patient.patientId);
    this.clearMessages();

    this.patientApi
      .deletePatient(patient.patientId)
      .pipe(finalize(() => this.deletingId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Patient deleted successfully.');
          this.loadPatients();
        },
        error: (error: unknown) => {
          console.error(error);
          this.errorMessage.set('The patient could not be deleted.');
        }
      });
  }

  viewPatient(patient: PatientDemographic): void {
    if (!patient.patientId) {
      this.errorMessage.set('This patient record does not contain an ID.');
      return;
    }

    void this.router.navigate(['/patients', patient.patientId]);
  }

  showPatientSummary(patient: PatientDemographic): void {
    if (!patient.patientId) {
      this.errorMessage.set('This patient record does not contain an ID.');
      return;
    }

    void this.router.navigate(['/patients', patient.patientId, 'summary']);
  }

  dismissError(): void {
    this.errorMessage.set('');
  }

  dismissSuccess(): void {
    this.successMessage.set('');
  }

  private clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private ensureValidPage(): void {
    if (this.currentPage() > this.totalPages()) {
      this.currentPage.set(this.totalPages());
    }
  }
}
