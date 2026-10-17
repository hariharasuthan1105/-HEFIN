# HEFIN 4.0 — Backend Architecture & Production Roadmap

## Executive Summary & System Transformation

HEFIN 3.0 successfully established the frontend visual excellence, cinematic 3D scenes (anatomical brain, smart hospital, trust network), responsive Patient Portal workspace, and initial Django REST Framework data foundation with SQLite/PostgreSQL parity. 

**HEFIN 4.0** elevates this foundation into an enterprise-grade, secure, compliant healthcare, insurance, and artificial intelligence platform. HEFIN 4.0 transitions the platform from a simulated demonstration environment into a real-world multi-tenant healthcare operating system adhering strictly to the **Digital Personal Data Protection Act, 2023 (DPDP)**, the **Ayushman Bharat Digital Mission (ABDM)**, **HL7 FHIR R4** standards, and **IRDAI** insurance regulations.

This document presents the complete backend inventory, live security audit findings, confirmed technology stack, demo retirement clean-swap protocol, Gemma Personal Assistant architecture, and an exhaustive step-by-step roadmap for **Tasks 06 through 22**.

---

## 1. Confirmed Technology Stack

Following architectural review, the confirmed technology stack for HEFIN 4.0 is:

- **Frontend Client:** Angular 22 SPA (Standalone components, Signals, preserving all completed 3D Three.js scenes).
- **Authoritative Business Backend:** Django REST Framework (Core business models, multi-tenant RBAC, billing, EHR, claims, compliance).
- **Transactional Database:** PostgreSQL 16+ (ACID transactional guarantees, multi-tenant partitioning, WAL archiving).
- **AI Microservice:** FastAPI (High-throughput asynchronous Python 3.11+ inference runtime).
- **Primary LLM Runtime:** **Google Gemma 3** hosted on a **private, sovereign Ollama runtime** in an isolated environment.
  - *Strict Mandate:* Google Gemma 3 is the confirmed primary LLM. No other models (such as Llama 3 or BioMistral) may be deployed without explicit user approval.
  - *Language Coverage:* High-quality **English and Tamil** linguistic and clinical reasoning support (subject to rigorous model evaluation).
- **AI Orchestrator:** LangChain (Deterministic prompt routing, permission-aware retrieval, structured citation formatting).
- **Vector & Semantic Search:** `pgvector` extension co-located within PostgreSQL 16.
- **Asynchronous Task Processing:** Redis 7 broker & Celery workers (Document parsing, OCR, background claim reconciliation).
- **Encrypted Document Storage:** Private AWS S3 / MinIO object storage with time-limited presigned URLs.
- **Predictive Analytics:** Scikit-learn / XGBoost ML inference engine for advisory-only fraud detection and clinical risk scoring.

---

## 2. Priority 1 — Live Demo Authentication Security Audit Findings

A live penetration and security audit of the deployed production environment (`https://hefin-backend-mofn.onrender.com/api/v1`) was conducted. In compliance with security directives, **no credential values or token strings are printed in logs or reports**.

### Audit Results:
1. **Live Demo-Login Endpoint (`POST /api/v1/auth/demo-login/`):**
   - **CONFIRMED PUBLICLY ACCESSIBLE.**
   - Sending `{ "username": "aarav.sharma" }` to the deployed Render backend returned **HTTP 200 OK** and issued an active Django authentication token for the demo patient without requiring any password.
   - Root cause: `DemoLoginView` in `backend/apps/accounts/views.py` lacks an enforcement check against `settings.DEBUG` or production environment flags.
2. **Committed Frontend Demo Tokens:**
   - The static token strings committed in `frontend/src/app/core/services/auth.service.ts` were tested against `GET /api/v1/patient/dashboard/` on the live Render backend.
   - All 3 committed static tokens returned **HTTP 401 Unauthorized** (invalid on the live backend database, likely because the Render database generated different token hashes upon initial seeding).
   - **However**, because `demo-login` is publicly accessible, an attacker does not need the committed tokens—they can simply request a fresh valid token on demand via `POST /api/v1/auth/demo-login/`.
