export type PatientGender = 'male' | 'female' | 'other' | 'unknown';

export interface PatientDemographic {
  patientId: string;
  givenName: string;
  familyName: string;
  fullName: string;
  gender: PatientGender;
  dateOfBirth: string | null;
  phoneNumber: string;
}

export interface PatientFormValue {
  givenName: string;
  familyName: string;
  gender: PatientGender;
  dateOfBirth: string;
  phoneNumber: string;
}

export interface FhirHumanName {
  use?: string;
  family: string;
  given: string[];
}

export interface FhirPatientResource {
  resourceType: 'Patient';
  id?: string;
  name: FhirHumanName[];
  gender: PatientGender;
  birthDate: string;
}
