import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  FhirPatientResource,
  PatientDemographic,
  PatientFormValue,
  PatientGender
} from '../models/patient.model';
import {
  ConditionDto,
  MedicationDto,
  PatientDetailDto,
  VitalSignsDto
} from '../models/patient-detail.model';

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private readonly http = inject(HttpClient);
  private readonly patientUrl = `${environment.apiBaseUrl}/Patient`;
  private readonly detailsUrl = `${environment.apiBaseUrl}/PatientDetails`;

  getAllPatients(): Observable<PatientDemographic[]> {
    return this.http.get<unknown>(`${this.patientUrl}/all`).pipe(
      map((response) => this.parseMaybeJson(response)),
      map((response) => this.extractCollection(response)),
      map((patients) => patients.map((patient) => this.normalizePatient(patient)))
    );
  }

  searchPatientsByLastName(lastName: string): Observable<PatientDemographic[]> {
    const params = new HttpParams().set('lastName', lastName.trim());

    return this.http.get<unknown>(`${this.patientUrl}/patient`, { params }).pipe(
      map((response) => this.parseMaybeJson(response)),
      map((response) => {
        const patients = this.extractCollection(response);
        if (patients.length > 0) {
          return patients.map((patient) => this.normalizePatient(patient));
        }

        return this.isRecord(response) ? [this.normalizePatient(response)] : [];
      })
    );
  }

  getPatientDetails(patientId: string): Observable<PatientDetailDto> {
    const params = new HttpParams().set('patientId', patientId);

    return this.http
      .get<unknown>(`${this.detailsUrl}`, { params })
      .pipe(
        map((response) => this.parseMaybeJson(response)),
        map((response) => this.normalizePatientDetails(response))
      );
  }

  getPatientSummary(patientId: string): Observable<unknown> {
    const params = new HttpParams().set('patientId', patientId);

    return this.http
      .get<unknown>(`${this.detailsUrl}/summary`, { params })
      .pipe(map((response) => this.parseMaybeJson(response)));
  }

  createPatient(value: PatientFormValue): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.patientUrl}/create`,
      this.toFhirPatient(value)
    );
  }

  updatePatient(patientId: string, value: PatientFormValue): Observable<unknown> {
    return this.http.put<unknown>(
      `${this.patientUrl}/Edit`,
      this.toFhirPatient(value, patientId)
    );
  }

  deletePatient(patientId: string): Observable<unknown> {
    const params = new HttpParams().set('patientId', patientId);
    return this.http.delete<unknown>(`${this.patientUrl}/delete`, { params });
  }

  private toFhirPatient(
    value: PatientFormValue,
    patientId?: string
  ): FhirPatientResource {
    const phoneNumber = value.phoneNumber?.trim() || '';

    return {
      resourceType: 'Patient',
      ...(patientId ? { id: patientId } : {}),
      name: [
        {
          use: 'official',
          family: value.familyName.trim(),
          given: [value.givenName.trim()]
        }
      ],
      gender: value.gender,
      birthDate: value.dateOfBirth,
      ...(phoneNumber
        ? {
            telecom: [
              {
                system: 'phone',
                value: phoneNumber
              }
            ]
          }
        : {})
    };
  }

  private parseMaybeJson(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private extractCollection(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response.filter(this.isRecord);
    }

    if (!this.isRecord(response)) {
      return [];
    }

    const collectionKeys = [
      'patients', 'Patients', 'items', 'Items', 'data', 'Data',
      'results', 'Results', 'value', 'Value'
    ];

    for (const key of collectionKeys) {
      const candidate = response[key];
      if (Array.isArray(candidate)) {
        return candidate.filter(this.isRecord);
      }
    }

    const entries = response['entry'] ?? response['Entry'];
    if (Array.isArray(entries)) {
      return entries
        .filter(this.isRecord)
        .map((entry) => entry['resource'] ?? entry['Resource'])
        .filter(this.isRecord);
    }

    return [];
  }

  private normalizePatient(raw: Record<string, unknown>): PatientDemographic {
    const name = this.readFhirName(raw);
    const givenName = this.readString(raw, ['givenName', 'GivenName']) || name.givenName;
    const familyName = this.readString(raw, ['familyName', 'FamilyName']) || name.familyName;
    const suppliedFullName = this.readString(raw, ['fullName', 'FullName']);
    const fullName = suppliedFullName || [givenName, familyName].filter(Boolean).join(' ') || 'Unnamed patient';

    return {
      patientId: this.readString(raw, ['patientId', 'PatientId', 'id', 'Id']),
      givenName,
      familyName,
      fullName,
      gender: this.normalizeGender(this.readString(raw, ['gender', 'Gender'])),
      dateOfBirth: this.readNullableString(raw, [
        'dateOfBirth', 'DateOfBirth', 'birthDate', 'BirthDate'
      ]),
      phoneNumber:
        this.readString(raw, ['phoneNumber', 'PhoneNumber', 'phone', 'Phone']) ||
        this.readFhirPhone(raw)
    };
  }

  private normalizePatientDetails(response: unknown): PatientDetailDto {
    const raw = this.isRecord(response) ? response : {};
    const vitalsRaw = this.readRecord(raw, ['vitals', 'Vitals']);
    const conditionsRaw = this.readArray(raw, ['activeConditions', 'ActiveConditions']);
    const medicationsRaw = this.readArray(raw, ['activeMedications', 'ActiveMedications']);

    return {
      patientId: this.readString(raw, ['patientId', 'PatientId', 'id', 'Id']),
      fullName: this.readString(raw, ['fullName', 'FullName']) || 'Unnamed patient',
      gender: this.normalizeGender(this.readString(raw, ['gender', 'Gender'])),
      dateOfBirth: this.readNullableString(raw, ['dateOfBirth', 'DateOfBirth']),
      phoneNumber: this.readString(raw, ['phoneNumber', 'PhoneNumber']),
      vitals: this.normalizeVitals(vitalsRaw),
      activeConditions: conditionsRaw
        .filter(this.isRecord)
        .map((item) => this.normalizeCondition(item)),
      activeMedications: medicationsRaw
        .filter(this.isRecord)
        .map((item) => this.normalizeMedication(item))
    };
  }

  private normalizeVitals(raw: Record<string, unknown>): VitalSignsDto {
    return {
      bloodPressure: this.readString(raw, ['bloodPressure', 'BloodPressure']),
      heartRate: this.readString(raw, ['heartRate', 'HeartRate']),
      temperature: this.readString(raw, ['temperature', 'Temperature']),
      respiratoryRate: this.readString(raw, ['respiratoryRate', 'RespiratoryRate']),
      oxygenSaturation: this.readString(raw, ['oxygenSaturation', 'OxygenSaturation']),
      height: this.readString(raw, ['height', 'Height']),
      weight: this.readString(raw, ['weight', 'Weight']),
      bodyMassIndex: this.readString(raw, ['bodyMassIndex', 'BodyMassIndex'])
    };
  }

  private normalizeCondition(raw: Record<string, unknown>): ConditionDto {
    return {
      code: this.readString(raw, ['code', 'Code']),
      displayName: this.readString(raw, ['displayName', 'DisplayName']),
      recordedDate: this.readNullableString(raw, ['recordedDate', 'RecordedDate'])
    };
  }

  private normalizeMedication(raw: Record<string, unknown>): MedicationDto {
    return {
      medicationName: this.readString(raw, ['medicationName', 'MedicationName']),
      dosageInstruction: this.readString(raw, ['dosageInstruction', 'DosageInstruction']),
      status: this.readString(raw, ['status', 'Status'])
    };
  }

  private readFhirName(raw: Record<string, unknown>): {
    givenName: string;
    familyName: string;
  } {
    const names = raw['name'] ?? raw['Name'];
    if (!Array.isArray(names)) {
      return { givenName: '', familyName: '' };
    }

    const official = names.find(
      (item) => this.isRecord(item) && String(item['use'] ?? item['Use'] ?? '').toLowerCase() === 'official'
    );
    const selected = this.isRecord(official)
      ? official
      : names.find(this.isRecord);

    if (!this.isRecord(selected)) {
      return { givenName: '', familyName: '' };
    }

    const given = selected['given'] ?? selected['Given'];
    return {
      givenName: Array.isArray(given) ? given.map(String).join(' ') : String(given ?? ''),
      familyName: String(selected['family'] ?? selected['Family'] ?? '')
    };
  }

  private readFhirPhone(raw: Record<string, unknown>): string {
    const telecom = raw['telecom'] ?? raw['Telecom'];
    if (!Array.isArray(telecom)) {
      return '';
    }

    const phone = telecom.find((item) => {
      if (!this.isRecord(item)) {
        return false;
      }
      return String(item['system'] ?? item['System'] ?? '').toLowerCase() === 'phone';
    });

    return this.isRecord(phone)
      ? String(phone['value'] ?? phone['Value'] ?? '')
      : '';
  }

  private readString(raw: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = raw[key];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return '';
  }

  private readNullableString(
    raw: Record<string, unknown>,
    keys: string[]
  ): string | null {
    const value = this.readString(raw, keys);
    return value || null;
  }

  private readRecord(
    raw: Record<string, unknown>,
    keys: string[]
  ): Record<string, unknown> {
    for (const key of keys) {
      if (this.isRecord(raw[key])) {
        return raw[key];
      }
    }
    return {};
  }

  private readArray(raw: Record<string, unknown>, keys: string[]): unknown[] {
    for (const key of keys) {
      if (Array.isArray(raw[key])) {
        return raw[key];
      }
    }
    return [];
  }

  private normalizeGender(value: string): PatientGender {
    const normalized = value.toLowerCase();
    return normalized === 'male' ||
      normalized === 'female' ||
      normalized === 'other' ||
      normalized === 'unknown'
      ? normalized
      : 'unknown';
  }

  private readonly isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
}
