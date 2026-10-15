# Task 03 release report

## Review and quality gates

PR #2 was reviewed and approved for release into `hefin-3.0-development`. The genuine anatomical brain and original glass hospital GLBs, neural paths, holographic panels, display platform, three material modes, camera controls and fallback behavior are preserved. The Angular architecture, original gold branding, seven local font families, restrained pixel accents and clearly simulated stakeholder previews remain intact.

The release investigation resolved Linux software-rendering stalls by retaining detailed geometry with a bounded 180,000-pixel drawing buffer, DPR at most 0.65, 5fps and fewer screen passes. Hardware rendering preserves its full quality. Aggregate material/camera/route tests have explicit time budgets; model initialization assertions remain bounded at 30 seconds. No behavioral assertion or required scenario was removed.

- Final Linux CI: [run 38596749900](https://github.com/hariharasuthan1105/-HEFIN/actions/runs/38596749900), **success**. Browser suite: **39 passed, 0 failed, 3 intentional skips**, 7.6 minutes. Pages build and production smoke also passed.
- Fresh local `npm ci`: completed; audit reported zero vulnerabilities. npm 11 printed install-script approval notices for four native dependencies; installation and builds completed.
- Local typecheck: passed, zero errors.
- Local Angular production build: passed, zero build warnings. Initial bundle 320.06kB raw / 82.70kB estimated transfer; lazy renderer 682.86kB / 143.56kB.
- Final local suite on release commit: **39 passed, 0 failed, 3 intentional skips**, 4.4 minutes.
- Root production and `/-HEFIN/` Pages production smoke tests: passed, no JavaScript or console errors.
- Additional forced-SwiftShader checks exercised all 15 desktop 3D scenarios. The two multi-viewport cases were rerun successfully after their aggregate budgets were corrected; the final pixel-budget material/control check also passed.

The three mobile skips are duplicate invocations of tests that explicitly cover all requested widths in their desktop project. Development-only shader precision and image-loading warnings are distinct from production build warnings and runtime errors.

## Visual, accessibility and repository review

Reviewed 375, 768, 1024, 1440 and 1920px captures and light theme. Both subjects fit, interior equipment remains visible, controls do not overlap, and the page has no horizontal overflow. Keyboard navigation, mobile menu, dialog focus, synthetic portal tables, reduced motion, corrupt-model/WebGL/context-loss fallbacks, navigation cancellation and renderer cleanup passed browser tests.

Brain: 717,836 bytes, CC BY-SA 4.0, with upstream credit, modification notice and share-alike terms preserved. Hospital: 1,150,132 bytes, original reference-inspired geometry. Decoder: Apache 2.0 with LICENSE included. Export/source hashes match the manifest. Git LFS fsck passed and remote CI checked out real LFS objects. No portable Blender executable, build directory, dependency directory, trace archive or actual credential was included in the release changes.

## Merge and deployment

- [PR #2](https://github.com/hariharasuthan1105/-HEFIN/pull/2): merged 14 October 2026, 16:28:10 UTC.
- Final reviewed feature commit: `2e3b0ee1f823a2c4b1f2a463f523286f6fa313e6`.
- Merge method: permitted merge commit.
- Merge SHA: `71eee62365932451d0e8cf0e59cb74f54b8370bd`.
- Feature branch preserved: `feature/task-03-cinematic-3d`.
- Main baseline and post-merge SHA: `045bcbb1f84ec84919131a137b2e8f179b45d8f6`, unchanged.
- Deployment branch: `hefin-3.0-development`; Pages uses the Actions workflow, not the legacy branch-source field in Pages metadata.
- [Merge deployment run](https://github.com/hariharasuthan1105/-HEFIN/actions/runs/38598331684): **success**, including build, upload and public publication.
- [Live website](https://hariharasuthan1105.github.io/-HEFIN/).

## Public browser verification

The actual public Angular website passed browser verification after the merge deployment completed. The home page displays HEFIN branding and the cinematic experience. Both downloaded GLBs match the manifest SHA-256 values. All three material modes work; canvas captures change during animation, remain stable during pause, change during orbit and reproducibly return to the reset view. All seven font families, decoder files, fallback image and attribution load successfully. About, AI, Login and all four portal routes render correctly on direct navigation and refresh. Mobile menu navigation, all five requested widths and reduced motion passed. No JavaScript errors, failed asset responses, failed requests or unexpected console errors occurred. Expected document HTTP 404 messages accompany the Pages SPA fallback and are recorded separately. Evidence: [browser verification JSON](task-03-live-verification.json), [live desktop capture](task-03-live-desktop.png).

## Remaining limitations

The architecture and brain rendering are illustrative approximations of the supplied reference, with smoother cerebellar folia and a different hospital roofline. Portal data and holographic medical values remain fictional. Mobile/reduced-motion devices default to a static capture; software rendering has reduced sharpness, effects and frame rate. Local CPU timings are observations, not guaranteed GPU performance or proof of leak-free browser memory.

GitHub Pages serves the SPA fallback document with HTTP 404 on direct paths that have no static file. The browser verification distinguishes those expected document responses from missing assets or application errors. Such paths must still render and refresh the correct Angular route.

Publishing this report will trigger a further Pages deployment from the development branch. That deployment and the public browser checks will be verified again before the release handoff. [Development deployment history](https://github.com/hariharasuthan1105/-HEFIN/actions/workflows/deploy-pages.yml?query=branch%3Ahefin-3.0-development).
`cd frontend; node tests/live-release-smoke.mjs` reproduces the public browser checks (Microsoft Edge locally, Chromium in CI).