3. **Data Exposure & Incident Impact Assessment:**
   - **Zero Legitimate Patient Data Exposed:** The deployed database currently contains solely synthetic demo records created by `seed_demo` (fictional identities Aarav Sharma, Priya Patel, Rohan Verma with simulated bills and policies). No genuine real-world patient data has ever been imported or compromised.
   - **Vulnerability Level:** High/Urgent (public passwordless authentication bypass). If real accounts were onboarded while this endpoint remained open, unauthorized access would be possible.
4. **Immediate Containment Plan (Task 06):**
   - **Block in Production:** Restrict `DemoLoginView` to strictly require `settings.DEBUG=True` or an explicit authorization flag (`ALLOW_DEMO_LOGIN=True`). In production (`DEBUG=False`), the endpoint immediately returns **HTTP 403 Forbidden**.
   - **Model Hardening:** Change `User.is_demo` model field default from `True` to `False` to prevent newly registered users from ever being treated as demo accounts.
   - **Credential Revocation:** Execute an automated revocation script (`python manage.py revoke_demo_tokens`) that deletes all existing `authtoken_token` records associated with `is_demo=True` users in the database, immediately invalidating any previously issued tokens.
   - **Regression Testing:** Add dedicated automated tests verifying that `POST /api/v1/auth/demo-login/` returns HTTP 403 when `DEBUG=False`.

---

## 3. Current HEFIN 3.0 Backend Inventory

### 3.1 Django Applications, Models, Views & Routes

| Application | Models | Views & Endpoints | Purpose |
| :--- | :--- | :--- | :--- |
| **`apps.accounts`** | `User` (`role`, `phone_number`, `is_demo`). | `LoginView` (`/api/v1/auth/login/`), `DemoLoginView` (`/api/v1/auth/demo-login/`), `LogoutView` (`/api/v1/auth/logout/`), `CurrentUserView` (`/api/v1/auth/me/`). | Authentication, token issuance, user session management. |
| **`apps.patients`** | `PatientProfile` (`patient_identifier`, DOB, gender, blood group, city, accessibility flags). | `PatientDashboardView` (`/api/v1/patient/dashboard/`), `PatientProfileView` (`/api/v1/patient/profile/`). | Demographics, accessibility settings, aggregated dashboard KPIs. |
| **`apps.records`** | `MedicalRecord` (`record_identifier`, `record_type`, `facility`, `clinician`, `record_date`, `vitals_summary` JSONField, `is_synthetic`). | `MedicalRecordListView` (`/api/v1/records/`), `MedicalRecordDetailView` (`/api/v1/records/<id>/`). | Filterable clinical diagnostic summaries, lab results, prescriptions. |
| **`apps.billing`** | `MedicalBill`, `BillLineItem` (Decimal precision INR, `total_amount`, `simulated_coverage_amount`, `estimated_patient_responsibility`). | `MedicalBillListView` (`/api/v1/billing/`), `MedicalBillDetailView` (`/api/v1/billing/<id>/`). | Hospital invoicing, itemized line items, patient out-of-pocket tracking. |
| **`apps.insurance`** | `InsurancePolicy`, `InsuranceClaim` (`policy_number`, `coverage_limit`, `used_coverage`, `timeline_steps` JSONField). | `InsurancePolicyListView` (`/api/v1/insurance/policies/`), `InsuranceClaimListView` (`/api/v1/insurance/claims/`). | Policy balance calculation, claim settlement status tracking. |
| **`apps.appointments`**| `Appointment`, `CareEvent` (`appointment_identifier`, `facility`, `date`, `event_type`, `related_reference`). | `AppointmentListView` (`/api/v1/appointments/`), `CareTimelineView` (`/api/v1/timeline/`). | Consultation bookings, care timeline aggregation. |
| **`apps.assistant`** | `ChatMessage` (`role`, `content`, `intent`, `cards` JSONField, `is_simulated`). | `ChatMessageListCreateView` (`/api/v1/assistant/messages/`), `ClearChatView` (`/api/v1/assistant/clear/`). | Deterministic Care Assistant chat history and keyword router. |

### 3.2 Database Schema Integrity & Test Baseline
- All primary keys use `BigAutoField`.
- Monetary amounts use `DecimalField(max_digits=12, decimal_places=2)` with model `clean()` non-negative validations.
- Baseline test suite: **38 backend Django tests running in ~73s — all passing cleanly (100% OK)**.

