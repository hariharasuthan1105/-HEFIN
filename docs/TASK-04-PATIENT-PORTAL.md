# HEFIN 3.0 — Task 04: Functional Patient Portal & Django API Foundation

## Executive Summary

Task 04 establishes the first functional application milestone for HEFIN 3.0. It delivers:
1. **A responsive, professional Patient Workspace** built in Angular, replacing the static preview with 7 dedicated tabs (Dashboard Overview, Health Records, Medical Bills in INR, Insurance Policy & Claims, Care Timeline, Profile & Accessibility Preferences, and an honest AI Assistant placeholder).
2. **A robust Django REST Framework backend** (`backend/`) structured into modular domain applications (`accounts`, `patients`, `records`, `billing`, `insurance`, `appointments`), using token authentication and strict patient-scoped data isolation.
3. **A database foundation** designed with Django ORM, supporting zero-setup SQLite for local testing and PostgreSQL for production environments via `DATABASE_URL` or standard database environment parameters.
4. **Idempotent synthetic demo data seeding** (`python manage.py seed_demo`) creating 3 realistic patient identities with records, itemized bills with INR decimal accuracy, and insurance policies.
5. **Full compatibility with existing Task 03 assets**, retaining the cinematic 3D brain and hospital scenes, gold branding, typography tokens, and GitHub Pages static hosting limitations without broken network calls.

---

## Architecture Overview

