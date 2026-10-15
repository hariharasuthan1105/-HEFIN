"""HEFIN reference-inspired architectural model. Blender 4.5, no external addons.
Run: blender --background --python build_hospital.py -- /absolute/output/directory
Coordinates: X across wings, Y depth (front negative), Z up.
The supplied single image informs this original approximation, not a measured building.
"""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector
random.seed(27)
OUT = Path(sys.argv[sys.argv.index('--') + 1])
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, metal=0, rough=.5, alpha=1, emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    p.inputs['Alpha'].default_value=alpha
    p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    if alpha<1: m.surface_render_method='DITHERED'
    return m
metal=mat('Graphite titanium',(.13,.22,.29),.65,.32)
trim=mat('Brushed facade bands',(.35,.48,.55),.6,.38)
dark=mat('Recessed surfaces',(.023,.044,.065),.3,.65)
glass=mat('Cyan architectural glazing',(.08,.45,.55),.25,.16,.18,.08)
cyan=mat('Cyan light strips',(.05,.72,.85),.35,.3,1,1.2)
gold=mat('HEFIN gold medical symbol',(.9,.57,.12),.75,.25,1,.3)
white=mat('Medical equipment',(.59,.72,.75),.15,.55)
bedmat=mat('Bed upholstery',(.12,.29,.34),0,.8)
leaf=mat('Roof and plaza planting',(.055,.19,.16),0,.95)
soil=mat('Planting beds',(.018,.043,.04),0,1)

def finish(obj,name,m):
    obj.name=name; obj.data.materials.append(m); return obj
def box(name,loc,size,m,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined edges','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m)
def cyl(name,loc,r,depth,m,vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=finish(bpy.context.object,name,m)
    for p in o.data.polygons: p.use_smooth=len(p.vertices)==4
    return o
def ring(name,loc,r,t,m):
    bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=t,major_segments=64,minor_segments=6,location=loc)
    return finish(bpy.context.object,name,m)
def rounded(name,x,y,z,w,d,h,r,m):
    # Extruded rounded-rectangle footprint, with true curved vertical corners.
    pts=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for j in range(9):
            a=math.radians(start+j*90/8); pts.append((cx+r*math.cos(a),cy+r*math.sin(a)))
    n=len(pts); vs=[(px+x,py+y,z+zz) for zz in [-h/2,h/2] for px,py in pts]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    me=bpy.data.meshes.new(name); me.from_pydata(vs,[],faces); me.update()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); finish(o,name,m)
    for p in me.polygons: p.use_smooth=p.index>1
    return o
def shrub(x,y,z,s=.22):
    for i in range(4):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=s*random.uniform(.65,1),location=(x+random.uniform(-s*.5,s*.5),y+random.uniform(-s*.5,s*.5),z+random.uniform(0,s*.4)))
        finish(bpy.context.object,'Clustered foliage',leaf)
def bed(x,y,z):
    box('Hospital bed frame',(x,y,z+.25),(.43,.83,.065),metal)
    box('Mattress',(x,y,z+.32),(.40,.77,.10),white,.025)
    box('Folded blanket',(x,y-.15,z+.38),(.40,.40,.035),bedmat)
    box('Pillow',(x,y+.25,z+.39),(.32,.16,.06),white,.025)
    for side in [-1,1]:
        box('Bed rail',(x+side*.245,y,z+.39),(.024,.68,.16),trim)
        for yy in [-.27,.27]:
            cyl('Bed caster',(x+side*.18,y+yy,z+.10),.045,.07,dark,8)
    box('Bed head',(x,y+.43,z+.38),(.47,.05,.38),white,.015)
    box('Bedside monitor',(x+.35,y+.25,z+.57),(.22,.07,.18),dark,.015)
    box('Monitor screen',(x+.35,y+.209,z+.57),(.17,.008,.12),cyan)
    cyl('Monitor stand',(x+.35,y+.25,z+.3),.016,.43,trim,8)

