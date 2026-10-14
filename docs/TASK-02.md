# Task 02 implementation checklist

## Inspection
Read the existing README, file inventory, verification report, landing component, static scene, animation utilities, routing and Playwright suite. The Angular 22 app and original artwork remain the baseline; Task 01 is preserved in its existing ZIP. No backend work is in scope.

## Implementation
- [x] Refine split hero and introduce all twelve requested content sections.
- [x] Build one procedural hospital renderer behind a dynamic import.
- [x] Add visibility-aware scheduling, DPR limits, motion/power fallback, pointer orbit and reset/pause controls.
- [x] Release renderer, geometry, material, observers, events and RAF on route teardown; cancel stale asynchronous loads.
- [x] Preserve static brain; explain proposed Gemma, RAG, document intelligence and human oversight.
- [x] Add restrained reveal motion and interactive proposed workflow/roadmap.
- [x] Verify 375, 768, 1024 and 1440px layouts, fallbacks, keyboard controls and render lifecycle.
- [x] Run production build, strict checks, existing and new tests; inspect screenshots and update delivery documentation.

Technical references: [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html), [resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html). No performance guarantee is implied by configuration limits; actual test measurements will be recorded in the verification report.