```
HEFIN 3.0 SYSTEM TOPOLOGY
┌────────────────────────────────────────────────────────────────────────┐
│ Angular 22 Frontend (Client Layer)                                     │
│ ├─ Route: /patient/dashboard                                           │
│ ├─ State & API Service: PatientApiService (Observable signals)         │
│ ├─ Mode Switcher: Simulated Mode (Static/Pages) vs Live API (Django)   │
│ └─ Design Tokens: Midnight Navy, HEFIN Gold, Cyan, Violet, Glass       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (/api/v1/)
                                    │ Authorization: Token <key>
┌───────────────────────────────────▼────────────────────────────────────┐
│ Django REST Framework Backend (Application Layer)                     │
│ ├─ apps/accounts/     -> Custom User (AbstractUser), Token Auth        │
│ ├─ apps/patients/     -> PatientProfile, Dashboard & Profile Views     │
│ ├─ apps/records/      -> MedicalRecord, Vitals, Search & Type Filter   │
│ ├─ apps/billing/      -> MedicalBill, BillLineItem (INR Decimal)       │
│ ├─ apps/insurance/    -> InsurancePolicy, InsuranceClaim, Timeline     │
│ └─ apps/appointments/ -> Appointment, CareEvent Timeline Aggregator    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Django ORM (Migrations)
┌───────────────────────────────────▼────────────────────────────────────┐
│ Database Layer                                                         │
│ ├─ Default Development: SQLite (db.sqlite3)                            │
│ └─ Production Target: PostgreSQL 15+ (psycopg / DATABASE_URL)         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Frontend Routes & Patient Portal Experience

The Patient Portal lives at route `/patient/dashboard` and provides 7 functional workspace sections:

### A. Patient Dashboard (Overview)
- **Patient greeting & simulated identifier:** e.g., `Welcome, Aarav Sharma` with identifier `HEF-PAT-2026-9814`.
- **Top Disclaimer Banner:** `DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA`.
- **Summary Metric Cards:** 
  - Outstanding Medical Bills: formatted in INR (`₹29,000.00`, 1 pending bill).
  - Insurance Coverage: utilized vs remaining (`₹7,55,000.00` remaining of `₹10,00,000.00` limit).
  - Next Care Milestone: upcoming appointment tracking.
- **Recent Care Activity Table:** lists facility, clinician, service type, and date.
- **Active Claims Overview & Quick Actions:** navigate to records, bills, policies, and appointments.
- **Financial Assistance Overview:** zero-interest micro-installment notice.

### B. My Health Records
- Record listings with record type, title, facility, clinician, and record date.
- Real-time search by title, summary, clinician, or facility.
- Filter dropdown by clinical category (`Consultation Note`, `Diagnostic Lab Report`, `Radiology & Imaging`, `Prescription & Medication`, `Discharge Summary`).
- Slide-over detail drawer displaying full clinical summary, clinician notes, and structured vitals (Blood Pressure, Pulse, SpO2, BMI, Temperature).

### C. Medical Bills
- Invoice listing with invoice number, facility, bill date, total amount, simulated insurance coverage amount, estimated patient responsibility, and payment status badge (`Pending Payment`, `Paid in Full`).
- **INR Currency handling:** All figures formatted with `₹` and simulated disclaimers.
- Detail drawer with itemized hospital line items breakdown (Service description, Code, Quantity, Total Price in INR, and Patient Share in INR).

### D. Insurance Coverage
- Fictional insurance policy overview (Policy number, Underwriter, Status).
- Visual progress track showing utilized coverage (`₹2,45,000.00` / `24.5%`) vs remaining balance (`₹7,55,000.00`).
- Co-payment percentage (10.0%) and renewal date.
- Policy limitations and exclusions disclosure.
- Active claims timeline table with claim reference, facility, claimed amount, status, and latest step notes.

### E. Care Timeline
- Chronological, unified event feed merging appointment bookings, hospital visits, diagnostic test results, issued bills, and submitted claims.

### F. Profile & Accessibility Preferences
- Patient demographics, blood group, address, known allergies, and chronic conditions.
- Interactive accessibility toggles:
  - *Prefer Reduced Motion:* Disables 3D model orbit loops and transitions.
  - *High Contrast Mode:* Enhances borders and text legibility.
  - *Email & SMS Alerts:* Configurable notification preferences.

### G. AI Assistant Entry Point
- Professional UI for HEFIN Spectral AI Assistant.
- Transparently communicates that model integration is planned for future tasks; **no fake AI responses or hallucinated Gemma 3/Ollama model outputs are generated**.

---

## Design System & Aesthetics

In compliance with Task 03 and Task 04 design requirements:
- **Color Palette:** Midnight navy (`#050814`, `#0b1026`), HEFIN gold (`#c5a059`), cyan highlights (`#38bdf8`), violet accents (`#818cf8`), emerald for verified items (`#10b981`), rose for pending alerts (`#f43f5e`).
- **Typography:** Space Grotesk for section headings, Plus Jakarta Sans for body copy, JetBrains Mono for monetary metrics and identifiers, Orbitron for futuristic badges.
- **Glassmorphism:** Layered surfaces with subtle translucent backdrops (`color-mix` with srgb).
- **Responsiveness:** Desktop sidebar navigation switches to accessible horizontal tab bar on screens `< 900px`.
- **No WebGL Overhead:** The portal deliberately avoids adding a second heavy 3D canvas, preserving 60fps responsiveness.

---

## Visual Verification & Screenshots

| View | Screenshot File | Description |
| :--- | :--- | :--- |
| **Desktop Dashboard** | ![Patient Dashboard](task-04-patient-portal-desktop.png) | Overview tab with greeting, metrics, and care activity |
| **Health Records** | ![Health Records](task-04-records-desktop.png) | Searchable records table with category filters |
| **Medical Bills** | ![Medical Bills](task-04-bills-desktop.png) | Itemized bills with INR currency formatting |
| **Insurance Coverage** | ![Insurance Coverage](task-04-insurance-desktop.png) | Policy card, utilization progress bar, exclusions |
| **Mobile Portal** | ![Mobile Portal](task-04-patient-portal-mobile.png) | Responsive layout at 375px viewport (iPhone 13) |

---

## Backend Architecture & Database Models

The Django backend (`backend/`) is structured into decoupled domain apps:

### 1. `apps/accounts/`
- **`User` (AbstractUser):** Custom user model with `role` (`PATIENT`, `HOSPITAL_STAFF`, `INSURER`, `GOVERNMENT_AUDITOR`).
- **Token Authentication:** Standard DRF authtoken mechanism.

