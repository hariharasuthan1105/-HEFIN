import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserSession {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  patient_identifier?: string;
}

export interface DemoPatientOption {
  username: string;
  name: string;
  identifier: string;
  city: string;
  token: string;
}

export const DEMO_PATIENTS: DemoPatientOption[] = [
  {
    username: 'aarav.sharma',
    name: 'Aarav Sharma',
    identifier: 'HEF-PAT-2026-9814',
    city: 'Bengaluru',
    token: '169cd8292c4bcc7b12286aca6952db470d139b18',
  },
  {
    username: 'priya.patel',
    name: 'Priya Patel',
    identifier: 'HEF-PAT-2026-4402',
    city: 'Mumbai',
    token: '6bcc538bcd46b68d86ec9a9b408894b0f1c170e7',
  },
  {
    username: 'rohan.verma',
    name: 'Rohan Verma',
    identifier: 'HEF-PAT-2026-1189',
    city: 'New Delhi',
    token: 'fd72fb638a922e446c9ab5242e2d21bacd527fd0',
  },
];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private tokenKey = 'hefin_auth_token';
  private userKey = 'hefin_auth_user';

  private currentTokenSignal = signal<string>(this.getInitialToken());
  private currentUserSignal = signal<UserSession>(this.getInitialUser());

  readonly token = computed(() => this.currentTokenSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentTokenSignal());

  readonly availableDemoPatients = DEMO_PATIENTS;

  private getInitialToken(): string {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.tokenKey);
      if (stored) return stored;
    }
    // Default to primary demo patient token
    return DEMO_PATIENTS[0]!.token;
  }

  private getInitialUser(): UserSession {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(this.userKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    const defaultPatient = DEMO_PATIENTS[0]!;
    return {
      id: 1,
      username: defaultPatient.username,
      email: `${defaultPatient.username}@hefin.health`,
      first_name: defaultPatient.name.split(' ')[0] ?? '',
      last_name: defaultPatient.name.split(' ')[1] ?? '',
      role: 'PATIENT',
      patient_identifier: defaultPatient.identifier,
    };
  }

  setSession(token: string, user: UserSession) {
    this.currentTokenSignal.set(token);
    this.currentUserSignal.set(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  switchDemoPatient(username: string) {
    const found = DEMO_PATIENTS.find((p) => p.username === username) ?? DEMO_PATIENTS[0]!;
    const user: UserSession = {
      id: 1,
      username: found.username,
      email: `${found.username}@hefin.health`,
      first_name: found.name.split(' ')[0] ?? '',
      last_name: found.name.split(' ')[1] ?? '',
      role: 'PATIENT',
      patient_identifier: found.identifier,
    };
    this.setSession(found.token, user);
  }

  logout() {
    this.currentTokenSignal.set('');
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    }
  }
}