---

## 4. Priority 3 — The Clean Swap Protocol: Safe Transition from Demo to Production

To prevent database corruption, avoid downtime, and guarantee that synthetic test fixtures remain functional for automated test suites, the retirement of demo artifacts will adhere to the **Clean Swap Protocol**:

```
CLEAN SWAP PROTOCOL
┌───────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Current Demo Artifact                 │ Clean Production Replacement                           │
├───────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Seeded accounts (aarav/priya/rohan)   │ Real self-service registration or provider invitation  │
│ Predictable 'demo1234' passwords      │ Argon2id hashed passwords with OWASP complexity rules  │
│ Passwordless DemoLoginView            │ Strict HTTP 403 in production; gated to DEBUG=True     │
│ Hardcoded tokens in auth.service.ts   │ Short-lived RS256 JWT access tokens via Authorization  │
│ Automatic login as Aarav Sharma       │ Unauthenticated login gateway requiring credentials    │
│ Mock JSON fallbacks in PatientApiService│ Real API requests with explicit loading/error states │
│ Fabricated offline assistant replies  │ Honest 'Backend service unavailable' alert banners     │
│ Default is_demo=True on User model    │ Default is_demo=False on User model                    │
│ Default is_synthetic=True on Records  │ Default is_synthetic=False on verified records         │
└───────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

### Strict Migration Rules:
1. **Zero Database Drops:** Never run `flush`, `drop database`, or delete migration histories. Preserve all existing schema migrations.
2. **Synthetic Fixtures Preserved for Testing:** Synthetic records created during `TestCase.setUp()` remain fully intact in `backend/tests/` to guarantee test reproducibility.
3. **No Phantom Migrations:** Synthetic accounts will never be silently transformed into real accounts. Real patients must undergo genuine identity onboarding.
4. **Honest Frontend State Handling:** When the backend is unreachable or offline, the frontend must render an explicit, accessible error/retry UI rather than serving fabricated data.

---

## 5. Priority 4 — The Gemma Personal Assistant Architecture

The **HEFIN Gemma Personal Assistant** serves as an intelligent, data-grounded clinical and financial explainer for patients and healthcare administrators.

```
┌────────────────────────────────────────────────────────────────────────┐
│ User Query (English or Tamil)                                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ LangChain Query Safety & Intent Classifier                             │
│  ├─ Medical Diagnosis & Prescription Refusal Guardrail                 │
│  ├─ Prompt Injection & Cross-Patient Probing Defense                   │
│  └─ Language Identification (English / Tamil)                          │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ General Knowledge               │ Personal Records Query
┌──────────────────▼──────────────────┐  ┌───────────▼───────────────────┐
│ RAG Knowledge Base                  │  │ Authorized Django Read-Only   │
│  ├─ Approved HEFIN Documentation    │  │ Tools (Scoped to JWT User)    │
│  ├─ Policy Terms & Exclusions       │  │  ├─ Claims & Tracking Tool    │
│  ├─ IRDAI Regulatory Standards      │  │  ├─ Itemized Invoices Tool    │
│  └─ pgvector Semantic Similarity    │  │  ├─ Policy Balances Tool      │
│                                     │  │  └─ Appointments & Vitals Tool│
└──────────────────┬──────────────────┘  └───────────┬───────────────────┘
                   │ Context Chunks                  │ Structured Context
                   └────────────────┬────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Private Sovereign Ollama Runtime (Google Gemma 3)                      │
│  ├─ Strict Grounded System Prompt                                      │
│  ├─ Mandatory Source Citations [Doc: X / Invoice: Y / Claim: Z]        │
│  ├─ Uncertainty Handling: "Information not found in your records"      │
│  └─ Bilingual Generation: Fluent English and Native Tamil              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Verified Response + Structured Action Cards + Citations                │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Assistant Capabilities:
1. **Google Gemma 3 Runtime:** Powered exclusively by Google Gemma 3 running locally on private Ollama instances with zero external cloud egress.
2. **Authorized Django Read-Only Tools:** Access to personal health records, bills, claims, and appointments is mediated through authenticated, patient-scoped Django tools. The model can never mutate records, execute financial transfers, or view other patients' data.
3. **Strict RAG with Source Citations:** Every factual statement must cite verified source records (e.g., `[Source: Apollo Hospital Invoice #INV-2026-8841]` or `[Policy Section 4.2: Pre-Existing Conditions]`).
4. **Bilingual Support (English & Tamil):** Prompts, clinical explanations, and financial breakdowns support both English and Tamil, validated against healthcare terminology benchmarks.
5. **Clinical Advice Safety Guardrail:** The assistant rejects requests to diagnose conditions or adjust drug dosages, immediately directing users to licensed physicians.

