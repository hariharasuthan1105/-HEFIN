# Reproducible 3D assets

Blender 4.5.9 LTS was used as a portable workspace tool. It is not an application dependency and is not included in the repository. The existing editable `.blend` files can be opened directly; do not regenerate the hospital just to change its materials.

## Hospital

The hospital-only revision uses all six supplied October 15 references: the four white-and-glass architectural perspectives, the multi-view Medical Centre showcase, and the modelling reference board. These are raster references, not supplied editable models.

The original scripted mesh now has reception plus five inpatient levels, rounded pearl wings, front/rear wards and side beds, glazing and partitions, monitors, waiting furniture, a cylindrical atrium with spiral stair treads and gold helical rails, an elevated cyan medical helipad, mechanical roof units, planted terraces and a landscaped podium. Fourteen material batches keep detailed geometry affordable to draw. The GLB has 321,108 triangles and is 2,106,832 bytes (Draco compressed). No external textures are required; materials are embedded PBR definitions.

```sh
blender --background --python build_hospital.py -- /absolute/base-output
blender --background /absolute/base-output/smart-hospital.blend --python refine_hospital.py -- /absolute/final-output
```

Run refinement once on the base output. It raises the crown, clears helipad vegetation, strengthens the atrium handrails, adjusts warm materials, smooths foliage and rebatches the mesh. Copy the final GLB to `frontend/public/assets/models/` and preserve the final Blender source here. The committed `.blend` is already refined. The generator shares mesh datablocks during construction; final meshes are joined by material for web delivery. The Blender source is about 18.9 MB and is not downloaded by visitors.

The homepage `smart-hospital` viewer uses the existing Three.js install, local Draco decoder, OrbitControls, bounded zoom and four camera views. Mobile/reduced-motion/data-saving users begin with an actual-model still render and can explicitly opt in. Desktop rendering adds shadows and restrained bloom; mobile/software rendering omits those passes. Both scenes retain the authored hospital palette through `prepareHospital()`.

This is a stylized architectural model, not a photographic reconstruction. Foliage, people and room furniture are simplified; glazing uses alpha transparency rather than ray-traced refraction. The helipad and floor plan are conceptual, not construction or aviation specifications. See `docs/HOSPITAL-MODEL-REVIEW.md` for validation and browser captures.

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
