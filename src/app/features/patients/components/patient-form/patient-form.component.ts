import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import {
  PatientDemographic,
  PatientFormValue,
  PatientGender
} from '../../../../core/models/patient.model';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './patient-form.component.html',
  styleUrl: './patient-form.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly patient = input<PatientDemographic | null>(null);
  readonly saving = input(false);
  readonly saved = output<PatientFormValue>();
  readonly cancelled = output<void>();

  readonly isEditing = computed(() => this.patient() !== null);
  readonly maxBirthDate = new Date().toISOString().slice(0, 10);

  readonly form = this.formBuilder.group({
    givenName: this.formBuilder.control('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    familyName: this.formBuilder.control('', [
      Validators.required,
      Validators.maxLength(100)
    ]),
    gender: this.formBuilder.control<PatientGender>('unknown', [Validators.required]),
    dateOfBirth: this.formBuilder.control('', [
      Validators.required,
      this.notInFutureValidator
    ]),
    phoneNumber: this.formBuilder.control('', [Validators.maxLength(30)])
  });

  constructor() {
    effect(() => {
      const patient = this.patient();

      if (patient) {
        this.form.reset({
          givenName: patient.givenName,
          familyName: patient.familyName,
          gender: patient.gender,
          dateOfBirth: this.toDateInputValue(patient.dateOfBirth),
          phoneNumber: patient.phoneNumber ?? ''
        });
      } else {
        this.form.reset({
          givenName: '',
          familyName: '',
          gender: 'unknown',
          dateOfBirth: '',
          phoneNumber: ''
        });
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saved.emit(this.form.getRawValue());
  }

  cancel(): void {
    this.cancelled.emit();
  }

  isInvalid(controlName: keyof PatientFormValue): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  private toDateInputValue(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }

  private notInFutureValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const selected = new Date(`${String(control.value)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return selected > today ? { futureDate: true } : null;
  }
}
