import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, map, switchMap } from 'rxjs';
import { PatientApiService } from '../../../../core/services/patient-api.service';

interface SummarySection {
  title: string;
  body: string[];
}

@Component({
  selector: 'app-patient-summary-page',
  standalone: true,
  imports: [],
  templateUrl: './patient-summary-page.component.html',
  styleUrl: './patient-summary-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PatientSummaryPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly patientApi = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly summary = signal<SummarySection[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((patientId) => {
          this.loading.set(true);
          this.errorMessage.set('');
          return this.patientApi.getPatientSummary(patientId).pipe(finalize(() => this.loading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.summary.set(this.normalizeSummary(response));
        },
        error: (error: unknown) => {
          console.error(error);
          this.errorMessage.set('The patient summary could not be loaded.');
        }
      });
  }

  closeSummary(): void {
    void this.router.navigate(['/patients']);
  }

  private normalizeSummary(response: unknown): SummarySection[] {
    if (typeof response === 'string') {
      const parsed = this.tryParseJson(response);
      if (parsed) {
        return this.normalizeSummary(parsed);
      }

      return [{ title: 'Summary', body: this.formatPlainText(response) }];
    }

    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      const candidates = [
        record['patientSummary'],
        record['patientsummary'],
        record['summary'],
        record['Summary'],
        record['message'],
        record['Message'],
        record['content'],
        record['Content'],
        record['result'],
        record['Result']
      ];

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return this.normalizeSummary(candidate);
        }
      }

      const sections: SummarySection[] = [];
      for (const [key, value] of Object.entries(record)) {
        const body = this.toBodyLines(value);
        if (body.length > 0) {
          sections.push({ title: this.humanizeTitle(key), body });
        }
      }

      return sections.length > 0 ? sections : [{ title: 'Summary', body: ['No summary available.'] }];
    }

    return [{ title: 'Summary', body: ['No summary available.'] }];
  }

  private tryParseJson(value: string): unknown | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  private formatPlainText(value: string): string[] {
    return value
      .split(/\r?\n/)
      .map((line) => this.cleanMarkdownLine(line))
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private toBodyLines(value: unknown): string[] {
    if (typeof value === 'string') {
      return this.formatPlainText(value);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.toBodyLines(item));
    }

    if (value && typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).map(([key, entry]) => `${this.humanizeTitle(key)}: ${this.cleanText(this.stringifyValue(entry))}`);
    }

    return [this.cleanText(String(value ?? ''))];
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.stringifyValue(item)).join(', ');
    }

    if (value && typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return String(value ?? '');
  }

  private cleanMarkdownLine(value: string): string {
    return this.cleanText(
      value
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^[-*]\s+/gm, '')
        .replace(/^>\s*/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`([^`]*)`/g, '$1')
        .replace(/---/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\s+/g, ' ')
    );
  }

  private cleanText(value: string): string {
    return value
      .replace(/^[\s:]+/, '')
      .replace(/^[\s:]+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private humanizeTitle(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (char) => char.toUpperCase());
  }
}