### 2. `apps/patients/`
- **`PatientProfile`:** Links one-to-one with `User`.
  - Fields: `patient_identifier` (unique, e.g. `HEF-PAT-2026-9814`), `date_of_birth`, `gender`, `blood_group`, `phone_number`, `address_city`, `address_state`, `allergies`, `chronic_conditions`, `reduced_motion`, `high_contrast`, `font_scale`, `email_notifications`, `sms_alerts`.

### 3. `apps/records/`
- **`MedicalRecord`:** Scoped to `PatientProfile`.
  - Fields: `record_identifier`, `record_type`, `title`, `healthcare_facility`, `attending_clinician`, `record_date`, `summary`, `clinical_notes`, `vitals` (JSONField storing BP, pulse, SpO2, BMI).

### 4. `apps/billing/`
- **`MedicalBill`:** Scoped to `PatientProfile`.
  - Fields: `invoice_number`, `hospital_name`, `bill_date`, `due_date`, `total_amount` (Decimal), `simulated_coverage_amount` (Decimal), `estimated_patient_responsibility` (Decimal), `currency` (`INR`), `payment_status` (`PENDING`, `PAID`, `DISPUTED`).
- **`BillLineItem`:** Foreign key to `MedicalBill`.
  - Fields: `service_code`, `description`, `quantity`, `unit_price`, `total_price`, `patient_share`.

### 5. `apps/insurance/`
- **`InsurancePolicy`:** Scoped to `PatientProfile`.
  - Fields: `policy_number`, `plan_name`, `fictional_insurer`, `coverage_category`, `coverage_limit`, `used_coverage`, `co_pay_percentage`, `status`, `renewal_date`, `exclusions_summary`.
- **`InsuranceClaim`:** Foreign key to `InsurancePolicy` and `PatientProfile`.
  - Fields: `claim_reference`, `hospital_name`, `claimed_amount`, `approved_amount`, `settlement_status`, `timeline_steps` (JSONField with chronological notes).

### 6. `apps/appointments/`
- **`Appointment`:** Scoped to `PatientProfile`.
  - Fields: `facility_name`, `clinician_name`, `department`, `appointment_date`, `status`, `reason`.
- **`CareEvent`:** Chronological care feed aggregator.
  - Fields: `event_type`, `event_date`, `title`, `facility`, `summary`, `related_reference`.

---

## REST API Reference (`/api/v1/`)

All private endpoints require `Authorization: Token <token>` header and enforce patient-scoped querysets.

