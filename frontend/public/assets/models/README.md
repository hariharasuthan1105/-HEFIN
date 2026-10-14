# Future model assets
No GLB/glTF models were supplied. Task 02 builds the hospital procedurally in `src/app/three-d/smart-hospital/hospital-renderer.ts`, inspired by the original architectural reference. No external model is required. The brain and shield remain static images.

The hospital uses a dynamic Three.js import, calculated perspective camera fit, capped DPR and node count, visibility-aware rendering, reduced-motion and low-power defaults, and explicit resource disposal. Keep controls and descriptions outside the canvas when adding future models.
