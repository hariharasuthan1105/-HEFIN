# Task 02 verification — 14 October 2026

## Final results

| Check | Result |
| --- | --- |
| Angular production build | PASS; no compiler warnings in the final build |
| TypeScript strict checks | PASS |
| Full Playwright suite | 28 passed, 2 intentionally skipped, 0 failed (4.2 minutes) |
| Production smoke | PASS: real 3D canvas, landing, deep links, no public development diagnostics/showcase and no console errors |
| Responsive review | 375, 768, 1024 and 1440px; screenshots and live resize verified |

The two skips are duplicate mobile executions of tests that already iterate through all four widths in the desktop project. The mobile project separately exercises mobile defaults, opt-in, reduced motion, WebGL failure, lifecycle, controls, route changes and document visibility. All Task 01 regression tests remain in place and pass.

## Camera crop resolution

The fixed FOV/distance combination clipped the campus in the narrow 768px hero canvas. `camera-fit.ts` now solves horizontal and vertical perspective constraints for all eight corners of a bounds envelope. The envelope contains the hospital, platform, signage, holographic panels, data-node path, small yaw rotation range and vertical motion. A 12% screen-space margin accommodates pointer movement. The original viewing direction and target are retained; the original distance is the minimum, with extra distance only where fitting requires it.

The browser test resizes the same running scene through 1440, 768, 375 and 1024px and moves the pointer near each canvas corner. Projected bounds stayed inside normalized device coordinates ±1 throughout. Recorded maximum absolute coordinates across the 16 samples were approximately 0.905 horizontally and 0.914 vertically. At 768px the entire platform, both wings, rooftop and holograms are visible. Desktop retains its original isometric composition with additional breathing room. Exact samples are saved in `task-02-framing.json` (`width` and `height` are canvas CSS dimensions).

## Measured resource observations

| Sample | Draw calls | Triangles | Owned geometries | Owned materials | Textures | Active renderers/loops |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Desktop active | 152 | 5,456 | 24 | 11 | 0 | 1 / 1 |
| Mobile opt-in active | 146 | 5,240 | 24 | 11 | 0 | 1 / 1 |
| After teardown, both | No further rendering | — | 0 | 0 | 0 | 0 / 0 |

Both lifecycle samples created and disposed two renderers, with no retained owned resources or duplicate animation chains. Additional tests repeated route transitions three times, toggled motion preferences, scrolled offscreen and back, and simulated hidden/visible document transitions. Paused/offscreen frame counters remained unchanged. Context-loss and initialization-failure tests both returned to the supplied static image.

These observations are resource accounting and regression checks, not proof against every possible memory leak or a browser/GPU heap audit. The configured 30/20 Hz render caps and 1.5/1 DPR limits are not guaranteed frame-rate claims. Test environments vary, and no ordinary-laptop performance guarantee is made.

## Functional and visual coverage

- All 13 development routes, browser title, fonts, original logo and favicon.
- Hero anchor and demo navigation, all portal previews, process-step and roadmap state changes.
- Theme persistence, skip link, mobile navigation, CDK dialog keyboard focus and reduced-motion CSS.
- Lazy import path, low-power static defaults, mobile opt-in, pause/resume, reset, static view, WebGL unavailability and context loss.
- Single canvas/renderer/RAF ownership, resize handling, offscreen suspension, hidden-document suspension and cleanup.
- No horizontal overflow at the four requested widths. Original assets remain present; no backend routes or private data were added.
- Hero and camera screenshots were reviewed at mobile, tablet and desktop sizes. The solution, preventive-care/emergency and AI sections were also reviewed in the production build at 375px and 1440px. Text and controls remain separated from the canvas. The brain is explicitly labeled as static.

Screenshots are `task-02-hero-*.png`, `task-02-camera-*.png`, full pages `task-02-{375,768,1024,1440}.png`, and individual `task-02-{solution,care,ai}-*.png`. Render counter snapshots are `task-02-render-{desktop,mobile}.json`.

## Build size

Final initial JS/CSS: **311.07 kB**, estimated transfer **80.95 kB**. Hospital renderer and Three.js: separate lazy chunk **555.68 kB**, estimated transfer **115.63 kB**. Home page: separate lazy chunk **24.37 kB**. Images and fonts are additional requests. No postprocessing, paid model or additional 3D framework is used.

## Commands executed

- Repository/file inspection, `git status --short` (no Git repository exists here), source and test review. Existing Task 01 ZIP retained.
- Initial Task 02 dependency additions: `npm install three` and `npm install -D @types/three`. Dependencies were not reinstalled during the resume.
- Prettier formatting of changed TypeScript, template and CSS files using the installed formatter.
- `npm run build`, `npm run typecheck`, `npm test`.
- `npm run preview`, followed by `npm run test:production`.
- Playwright production-section capture script for visual review.
- Source packaging with generated dependencies, caches, test reports and build output excluded; archive integrity verification.

## Issues encountered and fixed

- The 768px camera crop was resolved with calculated perspective fitting rather than another breakpoint offset.
- A nullable-context strict-check error in the context-loss cleanup guard was corrected before final tests.
- A restricted-shell build could not traverse required parent directories. The final build ran successfully with the approved filesystem execution context.
- Context-loss teardown avoids requesting a second loss on an already-lost context, removing the earlier Three.js warning.
- Fallback accessibility text now describes a static reference instead of announcing a 3D scene.

## Remaining limitations and readiness

Task 02 is ready for Task 03. No blocking issues remain in the verified scope. Validation used Microsoft Edge/Chromium and mobile emulation; physical devices, Safari and Firefox were not tested. Low-power detection uses conservative viewport/device hints rather than battery telemetry. The hospital is a simplified procedural interpretation; the AI brain remains static. Backend authentication, Django, FastAPI, AI/RAG, actual claims and contact submission are deliberately outside this task. Task 03 has not been started and the site has not been publicly deployed.

The Task 01 verification report is preserved as `VERIFICATION-TASK-01.md`.
