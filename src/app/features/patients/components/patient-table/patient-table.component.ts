import { DatePipe, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output
} from '@angular/core';
import { PatientDemographic } from '../../../../core/models/patient.model';

@Component({
  selector: 'app-patient-table',
  standalone: true,
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './patient-table.component.html',
  styleUrl: './patient-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientTableComponent {
  readonly patients = input.required<PatientDemographic[]>();
  readonly loading = input(false);
  readonly deletingId = input<string | null>(null);
  readonly hasFilter = input(false);

  readonly viewPatient = output<PatientDemographic>();
  readonly editPatient = output<PatientDemographic>();
  readonly deletePatient = output<PatientDemographic>();
  readonly summaryPatient = output<PatientDemographic>();
}
