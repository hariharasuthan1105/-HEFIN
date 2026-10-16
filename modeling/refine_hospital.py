"""Finish the hospital crown and lighting; run once after build_hospital.py.
blender --background input/smart-hospital.blend --python refine_hospital.py -- output
"""
import bpy, bmesh, math, sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
warm=bpy.data.materials['Warm architectural LEDs'];p=warm.node_tree.nodes.get('Principled BSDF')
p.inputs['Base Color'].default_value=(1,.32,.045,1);p.inputs['Emission Color'].default_value=(1,.32,.045,1);p.inputs['Emission Strength'].default_value=2
cream=bpy.data.materials['Warm interior plaster'].node_tree.nodes.get('Principled BSDF');cream.inputs['Emission Color'].default_value=(1,.45,.12,1);cream.inputs['Emission Strength'].default_value=.35
leaf=bpy.data.materials['Roof and plaza planting'].node_tree.nodes.get('Principled BSDF');leaf.inputs['Base Color'].default_value=(.045,.16,.025,1)
# Remove the original low crown and clear planting beneath the elevated helipad.
for ob in list(bpy.context.scene.objects):
 if ob.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(ob.data);visited=set();remove=[]
 for v in bm.verts:
  if v in visited:continue
  stack=[v];visited.add(v);component=[]
  while stack:
   q=stack.pop();component.append(q)
   for e in q.link_edges:
    n=e.other_vert(q)
    if n not in visited:visited.add(n);stack.append(n)
  coords=[ob.matrix_world @ q.co for q in component]
  low_crown=all(8.40 < q.z < 8.72 and q.x*q.x+(q.y+1.7)**2 < 2.76 for q in coords)
  planting=ob.data.materials[0].name in ['Roof and plaza planting','Reception oak','White flowering shrubs']
  center=sum(coords,coords[0]*0)/len(coords)
  encroaching=planting and center.z>8.5 and center.x**2+(center.y+1.7)**2<3.25
  if low_crown or encroaching:remove.extend(component)
 bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(ob.data);bm.free()
def cyl(name,r,h,z,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=r,depth=h,location=(0,-1.7,z));o=bpy.context.object;o.name=name;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 return o
trim=bpy.data.materials['Brushed facade bands'];metal=bpy.data.materials['Graphite titanium'];cyan=bpy.data.materials['Cyan light strips']
cyl('Elevated helipad crown',1.63,.18,9.2,trim);cyl('Elevated graphite landing deck',1.53,.035,9.31,metal)
for radius,z,mat in [(1.38,9.34,cyan),(1.61,9.14,warm)]:
 bpy.ops.mesh.primitive_torus_add(major_radius=radius,minor_radius=.024,major_segments=96,minor_segments=6,location=(0,-1.7,z));bpy.context.object.data.materials.append(mat)
for size in [(.25,1.2,.025),(1.2,.25,.025)]:
 bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-1.7,9.34));o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(cyan)
for i in range(8):
 a=i*math.tau/8;bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=.025,depth=.8,location=(1.15*math.cos(a),-1.7+1.15*math.sin(a),8.72));bpy.context.object.data.materials.append(metal)
# More legible luminous handrails around the actual spiral staircase.
for offset in [0,math.pi]:
 cu=bpy.data.curves.new('Atrium luminous helix','CURVE');cu.dimensions='3D';cu.bevel_depth=.045;cu.bevel_resolution=2
 sp=cu.splines.new('POLY');sp.points.add(480)
 for i,p in enumerate(sp.points):
  a=i/480*math.tau*6+offset;p.co=(.87*math.cos(a),-1.7+.87*math.sin(a),.35+i*8.05/480,1)
 ob=bpy.data.objects.new('Atrium luminous helix',cu);bpy.context.collection.objects.link(ob);ob.data.materials.append(warm)
 bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH')
for m in list(bpy.data.materials):
 objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
 if not objects:continue
 if len(objects)==1:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=m.name
# Smooth the clustered foliage without adding subdivision or runtime geometry.
for o in bpy.context.scene.objects:
 if o.type=='MESH' and o.data.materials[0].name=='Roof and plaza planting':
  for p in o.data.polygons:p.use_smooth=True
bpy.ops.wm.save_as_mainfile(filepath=str(out/'smart-hospital.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'smart-hospital.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
