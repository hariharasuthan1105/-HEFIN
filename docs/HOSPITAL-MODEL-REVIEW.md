# Hospital model and viewer review

Hospital-only local revision, finalized 17 October 2026. No PR, push, deployment, backend, authentication, API, database, or workflow changes.

## Delivered

- Genuine Draco-compressed GLB: `frontend/public/assets/models/smart-hospital.glb`.
- Editable Blender source: `modeling/smart-hospital.blend`; reproducible generation and finishing scripts alongside it.
- Six levels with pearl rounded wings, blue glazing, medical beds/monitors, partitions, waiting furniture, reception, gold spiral atrium, raised medical helipad, rooftop HVAC/gardens and landscaped podium.
- Homepage Three.js viewer with unrestricted azimuth rotation, mouse/touch drag, wheel/pinch/button zoom with limits, reset, front/side/top views, keyboard controls, autorotation and pause. Existing navigation links retained.
- The separate cinematic scene uses the same updated hospital asset and its authored palette. Brain geometry and unrelated feature code are unchanged.
- Intersection-based loading, mobile/data-saving opt-in, reduced-motion still mode, offscreen/background suspension, bounded DPR, demand rendering when paused, context-loss fallback and resource disposal.
- `hospital-model.webp` is a capture of this real mesh, not an uploaded reference photograph. Embedded PBR materials require no texture downloads.

## Geometry and performance

| Item | Value |
|---|---:|
| GLB bytes | 2,106,832 (2.01 MiB) |
| Triangles | 321,108 |
| Material/mesh batches | 14 |
| Editable Blender bytes | 18,876,460 (18.0 MiB) |
| Desktop draw calls including shadow/bloom passes | 42 observed |
| Software-rendered draw calls | 15 observed (14 model batches + floor) |

The desktop path uses environment lighting, a shadow-casting key light and restrained bloom. Mobile/software paths omit shadow and bloom passes. Desktop pixel ratio is capped at 1.5, mobile at 1, and software rasterization at 0.8 and 250,000 pixels. The animation loop is capped near 30 fps on normal devices and about 6 fps in software rendering; paused scenes draw only when controls or size change. Browser-observed values are in `hospital-performance.json`. CPU render-call timing is not GPU time or a general FPS guarantee.

## Evidence

Actual browser screenshots:

- [Desktop viewer](hospital-desktop.png), [mobile viewer](hospital-mobile.png)
- [Desktop page](hospital-page-desktop.png), [mobile page](hospital-page-mobile.png)
- [Isometric](hospital-isometric.png), [front](hospital-front.png), [side](hospital-side.png), [top](hospital-top.png)
- [Tablet](hospital-tablet.png), [375px](hospital-375.png)

The four model-view captures enlarge the same viewer and hide surrounding page overlays for inspection. They do not substitute an offline renderer or reference image.

## Validation

- Strict Angular typecheck: passed after resume.
- Angular production build: passed, no build warnings; initial JS/CSS 320.25 kB raw / 82.77 kB estimated transfer.
- Root-path production smoke: passed after resume.
- `node tests/production-smoke.mjs --pages`: passed after resume against the local `/-HEFIN/` production build. Explicit model, fallback and both decoder URL requests returned HTTP 200. Both production smoke runs had zero console errors and zero broken requests; deliberate navigation cancellations (`net::ERR_ABORTED`) are excluded from network failures.
- Forced SwiftShader software rendering: 1 passed, 0 failed. Verified motion/pause, wheel zoom, resize and context-loss fallback. It selected the software path, DPR 0.8, 15 draw calls and 321,110 rendered triangles including the floor. Local model initialization was about 3.47 seconds. The render-call CPU sample was about 1.1 ms, not a GPU/FPS measurement.
- Final resumed frontend regression: **45 passed, 0 failed, 3 intentionally skipped**, including all six hospital tests across desktop and mobile. The separate forced-software check also passed (1/1).

The initial interrupted software check failed because the test raced desktop automatic loading and waited for a disappearing opt-in button. The test now clicks opt-in only on mobile and awaits automatic loading on desktop. No working model or interaction was replaced.