---

## 6. Revised Implementation Roadmap (Tasks 06 — 22)

```
REVISED ROADMAP SEQUENCE
├── Immediate Security Priority (Task 06)
│   └── Task 06: Demo Authentication Security Lockdown & Credential Containment
├── Core Foundation & Multi-Tenancy (Tasks 07 — 09)
│   ├── Task 07: Durable PostgreSQL Database, Automated Backup & Migration Preparation
│   ├── Task 08: Real Authenticated User Onboarding & Identity Lifecycle
│   └── Task 09: Patient Portal Live-Data Migration & Demo Retirement
├── Provider & Adjudication Workflows (Tasks 10 — 11)
│   ├── Task 10: Hospital Provider Backend & Clinical Encounter Workflows
│   └── Task 11: Insurance Underwriting, Itemized Billing & Claim Adjudication
├── Private AI & Gemma Assistant (Tasks 12 — 15)
│   ├── Task 12: FastAPI Asynchronous AI Microservice & Internal Gateway
│   ├── Task 13: Google Gemma 3 Private Ollama Inference (English & Tamil)
│   ├── Task 14: LangChain Orchestration & Permission-Aware RAG with Citations
│   └── Task 15: Full HEFIN Gemma Personal Care Assistant
└── Follow-Up Milestones (Tasks 16 — 22)
    ├── Task 16: Asynchronous Job Processing & Background Task Engine (Redis & Celery)
    ├── Task 17: Secure Document Storage & Attachment Pipeline (S3 / Presigned URLs)
    ├── Task 18: ML Advisory Analytics Engine (Claim Anomaly Scoring & Risk Stratification)
    ├── Task 19: ABDM & HL7 FHIR R4 Healthcare Interoperability Integration
    ├── Task 20: Comprehensive Audit Logging, DPDP Consent & Privacy Suite
    ├── Task 21: Production Infrastructure Hardening, Monitoring & Disaster Recovery
    └── Task 22: End-to-End System Integration, Security Penetration Testing & Acceptance
```

---

### Task 06: Demo Authentication Security Lockdown & Credential Containment
- **Scope & Objective:** Immediately contain the live authentication exposure. Block passwordless demo login in production environments, revoke active demo tokens in the database, update model defaults (`is_demo=False`), and add regression tests.
- **Dependencies:** Task 05 audit approval.
- **APIs & Endpoints:**
  - `POST /api/v1/auth/demo-login/`: Strictly return `HTTP 403 Forbidden` when `DEBUG=False`.
- **Database Changes:**
  - Migration updating `User.is_demo` default to `False`.
  - Revocation script deleting tokens associated with `is_demo=True` users.
- **Test Suite:** Regression tests verifying that `demo-login` returns HTTP 403 in production and is permissible only during local development (`DEBUG=True`).
- **Acceptance Criteria:**
  1. `POST /api/v1/auth/demo-login/` returns HTTP 403 Forbidden on any environment with `DEBUG=False`.
  2. All 38 existing backend tests pass cleanly.
  3. No active demo tokens remain valid in the production database.

---

### Task 07: Durable Database, Backup and Migration Preparation
- **Scope & Objective:** Configure production-ready PostgreSQL 16 database settings, connection pooling, and automated backup preparation. Enforce strict environment variables and prepare schema for `pgvector`.
- **Dependencies:** Task 06.
- **APIs & Endpoints:** Database-level configuration; `/api/v1/status/` reports live database engine.
- **Database Changes:** PostgreSQL configuration with connection pooling; `pgvector` extension schema enablement.
- **Test Suite:** PostgreSQL connection pool benchmarks, connection timeout resilience, migration integrity checks.
- **Acceptance Criteria:**
  1. PostgreSQL executes all test suites without SQLite fallbacks.
  2. `pgvector` extension is successfully initialized in the PostgreSQL cluster.

