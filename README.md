# HEFIN 3.0 — Task 03 cinematic frontend

An Angular prototype for **HEFIN CYBERCARE — SPECTRAL INTELLIGENCE**, with a genuine anatomical brain and rounded glass hospital in a shared interactive Three.js scene. Portal metrics and records are explicitly simulated; this is not an authenticated healthcare service.

## Run locally

Use Node.js 24.19+ and npm 11 (CI uses supported Node 22). Install Git LFS before cloning and run `git lfs pull` to obtain the GLB and editable Blender assets.

```powershell
cd frontend
npm ci
npm start
```

## Verification

```powershell
npm run typecheck
npm run build
npm test
```

Local Playwright uses Microsoft Edge; CI installs Chromium. For production, start `npm run preview` in another terminal and run `npm run test:production`.

For the Pages path, build with `npx ng build --base-href /-HEFIN/ --output-path dist/pages`, copy `dist/pages/browser/index.html` to `404.html`, start `node scripts/preview.mjs --pages`, then run `node tests/production-smoke.mjs --pages`. Stop any existing preview on port 4201 first.

## Documentation

- [Task 03 implementation, verification, screenshots and limitations](docs/TASK-03-CINEMATIC-3D.md)
- [Modeling workflow and editable sources](modeling/README.md)
- [Asset attribution and share-alike obligations](frontend/public/assets/models/ATTRIBUTION.txt)
- [Historical Task 02 README](docs/README-TASK-02.md)

Task 03 is isolated on `feature/task-03-cinematic-3d`. The PR targets `hefin-3.0-development`; pushing this feature branch does not deploy Pages. The existing deployment workflow runs on the development branch and has not been dispatched for Task 03.
