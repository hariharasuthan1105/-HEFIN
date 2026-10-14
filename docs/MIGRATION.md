# HEFIN 3.0 — Task 01 audit and migration

## Existing archive
The supplied ZIP is preserved in `legacy/` without modifying its code or configuration.
- Frontend: plain HTML, CSS, JavaScript; no Angular, React, build configuration, package manifest, lockfile, or automated tests.
- Backend: Express, Mongoose/MongoDB, bcrypt, JWT, Winston, Helmet and rate-limit imports. Files are accidentally nested through repeated `src` directories, so relative imports do not resolve. Finance and AI routes imported by the server are absent. The file named `pgsql` is a directory sketch, not a database dump.
- Frontend uses placeholder Supabase URLs and keys, inconsistent with the Express backend. The navbar refers to absent `HEFIN-LOGO.jpg`; an older logo exists in `images/LOGO-removebg-preview.png`.
- Dependencies cannot be dated reliably: no versions or manifest were supplied. No executable ICP/DFINITY dependency was found; those claims exist in the old README and are excluded from the new app.
- Security issues to avoid carrying forward: fallback JWT secret, unrestricted CORS, raw error disclosure, unvalidated record payloads, and HTML interpolation in toast/booking messages.
- Reusable concepts: appointment flow, record ownership, healthcare/finance navigation, form validation and financial calculator. DOM-based code is not copied into Angular. The original implementation remains available for later business-rule comparison.

## Asset provenance
The user-supplied `hefin-logo.png` is the authoritative logo. Full logo is preserved; shield and favicon are rectangular crops/resizes of its original pixels. Smart Hospital and Brain Wireframes are supplied 2D references, displayed and labeled as such. No GLB files or genuine 3D models were supplied.

## Scope and architecture
The specific Task 01 prompt supersedes the broad ten-day brief for this delivery. Angular standalone components, strict TypeScript, lazy feature routes, signals, RxJS, local fonts, Tailwind and CDK form the foundation. No backend, login authentication, AI, persistent clinical data or full dashboard functionality is represented as working.

Future boundary: Django/DRF is authoritative for sessions, roles and business data; FastAPI sits behind Django for authorized AI requests. Frontend route selection is never an authorization mechanism. Add server-enforced roles and object access before exposing records. PostgreSQL, Redis, Celery, MinIO and local Ollama remain future infrastructure.

## Checklist
- [x] Inspect and preserve existing source and assets.
- [x] Create isolated Angular frontend; exclude legacy blockchain claims.
- [x] Integrate original logo and supplied static reference images.
- [x] Centralize colors, typography, motion and light theme tokens.
- [x] Build shared components and responsive navigation.
- [x] Prepare public, portal and development showcase routes.
- [x] Prepare static scene boundaries without installing Three.js.
- [x] Day 2: richer landing storytelling and one lazy procedural Three.js scene, with calculated framing and verified lifecycle.
- [ ] Day 3: finish public content and design server-backed login flow.
- [ ] Later: Django auth/permissions, PostgreSQL, connected synthetic claims, AI/RAG.

See `VERIFICATION.md` for executed checks and limitations.

