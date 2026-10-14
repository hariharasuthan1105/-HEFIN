"""Remove emissive slab caps so only facade edges glow. Reuse the existing blend.
blender --background smart-hospital.blend --python refine_hospital.py -- output-dir
"""
import bpy,bmesh,sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1])
out.mkdir(parents=True,exist_ok=True)
for o in bpy.context.scene.objects:
    if o.type!='MESH' or not o.data.materials or o.data.materials[0].name!='Cyan light strips':continue
    bm=bmesh.new();bm.from_mesh(o.data)
    # Retain vertical light strips and monitor screens, discard broad horizontal caps.
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if abs(f.normal.z)>.9],context='FACES')
    bm.to_mesh(o.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'smart-hospital.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'smart-hospital.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
