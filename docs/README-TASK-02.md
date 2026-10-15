# HEFIN 3.0 — Task 02 cinematic frontend

A working Angular prototype for **HEFIN CYBERCARE — SPECTRAL INTELLIGENCE**, enhanced in place with a cinematic landing page and a genuine procedural Three.js hospital. The original gold logo and both supplied reference images are preserved.

## Start locally

Use Node.js 24.19+ and npm 11. The lockfile pins the verified dependency tree.

```powershell
cd frontend
npm ci
npm start
```

Open http://localhost:4200. The development-only component showcase is at `/design-system`.

```powershell
npm run build
npm run typecheck
npm test
```

To inspect the production bundle, run `npm run preview` after building and open http://127.0.0.1:4201. With that server running, `npm run test:production` checks production routing and the hidden development showcase.

Browser tests use an installed Microsoft Edge browser (`channel: 'msedge'`) on Windows. On a machine without Edge, install Playwright Chromium (`npx playwright install chromium`) and remove the channel setting from `playwright.config.ts`. Tests start their own development server if one is not already reachable. The mobile project emulates an iPhone-size viewport in Chromium; it does not test Safari.

Production output: `frontend/dist/frontend/browser`. Serve it with an SPA fallback to `index.html` for deep links. Do not open `index.html` through `file://`. The `/design-system` route and footer link are disabled in production.

## Implemented

- Angular 22.2, standalone components, lazy routes, strict TypeScript and strict Angular templates.
- Original full HEFIN logo, cropped shield emblem, generated multi-resolution favicon, browser metadata.
- Responsive public layout, twelve-part landing narrative, four-role portal selector and clearly labeled dashboard layout previews. Hero CTAs lead to the mission section and portal selector; process and roadmap controls change their explanatory panels.
- Public pages: `/`, `/about`, `/solution`, `/how-it-works`, `/ai`, `/roadmap`, `/contact`; `/login`; four `/<role>/dashboard` routes; not-found recovery.
- Interactive proposed workflow diagram and persistent dark/light theme toggle.
- Twelve reusable foundation components, Lucide icons, Tailwind CSS, CDK focus-trapped dialog and selectively used Material progress bar in the development showcase.
- Central CSS color, typography and animation tokens. All seven requested font families are self-hosted through Fontsource. Body copy uses Plus Jakarta Sans; headings use Space Grotesk; technical labels use JetBrains Mono. Other display families are available in the showcase for selective later use.
- Interactive procedural SmartHospitalScene: two wings, glass atrium, medical cross, helipad, rooftop equipment, architectural lighting, holographic ECG panels, data nodes and ground platform. AIBrainScene and HEFINShieldScene remain explicitly static.
- Keyboard skip link, focus-visible states, mobile menu, focus management on route changes and reduced-motion overrides.

## Scope and honest limitations

The scope is **Task 02**, not the full ten-day project. No Django, FastAPI, RAG, database, backend API, real login, contact submission or full dashboard has been implemented. There are no demo credentials yet. Portal selection opens public layout previews and never authenticates a user. The hospital is an original procedural 3D concept, not a precise reconstruction or live hospital integration. The AI brain and shield remain **static 2D images**. No real partnerships, claim decisions, government connections or financial transfers are represented.

No clinical or financial data is stored. The only browser persistence is the theme preference. The contact route explicitly explains that submission is unavailable. Future integrations must enforce authentication and object permissions on Django independently of frontend guards.

Lucide's Angular adapter currently advertises support only through Angular 21. The app uses the framework-independent `lucide` package through a small typed Angular wrapper instead of bypassing peer dependency checks. Three.js 0.186 is loaded only for the hospital scene. GSAP, ECharts and AI libraries remain deferred.

## Hospital rendering architecture

`SmartHospitalScene` is the Angular lifecycle/accessibility adapter. It renders the supplied image immediately and uses IntersectionObserver to decide when the scene is visible. Only then, if motion and power preferences allow it, it dynamically imports `hospital-renderer.ts`. Three.js stays in that separate lazy chunk; there are no paid models, HDR textures, postprocessing passes or additional 3D frameworks.

The renderer owns one guarded requestAnimationFrame chain. Submission is capped at 30 Hz on desktop and 20 Hz on mobile opt-in; those are configuration limits, not guaranteed measured frame rates. DPR is capped at 1.5 and 1 respectively. Rendering stops when the host leaves the viewport, the document is hidden, or the user pauses motion. ResizeObserver updates canvas dimensions and camera fit. Teardown cancels RAF, disconnects observers, removes listeners, disposes shared geometries/materials/textures and instance buffers, releases render lists and renderer, and loses the owned context unless it is already lost. An async request generation counter prevents imports completing after teardown from creating a late canvas.

### Calculated camera framing

The initial 768px crop came from using nearly the same camera distance/FOV in a much narrower canvas. `camera-fit.ts` now fits the eight corners of an envelope around the complete hospital, platform, holograms and animated node path. The envelope includes the yaw sweep and vertical motion. For each camera-space corner, it solves the horizontal and vertical perspective constraints using FOV and current aspect ratio, with a 12% margin. The original desktop angle, target and minimum distance are retained; narrower canvases move the camera back only as far as the bounds require. Reset and live resizing use this fitted baseline. Browser tests project the envelope into normalized device coordinates at all four requested sizes and during pointer movement to verify containment.

### Fallback and controls

- Reduced motion uses the static reference and disables automatic 3D loading; changing the preference while rendering tears down the scene.
- Widths up to 600px, available device memory of 4GB or less, four or fewer reported logical processors, or Save-Data default to static. These are conservative heuristics, not actual battery detection. The explicit **Load 3D preview** button permits opt-in unless reduced motion is requested.
- WebGL 2 initialization failure, context loss or import failure returns to the original image. The hospital portal link remains available without WebGL.
- Pause/resume, reset and static-view controls are native keyboard-accessible buttons outside the canvas. Touch events do not capture or block page scrolling. Pointer movement gently changes the view and architectural highlights.
- Use a current WebGL 2-capable browser for interactive rendering. Verified browser coverage is Edge/Chromium desktop and mobile emulation, not physical iOS/Safari. The static fallback remains usable without WebGL 2.

## Source map

| Location | Purpose |
| --- | --- |
| `legacy/` | Unmodified contents of the supplied project archive |
| `frontend/src/app/core/` | Navbar, footer, theme service and future guard boundary |
| `frontend/src/app/shared/` | Reusable UI, icons, portal placeholder and motion notes |
| `frontend/src/app/features/` | Public pages, portal selection and future role folders |
| `frontend/src/app/three-d/` | Lazy hospital renderer, calculated camera fit and static scene adapters |
| `frontend/src/styles/` | Design tokens, typography, component styles and motion |
| `frontend/public/assets/` | Original/optimized images, logo derivatives and model notes |
| `frontend/tests/` | Playwright route, asset, accessibility and interaction checks |
| `docs/MIGRATION.md` | Audit, architecture and phased migration checklist |
| `docs/VERIFICATION.md` | Actual verification outcomes and limitations |

## Next task

Task 03 can continue from this frontend according to its brief. Task 03 has not been started. Backend, authentication and AI services remain deferred.

Compatibility reference: https://angular.dev/reference/versions. Existing source is retained under its original license in `legacy/LICENSE`. User-supplied artwork is retained for this project; no third-party model rights are claimed.

