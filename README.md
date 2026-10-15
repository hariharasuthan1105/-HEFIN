# HEFIN 3.0 — Intelligent Healthcare & Insurance System

A unified, responsive healthcare and insurance application for **HEFIN CYBERCARE — SPECTRAL INTELLIGENCE**. HEFIN combines a cinematic landing experience with a functional patient workspace backed by a Django REST Framework API and PostgreSQL foundation.

> **DEMO ENVIRONMENT NOTICE:** All patient profiles, diagnostic reports, invoice line items, and insurance claims are synthetic demonstration data. Financial amounts are formatted in INR (₹) for realistic simulation. Not a real healthcare or financial service.

---

## Architecture Overview

- **Frontend (`frontend/`):** Angular 22.2, TypeScript 6.0, HTML5, Vanilla CSS with custom design system tokens, Three.js 0.186 (anatomical brain and glass hospital 3D scenes preserved from Task 03).
- **Backend (`backend/`):** Python 3.12+, Django 6.1, Django REST Framework 3.18, Token Authentication, SQLite default for zero-setup local dev with PostgreSQL support via `DATABASE_URL` or `DB_*` variables.
- **API Versioning:** All endpoints are scoped under `/api/v1/`.
- **Portal Experience:** 7 dedicated workspace views: Dashboard Overview, My Health Records, Medical Bills (INR), Insurance Coverage, Care Timeline, Profile & Accessibility Preferences, and AI Assistant Entry Point.

---

## Quick Start — Local Full-Stack Setup

### 1. Backend Setup (Django + DRF)

```powershell
cd backend

# Create and activate Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Seed synthetic demo patients, records, bills, claims, and timeline
python manage.py seed_demo

# Start the Django development server (http://127.0.0.1:8000)
python manage.py runserver
```

**Demo Patient Credentials (Seeded):**
- Primary Patient: `aarav.sharma` / `demo1234` (Identifier: `HEF-PAT-2026-9814`)
- Secondary Patient: `priya.patel` / `demo1234` (Identifier: `HEF-PAT-2026-4402`)
- Tertiary Patient: `rohan.verma` / `demo1234` (Identifier: `HEF-PAT-2026-1189`)

### 2. Frontend Setup (Angular)

In a separate terminal:

```powershell
cd frontend

# Install Node dependencies (Node 22 / 24 compatible)
npm ci

# Start the Angular development server (http://127.0.0.1:4200)
npm start
```

Visit `http://127.0.0.1:4200/patient/dashboard` to access the Patient Portal.

---

## Verification & Testing

### Backend Tests (Django)

```powershell
cd backend
python manage.py test tests
python manage.py check
```
- **21 backend tests** covering model validation, INR decimal handling, token authentication, patient data isolation, and API views.

### Frontend Tests (Playwright & TypeScript)

```powershell
cd frontend
npm run typecheck
npm run build
npm test
```
- **53 passed Playwright tests** across desktop (1440px) and mobile (iPhone 13 / 375px) covering:
  - Task 03 cinematic 3D scenes, material controls, and responsive landing
  - Route navigation without runtime errors or horizontal overflow
  - Patient portal workspace tabs, search/filters, line item drawers, and accessibility preferences
  - Honest unavailable backend error states when running in static mode

### Production Preview Smoke Test

```powershell
cd frontend
npm run build
npm run preview
# In another terminal:
npm run test:production
```

---

## Documentation

- [Task 04 Patient Portal & Django API Documentation](docs/TASK-04-PATIENT-PORTAL.md)
- [Task 03 Cinematic 3D Scene Report](docs/TASK-03-CINEMATIC-3D.md)
- [Asset Attribution and Licensing](frontend/public/assets/models/ATTRIBUTION.txt)
- [Environment Configuration Guide](.env.example)

---

## Branching & Release Isolation

Task 04 is developed on `feature/task-04-patient-portal` targeting `hefin-3.0-development`. The live GitHub Pages deployment reflects the verified static Task 03 release. Task 04 includes graceful static fallback handling so the Patient Portal remains fully interactive on GitHub Pages without requiring a public backend.
