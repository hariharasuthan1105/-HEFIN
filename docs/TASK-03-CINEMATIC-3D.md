# Task 03 — cinematic 3D and premium motion

## Scope and delivery

Continued the existing Angular application from development commit `473b196`, on `feature/task-03-cinematic-3d`. Task 02 history and its README are preserved in [README-TASK-02.md](README-TASK-02.md). The gold logo remains unchanged. No backend, authentication, payment processing or clinical functionality is implied.

## Scene architecture

The landing page has one shared cinematic scene: anatomical brain on the left, rounded five-storey hospital on the right, nine neural pathways, animated nodes, circular display platform, holographic medical panels and reflective ground. Earlier hero/AI previews remain static to avoid multiple simultaneous WebGL contexts.

`cinematic-healthcare-scene.ts` owns accessible controls and loading state. It lazily imports the renderer when visible. AbortController plus a request-generation guard prevent navigation during loading from installing a late canvas. Partial model-load failures release successful resources. The renderer uses local GLTFLoader/DRACOLoader, one animation loop, visibility-aware pause and explicit cleanup of geometry, materials, textures, render targets, listeners and context. Debug counters are development-only.

Controls provide Glass, Wireframe and Hybrid materials, pause/resume, reset, bounded orbit, static preview and explicit 3D opt-in. Mouse drag rotates within bounded angles; touch retains normal page scrolling. Keyboard buttons expose the same camera operations. Material buttons expose pressed state; captions announce state changes.

## Assets and provenance

| Asset | Bytes | Triangles | Batches |
| --- | ---: | ---: | ---: |
| Anatomical brain | 717,836 | 206,446 | 5 |
| Smart hospital | 1,150,132 | 134,204 | 9 |
| Combined | 1,867,968 | 340,650 | 14 |

Both GLBs have valid glTF 2.0 headers and Draco compression. SHA-256 values and the downloaded source brain hash are in [asset-manifest.json](../modeling/asset-manifest.json). Editable `.blend` files and generation/refinement scripts are in [modeling](../modeling/README.md); Blender executables and downloaded archives are excluded.

Brain Project / Z-Anatomy / BodyParts3D source anatomy is retained under **CC BY-SA 4.0**, including the modified mesh, editable source and derived scene imagery. The preparation retains 176 cortical, cerebellar and brainstem structures, removes hidden internal structures, normalizes scale, simplifies larger surfaces to 48% face count and batches by material. Decorative signals are illustrative, not measured connectivity. The upstream revision in the modeling README was observed during acquisition; the downloaded hosted model is identified by its byte hash, not asserted to be byte-identical to that Git revision.

The hospital is original reference-inspired geometry, including beds, monitors, mullions, atrium, rooftop equipment and planters. Local Draco decoder files carry the Apache 2.0 license. Preserve [ATTRIBUTION.txt](../frontend/public/assets/models/ATTRIBUTION.txt), the complete upstream license beside it and the decoder LICENSE. GLB and Blender files use Git LFS; CI checks out LFS objects.

## Materials and lighting

Brain surfaces combine physical materials, cyan/violet Fresnel illumination and fine mesh wireframe. Hospital glazing remains transparent enough to expose rooms and beds; facade lines are separated from floor geometry to prevent overexposed slabs. Environment lighting, warm interiors, restrained bloom and cool edge lighting provide contrast. The desktop ground uses a 512px planar reflection; mobile omits that pass. The medical panels show synthetic ECG/DNA/body illustrations, not live health data.

## Typography, motion and accessibility

Seven existing self-hosted font families remain local. A reusable cinematic headline provides staggered word reveals with one screen-reader text equivalent. Shared spacing, radius, glass, focus and motion tokens unify headings, cards, portal tables and controls; pixel-style micro-labels provide restrained accents. Reduced-motion rules disable decorative reveals and default to a static scene. Light theme retains legible text and controls.

All four stakeholder previews now display clearly labeled simulated metrics and tables with captions, headers and keyboard-operable detail disclosures. Existing skip navigation, focus-trapped dialog, theme persistence and routes are preserved. A real mobile-menu regression was fixed by giving the blurred header an explicit stacking order, preventing hero text from intercepting menu clicks.

## Responsive behavior and performance

Camera fitting uses complete scene bounds with padding and is recalculated on resize. At widths up to 600px, low-core/low-memory devices or save-data connections, the scene defaults to its rendered WebP fallback; 3D remains an explicit option. Reduced motion does not automatically download the GLBs. Corrupt models or context loss restore the static preview.

Rendering is capped at 30fps desktop / 20fps mobile, DPR 1.25 / 1. Desktop captures reported roughly 178 draw calls and 1,135,786 submitted triangles including reflection and overlays; mobile reported 98 calls and 567,914 triangles. These exceed source mesh triangles because multiple passes render geometry. The responsive capture run observed model initialization around 2.1–2.3 seconds and CPU render-submission samples around 9.2–10.4ms. These are local observations, not portable GPU benchmarks or guaranteed frame rates.

