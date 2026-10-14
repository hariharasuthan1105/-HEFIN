# Task 03 model assets

| Asset | Bytes | Triangles | Material batches |
| --- | ---: | ---: | ---: |
| anatomical-brain.glb | 717,836 | 206,446 | 5 |
| smart-hospital.glb | 1,150,132 | 134,204 | 9 |

Both are binary glTF 2.0 with Draco compression, tracked through Git LFS. Runtime URLs resolve relative to document.baseURI, including the /-HEFIN/ Pages base. The decoder is served locally from ../draco/.

The atlas-derived brain and modified source are CC BY-SA 4.0. Preserve [ATTRIBUTION.txt](ATTRIBUTION.txt) and [BRAIN-SOURCE-LICENSE.txt](BRAIN-SOURCE-LICENSE.txt), including when redistributing derived imagery. The hospital is original reference-inspired HEFIN geometry. Decoder licensing is in ../draco/LICENSE.

Editable Blender sources, build scripts, structure metadata and SHA-256 hashes are in the repository's modeling/ directory. See docs/TASK-03-CINEMATIC-3D.md for architecture, verification and limitations. The static fallback is a capture of the actual scene.
