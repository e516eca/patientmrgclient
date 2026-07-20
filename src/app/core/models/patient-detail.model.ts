import { PatientGender } from './patient.model';

export interface VitalSignsDto {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  height: string;
  weight: string;
  bodyMassIndex: string;
}

export interface ConditionDto {
  code: string;
  displayName: string;
  recordedDate: string | null;
}

export interface MedicationDto {
  medicationName: string;
  dosageInstruction: string;
  status: string;
}

export interface PatientDetailDto {
  patientId: string;
  fullName: string;
  gender: PatientGender;
  dateOfBirth: string | null;
  phoneNumber: string;
  vitals: VitalSignsDto;
  activeConditions: ConditionDto[];
  activeMedications: MedicationDto[];
}