Expected diagnostics during deliberately injected model/WebGL failures and benign ANGLE precision warnings appear in development test logs. Normal production checks have no browser console errors.

## Visual limitations

The result is a detailed stylized architectural model, not a photorealistic match to the AI-generated references. Plants, people, bedding and equipment are simplified. Transparent glazing uses alpha blending rather than ray-traced refraction; interiors use authored warm materials and illustrative lighting, not a physically simulated lighting study. There are no baked photographic textures, animated staff or operational hospital systems. The helipad/floor plan are visual concepts, not certified architectural or aviation designs. Lower-power rendering has less glow and softer image detail.

## Changed files

`modeling/build_hospital.py`, `refine_hospital.py`, `smart-hospital.blend`, `asset-manifest.json`, and the hospital part of `modeling/README.md`; the hospital GLB, attribution and generated still; `smart-hospital-scene.ts`, new `hospital-viewer.ts`/`.css`, the hospital-material block in `cinematic-healthcare-renderer.ts`, and hospital-only spacing in `styles/landing.css`. New hospital tests and scoped canvas/unique-asset assertions in existing frontend smoke tests account for the newly interactive homepage scene.

## Workspace and delivery

Work remains in the existing Git checkout at `C:/Users/hariharasuthan/Documents/Codex/2026-10-13/v/outputs/hefin-task03`, not in the extracted ZIP. No transfer into another checkout is required to use these changes here. No commit, PR, push or deployment has been made. The public GitHub Pages site continues to show the previously deployed version.

Temporary `debugHospital` scene exposure and the debug script are absent from source. Production checks assert that neither `debugHospital` nor hospital test metrics are exposed globally. Development-only numeric counters remain for repeatable interaction/resource tests; they do not expose the scene graph and are omitted from the production window.

A single local production preview is retained at `http://127.0.0.1:4201/` for review. Test-owned development servers stop when Playwright finishes. Earlier generated Task 03 evidence is preserved outside the checkout before restoring the historical release documents; final hospital evidence remains under `docs/hospital-*`.


## Exact final file inventory

Paths below are relative to the checkout named above.

- Modified: `frontend/public/assets/models/ATTRIBUTION.txt`
- Modified: `frontend/public/assets/models/smart-hospital.glb`
- Modified: `frontend/src/app/three-d/cinematic-healthcare/cinematic-healthcare-renderer.ts`
- Modified: `frontend/src/app/three-d/smart-hospital/smart-hospital-scene.ts`
- Modified: `frontend/src/styles/landing.css`
- Modified: `frontend/tests/cinematic.spec.ts`
- Modified: `frontend/tests/landing-3d.spec.ts`
- Modified: `frontend/tests/production-smoke.mjs`
- Modified: `modeling/README.md`
- Modified: `modeling/asset-manifest.json`
- Modified: `modeling/build_hospital.py`
- Modified: `modeling/refine_hospital.py`
- Modified: `modeling/smart-hospital.blend`
- Added: `docs/HOSPITAL-MODEL-REVIEW.md`
- Added: `docs/hospital-375.png`
- Added: `docs/hospital-desktop.png`
- Added: `docs/hospital-front.png`
- Added: `docs/hospital-isometric.png`
- Added: `docs/hospital-mobile.png`
- Added: `docs/hospital-page-desktop.png`
- Added: `docs/hospital-page-mobile.png`
- Added: `docs/hospital-performance.json`
- Added: `docs/hospital-production-pages.json`
- Added: `docs/hospital-production.json`
- Added: `docs/hospital-side.png`
- Added: `docs/hospital-software-performance.json`
- Added: `docs/hospital-tablet.png`
- Added: `docs/hospital-top.png`
- Added: `docs/hospital-verification.json`
- Added: `frontend/public/assets/images/hospital-model.webp`
- Added: `frontend/src/app/three-d/smart-hospital/hospital-viewer.css`
- Added: `frontend/src/app/three-d/smart-hospital/hospital-viewer.ts`
- Added: `frontend/tests/capture-hospital.mjs`
- Added: `frontend/tests/hospital-model.spec.ts`
