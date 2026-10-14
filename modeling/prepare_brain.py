"""Adapt Brain Project / Z-Anatomy / BodyParts3D geometry (CC BY-SA 4.0).
blender --background --python prepare_brain.py -- input.glb output-directory
Preserve gross anatomy; remove hidden structures, simplify, recolor, add decorative paths.
"""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]; source=Path(args[0]); out=Path(args[1]); out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
keep=[]
for o in list(bpy.context.scene.objects):
    if o.type!='MESH' or o.get('bx_cat') not in ['cortex','cerebellum','brainstem'] or any(s in o.name.lower() for s in ['nucleus','nuclei','aqueduct']):
        bpy.data.objects.remove(o,do_unlink=True)
    else: keep.append(o)
points=[o.matrix_world@Vector(v) for o in keep for v in o.bound_box]
lo=Vector(tuple(min(v[i] for v in points) for i in range(3))); hi=Vector(tuple(max(v[i] for v in points) for i in range(3)))
center=(lo+hi)/2; scale=6.2/max(hi-lo)
def mat(name,c,metal=.25,emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*c,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=.40
    p.inputs['Emission Color'].default_value=(*c,1); p.inputs['Emission Strength'].default_value=emission
    return m
cortex=mat('Dark teal cortical surface',(.075,.20,.25),.32)
cerebellum=mat('Violet cerebellar surface',(.16,.12,.26),.25)
stem=mat('Brainstem surface',(.10,.25,.30),.3)
pathmat=mat('Neural cyan illustrative paths',(.025,.65,.85),.25,.7)
nodemat=mat('Neural magenta illustrative nodes',(.65,.08,.36),.25,1.1)
records=[]
for o in keep:
    category=o.get('bx_cat'); transform=o.matrix_world.copy()
    for v in o.data.vertices: v.co=(transform@v.co-center)*scale
    o.matrix_world.identity()
    o.data.materials.clear(); o.data.materials.append(cortex if category=='cortex' else cerebellum if category=='cerebellum' else stem)
    for p in o.data.polygons: p.use_smooth=True
    bpy.context.view_layer.objects.active=o
    # Retain curvature. Source meshes with few faces are left intact.
    if len(o.data.polygons)>1800:
        mod=o.modifiers.new('Web detail reduction','DECIMATE'); mod.ratio=.48
        bpy.ops.object.modifier_apply(modifier=mod.name)
    records.append({'name':o.name,'category':category,'faces':len(o.data.polygons)})

# Short paths follow selected existing cortical vertex positions. They are decorative
# signals, explicitly not reconstructed neuronal tracts or a clinical connectivity map.
for o in keep:
    if o.get('bx_cat')!='cortex' or not any(w in o.name.lower() for w in ['middle frontal gyrus','superior temporal gyrus','precentral gyrus']): continue
    coords=[v.co.copy() for v in o.data.vertices]
    if not coords: continue
    side=-1 if sum(v.x for v in coords)<0 else 1
    # A narrow outer-surface ridge sampled along the structure's vertical extent.
    zmin=min(v.z for v in coords); zmax=max(v.z for v in coords); path=[]
    for j in range(16):
        z=zmin+(zmax-zmin)*(j+.5)/16
        near=[v for v in coords if abs(v.z-z)<max((zmax-zmin)/15,.015)]
        if near:
            v=max(near,key=lambda p:p.x*side).copy(); v.x+=side*.013; path.append(v)
    if len(path)<3: continue
    curve=bpy.data.curves.new('Illustrative cortical signal','CURVE'); curve.dimensions='3D'; curve.bevel_depth=.009; curve.bevel_resolution=2
    spline=curve.splines.new('POLY'); spline.points.add(len(path)-1)
    for p,v in zip(spline.points,path): p.co=(*v,1)
    obj=bpy.data.objects.new('Illustrative neural pathway',curve); bpy.context.collection.objects.link(obj); obj.data.materials.append(pathmat)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj; bpy.ops.object.convert(target='MESH')
    for v in [path[2],path[-3]]:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10,ring_count=6,radius=.037,location=v); bpy.context.object.name='Illustrative neural node'; bpy.context.object.data.materials.append(nodemat)

# Material batching retains anatomical vertex geometry and narrows runtime draw calls.
for m in [cortex,cerebellum,stem,pathmat,nodemat]:
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
    if not obs: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]; bpy.ops.object.join(); obs[0].name=m.name
bpy.ops.wm.save_as_mainfile(filepath=str(out/'anatomical-brain.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'anatomical-brain.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
(out/'brain-structures.json').write_text(json.dumps(records,indent=2))
print('BRAIN_EXPORT_COMPLETE',len(records),'anatomical source structures')