See [responsive measurements](task-03-performance.json), [desktop lifecycle](task-03-render-desktop.json), [mobile lifecycle](task-03-render-mobile.json), [root production](task-03-production.json) and [Pages production](task-03-production-pages.json). Cleanup counters reach zero owned renderers, loops, geometries, textures and materials. Browser heap snapshots include the whole application without forced GC and do not prove absence of leaks. Driver shader-precision warnings may occur; no JavaScript or console errors occurred in production smoke checks.

Production initial bundle: 320.06kB raw / 82.78kB estimated transfer. Lazy cinematic renderer: 682.45kB raw / 143.30kB estimated transfer. Models and decoder are separate lazy resources.

## Verification — 14 October 2026

- TypeScript: passed, zero errors.
- Angular production build: passed, zero build warnings.
- Full Playwright suite: **39 passed, 0 failed, 3 skipped**, 42 total, one worker. Skips are duplicate mobile invocations of desktop tests that already exercise all viewport sizes.
- Root production browser smoke: passed.
- Pages production build and browser smoke under `/-HEFIN/`: passed.
- Tested genuine GLB loading, material controls, pause/reset/orbit, lazy loading, reduced motion, corrupt model fallback, cancellation during navigation, context loss, hidden-tab pause, route-cycle cleanup, responsive framing, routes, local fonts/logo, theme, keyboard navigation, mobile menu, dialog and all simulated portals.

Test repairs preserve behavioral assertions: the portal badge expectation matches the explicit simulated label; only narrow viewports click opt-in because desktop automatically loads; the breakpoint model wait uses the same 30-second allowance as other model tests. The old failure contexts were reviewed and preserved outside the checkout before rerunning.

Pages assets resolve relative to document.baseURI: GLBs, Draco WASM, fallback, logo, fonts and lazy chunks. The production smoke checks model/decoder response paths and direct route navigation. The generated `404.html` is an exact copy of index.html, providing GitHub Pages' SPA fallback document (GitHub can still return HTTP 404 for an unknown deep-link URL). Local preview validates application routing, not a new remote deployment. The live website was not replaced.

## Reference comparison and captures

The supplied [reference board](references/task-03-reference.png) guides the composition. Anatomical folds, stem, cyan/violet highlights, connecting paths, rounded glass architecture, interior furniture, circular platform and holographic panels are present. The scene is an illustrative real-time approximation: the cerebellum has smoother folia, the hospital uses twin wings and a cylindrical atrium instead of the reference's asymmetric flowing roof, and there is no photorealistic city/crowd rendering. Mobile fallback preserves the composition with smaller visual detail. It is not a pixel-identical reconstruction or a medical visualization tool.

Reviewed captures have no horizontal overflow and retain both subjects:

- [375px](task-03-cinematic-375.png)
- [768px](task-03-cinematic-768.png)
- [1024px](task-03-cinematic-1024.png)
- [1440px](task-03-cinematic-1440.png)
- [1920px](task-03-cinematic-1920.png)
- [Light theme](task-03-light.png)

## GitHub delivery

Feature branch: [feature/task-03-cinematic-3d](https://github.com/hariharasuthan1105/-HEFIN/tree/feature/task-03-cinematic-3d).

Target: `hefin-3.0-development`. The PR quality workflow runs type checking, production build, browser suite and Pages smoke without deployment. No merge, force push or Pages dispatch is part of this task. PR and CI details are recorded after publication below.

Implementation commit: [5968cc5](https://github.com/hariharasuthan1105/-HEFIN/commit/5968cc5eacb5a0f10bd6aec712934bcf5a594c23).
Pull request: [#2](https://github.com/hariharasuthan1105/-HEFIN/pull/2).
Remote quality checks: [current PR checks](https://github.com/hariharasuthan1105/-HEFIN/pull/2/checks). Status is live there; local results above are the completed verification record. All four LFS objects uploaded successfully and `git lfs fsck` passed.

### Release review correction

The first Linux CI run completed with 29 passed, 10 failed and 3 skips. Its failures clustered around desktop rendering and model-reload waits. Software rasterizers now retain the same detailed GLBs and controls at DPR 0.65 and 5fps, with planar reflection and bloom omitted to preserve CPU time for interaction. Hardware-rendered desktop/mobile quality remains unchanged. Development metrics expose the selected quality. `HEFIN_SOFTWARE_TEST=1` forces Chromium's documented SwiftShader backend for reproducible local verification (https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md). Model reload assertions consistently allow 30 seconds; behavioral outcomes are unchanged.