| Method | Endpoint | Description | Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/status/` | Health check & API version | None |
| `POST` | `/api/v1/accounts/login/` | User authentication | `{ username, password }` |
| `POST` | `/api/v1/accounts/logout/` | Token revocation | None |
| `GET` | `/api/v1/patient/dashboard/` | Aggregated dashboard summary | None |
| `GET` | `/api/v1/patient/profile/` | Patient demographic profile | None |
| `PATCH`| `/api/v1/patient/profile/` | Update non-sensitive preferences | `{ reduced_motion, ... }` |
| `GET` | `/api/v1/records/` | Patient medical records list | `?record_type=`, `?search=` |
| `GET` | `/api/v1/records/{id}/` | Single record detail | None |
| `GET` | `/api/v1/billing/` | Patient invoices list | `?payment_status=`, `?search=` |
| `GET` | `/api/v1/billing/{id}/` | Invoice detail with line items | None |
| `GET` | `/api/v1/insurance/policies/` | Insurance policies list | None |
| `GET` | `/api/v1/insurance/claims/` | Insurance claims list | `?status=` |
| `GET` | `/api/v1/appointments/` | Appointments list | `?time=upcoming\|past` |
| `GET` | `/api/v1/timeline/` | Chronological care feed | `?type=` |

---

## Authentication & Patient Data Isolation

1. **Password Hashing:** Uses Django's default PBKDF2 with SHA-256 password hasher. No plaintext credentials are ever stored.
2. **Object-Level Authorization & Queryset Scoping:** Every view overrides `get_queryset()` to filter strictly by `request.user.patient_profile`. An authenticated patient cannot view, query, or mutate another patient's records, invoices, or claims.
3. **No Auth in URL Parameters:** Tokens are transferred strictly via HTTP `Authorization: Token <key>` headers.
4. **CORS & CSRF:** Strict CORS headers permitting only configured local frontend hosts.

---

## Synthetic Demo Data

The seed command is repeatable, safe, and ASCII-clean:
```powershell
python manage.py seed_demo
```

### Seeded Demo Accounts:
| Username | Password | Patient Name | Identifier | Primary Policy |
| :--- | :--- | :--- | :--- | :--- |
| `aarav.sharma` | `demo1234` | Aarav Sharma | `HEF-PAT-2026-9814` | `POL-SPECTRAL-2026-0911` |
| `priya.patel` | `demo1234` | Priya Patel | `HEF-PAT-2026-4402` | `POL-SPECTRAL-2026-3391` |
| `rohan.verma` | `demo1234` | Rohan Verma | `HEF-PAT-2026-1189` | `POL-SPECTRAL-2026-5820` |

---

## GitHub Pages & Static Preview Mode

GitHub Pages hosts only the static Angular bundle. It cannot execute Django or PostgreSQL. To handle this limitation honestly and gracefully:
1. **Configurable API URL:** `environment.apiBaseUrl` can be set via `window.__HEFIN_CONFIG__?.apiBaseUrl` or localStorage.
2. **Default Simulated Mode:** In static environments (GitHub Pages, tests, initial clone), the frontend defaults to **Simulated Mode**, rendering rich synthetic data locally without firing unprompted network calls that would trigger console errors.
3. **Honest Unavailable State:** In Live API mode, if the backend dev server is down, the frontend does **not** silently pretend it succeeded; it renders an explicit, honest `Backend Unavailable` alert banner with retry and mode-switch options.

---

## Verification Test Results

### 1. Backend Test Suite (Django)
```powershell
python manage.py test tests
```
- **Result:** `Ran 21 tests in 35.2s — OK`
- Model validation (Decimal constraints, positive amount validation)
- Token authentication & credential validation
- Strict patient isolation (Cross-patient access rejection)
- API endpoint status, serializers, and filtering

### 2. Frontend Test Suite (Playwright)
```powershell
npm test
```
- **Total Tests:** 56 executed across Desktop (1440x1000) and Mobile (iPhone 13 / 375x812)
- **Passed:** 53 passed
- **Skipped:** 3 (intentional mobile viewport exclusions in cinematic tests)
- **Failed:** 0
- **Suites Covered:**
  - `tests/cinematic.spec.ts` (3D brain/hospital scene, material toggles, orbit reset)
  - `tests/foundation.spec.ts` (all routes zero console errors, zero horizontal overflow)
  - `tests/landing-3d.spec.ts` (Three.js life cycle, canvas cleanup, breakpoint readability)
  - `tests/patient-portal.spec.ts` (7 workspace tabs, INR billing, line items, search, drawer modals, accessibility preferences, honest offline error banner)

### 3. Production Smoke Verification
```powershell
npm run build
npm run preview
npm run test:production
```
- **Result:** `PASS: production cinematic GLBs/Draco paths, material control, deep link, no debug metrics/design-system route/link, no console errors.`

---

## Security & Deployment Limitations

- **Not Certified for Production Healthcare:** This prototype uses synthetic demonstration data. It is not certified under HIPAA, GDPR, or DISHA (Digital Information Security in Healthcare Act).
- **Demo Passwords:** Simple passwords (`demo1234`) are provided for local evaluation only.
- **Tokens in LocalStorage:** For demonstration convenience, auth tokens are retained in browser session storage; a production deployment would implement secure `HttpOnly`, `SameSite=Strict` cookies with short-lived tokens and refresh rotation.
- **Hosting:** Django backend is meant for local evaluation in Task 04. No production backend has been deployed.

---

## Remaining Work (Future Tasks)

1. **Task 05+:** Implementation of Hospital Staff, Insurance Adjuster, and Government Auditor workspaces.
2. **AI Assistance:** Integration of local LLM models (e.g., Ollama / Gemma 3) to power report explainability and billing clarification.
3. **Advanced Security:** OAuth2 / OpenID Connect, audit logging, and signed FHIR / ABHA compliance records.
