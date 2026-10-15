# Reproducible 3D assets

Blender 4.5.9 LTS was used as a portable workspace tool. It is not an application dependency and is not included in the repository. The existing editable `.blend` files can be opened directly; do not regenerate the hospital just to change its materials.

## Hospital

Original reference-inspired geometry: five storeys, rounded twin wings, cylindrical atrium with circular platforms and spiral treads, glass mullions, beds with pillows/rails/casters and monitors, HVAC grilles/fans, antennas, rooftop planters, entrance canopy/steps, plaza paving and shrubs. Nine material batches replace thousands of individual draw calls.

```sh
blender --background --python build_hospital.py -- /absolute/output-directory
blender --background /absolute/output-directory/smart-hospital.blend --python refine_hospital.py -- /absolute/refined-directory
```

The refinement removes horizontal emissive caps so large floor surfaces do not glow. Runtime curves restore continuous fine cyan facade lines. Copy the refined GLB to `frontend/public/assets/models/` and preserve the refined Blender source here.

## Anatomical brain

Source download: https://itayinbarr.github.io/brainproject/models/brain.glb

Source repository: https://github.com/itayinbarr/brainproject — upstream revision observed during this work: `2929e94f521a8ddceab26bc100a98dc06b0da060`. Asset byte hashes and binary validation are recorded in `asset-manifest.json`.

```sh
blender --background --python prepare_brain.py -- /absolute/source-brain.glb /absolute/output-directory
```

The script preserves selected cortical, cerebellar and brainstem surface geometry, including both hemispheres. It removes hidden internal structures, recenters/rescales, simplifies large surfaces to 48% face count, assigns materials, adds short illustrative surface signals and batches by material. `brain-structures.json` records every retained source structure and face count before final batching. The resulting GLB has five material batches.

This is an atlas-derived gross-anatomy illustration. Its cerebellar surface is smoother than the dense folia in the supplied reference; neither the source nor these modifications is claimed to replicate that reference exactly. No generic sphere was substituted for the brain.

Brain mesh, editable source and derived imagery: **CC BY-SA 4.0**. Preserve the complete attribution in `frontend/public/assets/models/ATTRIBUTION.txt` and `BRAIN-SOURCE-LICENSE.txt`. The application's code license does not override the model's license.

## Export and runtime

Both assets use binary glTF 2.0 with `KHR_draco_mesh_compression`. The application resolves models and local decoder files relative to `document.baseURI`, including the GitHub Pages `/-HEFIN/` base. No model CDN is used at runtime.

Git LFS is configured for `.glb` and `.blend`. Both CI workflows enable LFS checkout. The model source files stay outside `frontend/public`, so editable Blender data is not shipped in the website.