---

### Task 08: Real Authenticated User Onboarding & Identity Lifecycle
- **Scope & Objective:** Build self-service registration and onboarding workflows for patients and healthcare providers. Implement asymmetric RS256 JWT authentication (`SimpleJWT`), Argon2id password hashing, and mobile OTP verification.
- **Dependencies:** Task 07.
- **APIs & Endpoints:**
  - `POST /api/v1/auth/register/patient/`
  - `POST /api/v1/auth/verify-otp/`
  - `POST /api/v1/auth/token/` & `POST /api/v1/auth/token/refresh/`
  - `POST /api/v1/auth/password-reset/`
- **Database Changes:**
  - `PhoneVerification` model for OTP management.
  - Organization tenancy models (`Organization`, `OrganizationMembership`).
- **Test Suite:** User registration validation, password complexity enforcement, OTP brute-force rate limiting.
- **Acceptance Criteria:**
  1. Real patients can register, verify mobile OTP, and log in with JWT tokens.
  2. Passwords are saved using Argon2id with zero plaintext storage.

---

### Task 09: Patient Portal Live-Data Migration & Demo Banner Retirement
- **Scope & Objective:** Connect the Angular Patient Portal to live JWT authentication. Remove hardcoded demo tokens from `AuthService`, wire all 7 tabs to real API endpoints, and retire simulated demo banners in live mode.
- **Dependencies:** Task 08.
- **APIs & Endpoints:** Consumes live `/api/v1/patient/`, `/api/v1/records/`, `/api/v1/billing/`, `/api/v1/insurance/`, and `/api/v1/appointments/` endpoints.
- **Database Changes:** None.
- **Test Suite:** Playwright E2E tests for live login, session refresh, records browsing, and drawer interactions.
- **Acceptance Criteria:**
  1. Patient Portal operates fully on authenticated live data without mock fallbacks.
  2. Demo banners and switcher dropdowns are retired from production views.

---

### Task 10: Hospital Provider Backend & Clinical Encounter Workflows
- **Scope & Objective:** Build out the authoritative backend for the Hospital perspective (`apps.hospital`). Enable clinicians to manage admissions, document patient encounters, and issue diagnostic reports.
- **Dependencies:** Task 08.
- **APIs & Endpoints:**
  - `GET /api/v1/hospital/patients/`
  - `POST /api/v1/hospital/admissions/`
  - `POST /api/v1/hospital/records/`
- **Database Changes:** `HospitalEncounter` model linked to `Organization` and `PatientProfile`.
- **Test Suite:** Clinician authorization tests; verify cross-hospital patient isolation.
- **Acceptance Criteria:**
  1. Hospital doctors can document encounters and issue verified records directly to the patient's portal.

---

### Task 11: Insurance Underwriter, Itemized Billing & Claim Adjudication Workflows
- **Scope & Objective:** Build the authoritative insurance adjudication and billing backend (`apps.insurance`, `apps.billing`). Enable insurance reviewers to adjudicate claims, track itemized hospital invoices, and manage disbursements.
- **Dependencies:** Task 10.
- **APIs & Endpoints:**
  - `GET /api/v1/insurance/claims/review-queue/`
  - `POST /api/v1/insurance/claims/<id>/adjudicate/`
  - `POST /api/v1/billing/invoices/generate/`
- **Database Changes:** `ClaimAuditTrail` model; `adjudicated_by` foreign key on `InsuranceClaim`.
- **Test Suite:** Decimal financial calculations, policy limit decrement validation, co-pay tracking.
- **Acceptance Criteria:**
  1. Adjusters can review itemized hospital line items and adjudicate claims with full transactional balance updates.

---

### Task 12: FastAPI Asynchronous AI Microservice & Internal Gateway
- **Scope & Objective:** Stand up the dedicated FastAPI AI microservice (`ai-service/`). Configure service-to-service authentication via signed JWTs and establish an internal API gateway between Django and FastAPI.
- **Dependencies:** Task 07, Task 08.
- **APIs & Endpoints (FastAPI):**
  - `GET /health`
  - `POST /internal/v1/ai/ping`