rounded('Raised square architectural plinth',0,0,-.20,11,9.5,.40,.5,trim)
rounded('Plaza surface',0,0,.015,10.9,9.4,.055,.48,dark)
for x in range(-10,11): box('Plaza paving joint',(x*.5,0,.05),(.012,9.1,.008),metal)
for y in range(-9,10): box('Plaza paving joint',(0,y*.5,.051),(10.6,.012,.008),metal)
for x in [-2.25,2.25]:
    # Five glazed storeys, exposed through transparent continuous curved walls.
    for f in range(6):
        z=.18+f*1.08
        rounded('Rounded wing floor band',x,0,z,3.9,5.4,.20,.62,trim)
        rounded('Fine cyan facade reveal',x,0,z+.105,3.91,5.41,.012,.62,cyan)
        if f==5: continue
        rounded('Curved curtain wall',x,0,z+.54,3.74,5.24,.89,.57,glass)
        box('Internal service core',(x,.4,z+.54),(.62,2.7,.90),dark)
        for xx in [-1.15,-.4,.4,1.15]:
            for yy in [-2.60,2.60]: box('Glazing mullion',(x+xx,yy,z+.54),(.035,.05,.89),metal)
        for yy in [-1.85,-1.05,-.25,.55,1.35,2.05]:
            for xx in [-1.86,1.86]: box('Side glazing mullion',(x+xx,yy,z+.54),(.05,.035,.89),metal)
        for xx in [-1.15,-.45,.45,1.15]:
            if f: bed(x+xx,-1.85,z+.1)
        if f:
            for yy in [-.65,.6,1.85]:
                bed(x+1.22,yy,z+.1); bed(x-1.22,yy,z+.1)
        for yy in [-1.1,.1,1.3]: box('Room partition',(x,yy,z+.5),(3.35,.035,.74),metal)
    # Roof parapet inset and planted edge.
    rounded('Roof garden inset',x,0,5.70,3.64,5.14,.18,.52,dark)
    for yy in [-2.22,2.22]:
        box('Rooftop planter',(x,yy,5.84),(2.7,.36,.19),metal,.05)
        for i in range(10): shrub(x-1.2+i*.265,yy,6.0,.14)
    for xx,yy,w,d,h in [(-.65,-.8,1.1,1.25,.55),(.65,.6,.9,1.2,.8),(-.75,1.0,.7,.8,.5)]:
        box('Rooftop mechanical unit',(x+xx,yy,5.8+h/2),(w,d,h),trim,.06)
        for k in range(8): box('HVAC ventilation louvre',(x+xx,yy-d/2-.006,5.83+k*h/9),(w*.85,.025,.026),dark)
        for offset in [-.22,.22]:
            cyl('Roof fan',(x+xx+offset,yy,5.82+h),.18,.055,dark,24)
            ring('Fan grille',(x+xx+offset,yy,5.85+h),.14,.009,metal)
    for xx,yy,h in [(1.2,1.5,1.5),(-1.1,.8,.85),(.8,-.7,.7)]:
        cyl('Rooftop antenna',(x+xx,yy,5.85+h/2),.018,h,trim,8)
        cyl('Antenna tip',(x+xx,yy,5.85+h),.027,.12,white,8)
        for a in [-.18,.18]: box('Antenna crossbar',(x+xx+a/2,yy,5.85+h*.7),(.2,.018,.018),metal)

# The reference's prominent glass cylinder projects forward between the two wings.
ay=-1.72
cyl('Transparent central cylindrical atrium',(0,ay,2.97),1.15,5.7,glass,96)
for f in range(6):
    z=.18+f*1.08
    cyl('Visible circular atrium platform',(0,ay,z),1.16,.13,trim,64)
    ring('Atrium light band',(0,ay,z+.08),1.17,.018,cyan)
    if f<5:
        ring('Atrium interior balustrade',(0,ay,z+.68),.91,.018,metal)
        for i in range(14):
            a=i*math.tau/14
            cyl('Balustrade upright',(.91*math.cos(a),ay+.91*math.sin(a),z+.40),.012,.55,trim,6)
        # Interior spiral stair treads (not an unrelated decorative helix).
        for i in range(16):
            a=(f*16+i)*math.tau/24
            o=box('Atrium stair tread',(.39*math.cos(a),ay+.39*math.sin(a),z+.10+i*1.08/16),(.50,.14,.035),metal)
            o.rotation_euler.z=a
for i in range(18):
    a=i*math.tau/18
    cyl('Atrium structural mullion',(1.15*math.cos(a),ay+1.15*math.sin(a),2.98),.023,5.7,metal,8)
cyl('Atrium crown',(0,ay,5.78),1.24,.27,trim,64)
ring('Crown gold reveal',(0,ay,5.93),1.18,.022,gold)
cyl('Atrium skylight',(0,ay,5.94),1.09,.035,glass,64)
rounded('Entrance canopy',0,-2.88,1.20,2.6,1.15,.13,.35,trim)
for x in [-.88,.88]: cyl('Entrance column',(x,-3.15,.64),.04,1.05,trim,12)
for i in range(3): box('Entrance steps',(0,-3.45-i*.24,.12-i*.035),(2.2+i*.22,.50,.07),trim,.025)
box('Medical cross vertical',(0,-3.02,1.6),(.095,.045,.43),gold)
box('Medical cross horizontal',(0,-3.025,1.6),(.40,.05,.095),gold)
for x in [-4.6,4.6]:
    for y in [-3,-1.8,-.6,.6,1.8,3]:
        box('Ground planter',(x,y,.17),(.6,.6,.22),metal,.06); shrub(x,y,.47,.26)
for x in [-3.0,-1.8,1.8,3.0]:
    box('Front landscape bed',(x,-3.75,.15),(.85,.6,.18),metal,.07)
    for dx in [-.24,0,.24]: shrub(x+dx,-3.75,.4,.20)

# Join by material: retain detailed geometry without thousands of runtime draw calls.
for m in list(bpy.data.materials):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
    if not objects: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join()
    objects[0].name=m.name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smart-hospital.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'smart-hospital.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('HOSPITAL_EXPORT_COMPLETE',len(bpy.context.scene.objects))