- **Database Changes:** None in Django; configure read-only network access to PostgreSQL for FastAPI.
- **Test Suite:** Inter-service mTLS/JWT validation tests; benchmark concurrency (> 200 req/s).
- **Acceptance Criteria:**
  1. FastAPI service communicates securely with Django REST Core over authenticated internal channels.

---

### Task 13: Google Gemma 3 Inference via Private Ollama Runtime
- **Scope & Objective:** Deploy **Google Gemma 3** inside an isolated, sovereign Ollama runtime with zero external internet egress. Evaluate and benchmark linguistic capabilities for **English and Tamil**.
- **Dependencies:** Task 12.
- **APIs & Endpoints:** Internal Ollama REST endpoints (`http://ollama-service:11434/api/generate`).
- **Database Changes:** None.
- **Test Suite:** Gemma 3 inference latency tests; English and Tamil medical comprehension evaluation; network packet inspection verifying zero external data egress.
- **Acceptance Criteria:**
  1. Google Gemma 3 loads and responds to medical/financial prompts in both English and Tamil.
  2. Network isolation confirms zero outbound external API calls.

---

### Task 14: LangChain Orchestration & Permission-Aware RAG with Citations
- **Scope & Objective:** Implement LangChain RAG inside FastAPI. Chunk and embed HEFIN documentation, policy rules, and authorized patient records into `pgvector`. Enforce patient metadata filtering and strict source citation formatting.
- **Dependencies:** Task 13.
- **APIs & Endpoints (FastAPI):**
  - `POST /internal/v1/ai/rag/query`
- **Database Changes:** `embeddings` table in PostgreSQL with `vector(1536)` dimension and patient metadata columns.
- **Test Suite:** Cross-patient retrieval isolation test (verifying Patient A cannot retrieve Patient B's chunks); source citation validation.
- **Acceptance Criteria:**
  1. RAG answers cite exact source documents and paragraphs.
  2. Cross-patient semantic searches return zero unauthorized documents.

---

### Task 15: Full HEFIN Gemma Personal Care Assistant
- **Scope & Objective:** Wire Google Gemma 3, LangChain, and authorized Django read-only tools into the patient-facing assistant (`AssistantChatComponent`). Support bilingual conversational inquiry across records, bills, claims, and appointments.
- **Dependencies:** Task 09, Task 14.
- **APIs & Endpoints:**
  - `POST /api/v1/assistant/messages/`: Routes through FastAPI Gemma 3 pipeline.
- **Database Changes:** None.
- **Test Suite:** Playwright E2E chat interaction tests, Tamil language response verification, safety guardrail verification (refusing prescription/dosage requests).
- **Acceptance Criteria:**
  1. Patient can chat with Care Assistant in English or Tamil, receiving accurate answers grounded in their personal health records with verified source citations.
  2. Deterministic safety guardrail intercepts and blocks medical diagnostic queries.

---

### Follow-Up Milestones (Tasks 16 — 22)
- **Task 16:** Asynchronous Job Processing & Background Task Engine (Redis & Celery).
- **Task 17:** Secure Document Storage & Clinical Attachment Pipeline (S3 / MinIO Presigned URLs).
- **Task 18:** ML Advisory Analytics Engine (Claim Anomaly Scoring & Clinical Risk Stratification).
- **Task 19:** ABDM & HL7 FHIR R4 Healthcare Interoperability Integration.
- **Task 20:** Comprehensive Tamper-Evident Audit Logging, DPDP Consent & Privacy Suite.
- **Task 21:** Production Infrastructure Hardening, Prometheus Monitoring & Disaster Recovery.
- **Task 22:** End-to-End System Integration, Security Penetration Testing & Final Production Acceptance.

---

## 7. Immediate Next Step & Authorization Request

We have prepared the containment fix for **Task 06: Demo Authentication Security Lockdown**:
- Restrict `DemoLoginView` to `settings.DEBUG=True` only.
- Invalidate all existing synthetic demo tokens in the database.
- Update `User.is_demo` default to `False`.
- Add regression test coverage for production blocking.

**Awaiting user authorization before applying Task 06 security changes.**
