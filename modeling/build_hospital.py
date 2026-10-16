"""HEFIN reference-inspired architectural model. Blender 4.5, no external addons.
Run: blender --background --python build_hospital.py -- /absolute/output/directory
Coordinates: X across wings, Y depth (front negative), Z up.
Six supplied architectural images inform this original approximation, not a measured building.
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
metal=mat('Graphite titanium',(.10,.16,.20),.65,.32)
trim=mat('Brushed facade bands',(.82,.87,.92),.38,.28)
dark=mat('Recessed surfaces',(.023,.044,.065),.3,.65)
glass=mat('Cyan architectural glazing',(.28,.59,.70),.15,.14,.12,0)
cyan=mat('Cyan light strips',(.05,.72,.85),.35,.3,1,1.2)
gold=mat('HEFIN gold medical symbol',(.9,.57,.12),.75,.25,1,.3)
white=mat('Medical equipment',(.88,.9,.88),.1,.45)
bedmat=mat('Bed upholstery',(.08,.35,.57),0,.7)
leaf=mat('Roof and plaza planting',(.12,.29,.07),0,.85)
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

# Reuse primitive mesh datablocks during construction to avoid thousands of operator rebuilds.
_box, _cyl, _ring = box, cyl, ring
mesh_cache = {}
def cached(kind, args, creator, name, loc, material):
    key=(kind,args,material.name)
    if key not in mesh_cache:
        ob=creator(); mesh_cache[key]=ob.data
        return ob
    ob=bpy.data.objects.new(name,mesh_cache[key]); bpy.context.collection.objects.link(ob); ob.location=loc
    return ob
def box(name,loc,size,m,bevel=0):
    return cached('box',(tuple(size),bevel),lambda:_box(name,loc,size,m,bevel),name,loc,m)
def cyl(name,loc,r,depth,m,vertices=48):
    return cached('cyl',(r,depth,vertices),lambda:_cyl(name,loc,r,depth,m,vertices),name,loc,m)
def ring(name,loc,r,t,m):
    return cached('ring',(r,t),lambda:_ring(name,loc,r,t,m),name,loc,m)
def shrub(x,y,z,s=.22):
    key=('foliage',)
    if key not in mesh_cache:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
        ob=bpy.context.object; ob.data.materials.append(leaf); mesh_cache[key]=ob.data
        bpy.data.objects.remove(ob,do_unlink=True)
    for i in range(6):
        ob=bpy.data.objects.new('Clustered leaves',mesh_cache[key]); bpy.context.collection.objects.link(ob)
        ob.location=(x+random.uniform(-s*.65,s*.65),y+random.uniform(-s*.65,s*.65),z+random.uniform(0,s*.5))
        r=s*random.uniform(.6,1); ob.scale=(r,r,r*.8)

# Six levels: reception plus five inpatient floors. All dimensions are conceptual metres.
warm=mat('Warm architectural LEDs',(1,.66,.28),0,.35,1,3)
cream=mat('Warm interior plaster',(.72,.57,.38),0,.75,1,.12)
flower=mat('White flowering shrubs',(.82,.85,.73),0,.9)
wood=mat('Reception oak',(.38,.20,.085),0,.7)
blue=mat('Diagnostic display',(.04,.42,.8),.15,.35,1,1)

def tube(name,points,r,m):
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=r; cu.bevel_resolution=1; cu.resolution_u=1
    sp=cu.splines.new('POLY'); sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points): p.co=(*co,1)
    ob=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(ob); ob.data.materials.append(m)
    bpy.context.view_layer.objects.active=ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH'); ob.select_set(False)
    return ob

def outline(x,y,z,w,d,r,m,th=.018):
    pts=[]
    for cx,cy,start in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
        for j in range(13):
            a=math.radians(start+j*90/12); pts.append((x+cx+r*math.cos(a),y+cy+r*math.sin(a),z))
    tube('Continuous facade reveal',pts+[pts[0]],th,m)

def tree(x,y,z,h=.9):
    cyl('Tree trunk',(x,y,z+h*.4),.035,h*.8,wood,8)
    for i in range(7):
        a=i*2.4; r=.17 if i else 0
        shrub(x+r*math.cos(a),y+r*math.sin(a),z+h*.72+(i%3)*.12,h*.23)

def planter(x,y,z,w,d):
    rounded('Stone garden planter',x,y,z,w,d,.17,.15,trim)
    rounded('Garden soil',x,y,z+.09,w-.10,d-.10,.025,.12,soil)
    count=max(3,int(w/.23))
    for i in range(count):
        xx=x-w*.42+i*w*.84/(count-1)
        shrub(xx,y,z+.2,.16)
        if i%3==0:
            for k in range(4):
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.065,location=(xx+random.uniform(-.1,.1),y+random.uniform(-.1,.1),z+.38))
                finish(bpy.context.object,'Flower cluster',flower)

def chair(x,y,z):
    box('Waiting seat',(x,y,z+.24),(.25,.28,.08),bedmat,.025)
    box('Chair back',(x,y+.12,z+.40),(.25,.05,.3),bedmat,.02)
    for dx in [-.09,.09]:
        for dy in [-.09,.09]: cyl('Chair legs',(x+dx,y+dy,z+.12),.012,.24,metal,6)

def person(x,y,z):
    cyl('Person torso',(x,y,z+.45),.075,.28,white,8)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=6,radius=.065,location=(x,y,z+.65)); finish(bpy.context.object,'Person head',cream)
    for dx in [-.035,.035]: cyl('Person legs',(x+dx,y,z+.18),.023,.32,metal,6)

rounded('Rounded podium lower',0,0,-.24,11.4,10,.28,.65,metal)
rounded('Rounded podium upper',0,0,-.08,11.2,9.8,.17,.6,trim)
rounded('Porcelain plaza',0,0,.025,11,9.6,.06,.55,white)
outline(0,0,-.11,11.22,9.82,.6,warm,.015)
for x in range(-10,11): box('Paving seam',(x*.5,0,.06),(.008,9.1,.004),metal)
for y in range(-9,10): box('Paving seam',(0,y*.5,.06),(10.6,.008,.004),metal)
H=1.35
roof=.2+6*H
for x in [-2.5,2.5]:
    print('BUILD_WING',x,flush=True)
    for f in range(7):
        z=.2+f*H
        print('BUILD_FLOOR',x,f,flush=True)
        rounded('Sculpted pearl floor fascia',x,0,z,4.25,5.5,.24,.72,trim)
        outline(x,0,z+.11,4.27,5.52,.72,warm,.012)
        if f==6: continue
        rounded('Blue transparent curtain wall',x,0,z+.7,4.12,5.36,1.13,.67,glass)
        # A warm back wall, open front rooms and a passage through the side bays.
        box('Interior service spine',(x,.35,z+.68),(.62,2.5,1.08),cream)
        for xx in [-1.4,-.7,0,.7,1.4]:
            for yy in [-2.68,2.68]: box('Window mullion',(x+xx,yy,z+.68),(.026,.032,1.12),metal)
        for yy in [-1.95,-1.2,-.45,.3,1.05,1.8]:
            for xx in [-2.06,2.06]: box('Side window mullion',(x+xx,yy,z+.68),(.032,.026,1.12),metal)
        for yy in [-2.67,2.67]: box('Window transom',(x,yy,z+.94),(3.05,.025,.025),metal)
        # Front and rear wards remain visible from a full 360-degree orbit.
        for yy,sgn in [(-1.85,1),(1.85,-1)]:
            if f:
                box('Warm ward wall',(x,yy+sgn*.54,z+.68),(3.5,.07,1.05),cream)
                box('Ward linear ceiling light',(x,yy,z+1.19),(3.4,.035,.018),warm)
                for xx in [-1.25,-.4,.45,1.3]:
                    bed(x+xx,yy,z+.13)
                    box('Bedside cabinet',(x+xx+.28,yy+.25,z+.32),(.15,.2,.35),white,.015)
                    box('Diagnostic panel',(x+xx,yy+sgn*.49,z+.88),(.25,.025,.20),metal,.01)
                    box('Diagnostic screen',(x+xx,yy+sgn*.47,z+.88),(.21,.008,.16),blue)
                    for k in range(3): box('Monitor trace',(x+xx,yy+sgn*.46,z+.84+k*.035),(.14,.009,.006),cyan)
                for xx in [-.82,.02,.87]: box('Glass room partition',(x+xx,yy,z+.65),(.018,.95,.97),glass)
            else:
                for xx in [-1.25,-.65,.65,1.25]: chair(x+xx,yy,z+.12)
                box('Lobby wall',(x,yy+sgn*.6,z+.68),(3.4,.06,1.05),cream)
        for side in [-1,1]:
            for yy in [-.75,.75]:
                if f: bed(x+side*1.48,yy,z+.13)
        for xx in [-1.7,1.7]:
            cyl('Interior planter',(x+xx,-2.18,z+.27),.11,.28,white,12)
            tree(x+xx,-2.18,z+.4,.6)
        if f in [0,2,4]: person(x-.8,-2.3,z+.12)
    rounded('Roof parapet',x,0,roof+.24,4.25,5.5,.40,.72,trim)
    rounded('Roof terrace paving',x,0,roof+.46,4.05,5.3,.035,.65,white)
    outline(x,0,roof+.68,4.1,5.35,.67,metal,.018)
    for yy in [-2.22,2.22]:
        planter(x,yy,roof+.51,3.45,.52)
        for xx in [-1.25,1.25]: tree(x+xx,yy,roof+.65,.85)
    for xx in [-1.65,1.65]:
        for yy in [-1.2,0,1.2]:
            planter(x+xx,yy,roof+.51,.5,.7); tree(x+xx,yy,roof+.65,.65)
    for xx,yy,w,d,h in [(-.65,-.7,1.05,1.1,.65),(.6,.6,1.0,1.25,.9),(-.65,1.05,.8,.8,.55)]:
        box('Roof mechanical housing',(x+xx,yy,roof+.5+h/2),(w,d,h),trim,.045)
        for k in range(8): box('HVAC louvres',(x+xx,yy-d/2-.01,roof+.55+k*h/10),(w*.83,.025,.028),metal)
        cyl('HVAC exhaust fan',(x+xx,yy,roof+.52+h),.23,.045,metal,24)
        for k in range(4):
            o=box('Fan blades',(x+xx,yy,roof+.55+h),(.38,.035,.012),white); o.rotation_euler.z=k*math.pi/4
    cyl('Roof antenna',(x+.65,.6,roof+1.7),.012,.65,metal,8)

ay=-1.7
cyl('Central atrium glazing',(0,ay,roof/2+.15),1.27,roof,glass,96)
for f in range(7):
    z=.2+f*H
    cyl('Circular atrium landing',(0,ay,z),1.28,.14,trim,64)
    ring('Landing warm rim',(0,ay,z+.08),1.28,.015,warm)
    if f<6:
        ring('Circular glass railing top',(0,ay,z+.60),1.12,.015,metal)
        for i in range(20):
            a=i*math.tau/20
            cyl('Landing railing post',(1.12*math.cos(a),ay+1.12*math.sin(a),z+.34),.009,.5,metal,6)
        for i in range(22):
            a=(f*22+i)*math.tau/22
            o=box('Central spiral stair tread',(.52*math.cos(a),ay+.52*math.sin(a),z+.1+i*H/22),(.52,.19,.035),trim); o.rotation_euler.z=a
        for xx in [-.87,.87]:
            cyl('Atrium planter',(xx,ay,z+.19),.12,.2,white,12); tree(xx,ay,z+.3,.7)
for offset in [0,math.pi]:
    pts=[]
    for i in range(481):
        z=.35+i*(roof-.25)/480; a=i/480*math.tau*6+offset
        pts.append((.79*math.cos(a),ay+.79*math.sin(a),z))
    tube('Golden helical atrium sculpture',pts,.022,warm)
for i in range(20):
    a=i*math.tau/20
    cyl('Atrium curtain wall mullion',(1.27*math.cos(a),ay+1.27*math.sin(a),roof/2+.14),.015,roof,metal,8)
# Helipad is integral to the crown, not an oversized decorative orbit ring.
cyl('Helipad pearl rim',(0,ay,roof+.24),1.60,.22,trim,96)
cyl('Helipad graphite deck',(0,ay,roof+.365),1.48,.035,metal,96)
ring('Helipad cyan perimeter',(0,ay,roof+.39),1.29,.018,cyan)
ring('Helipad warm underside',(0,ay,roof+.13),1.57,.017,warm)
box('Helipad medical cross long',(0,ay,roof+.39),(.25,1.15,.025),cyan,.025)
box('Helipad medical cross wide',(0,ay,roof+.39),(1.15,.25,.025),cyan,.025)
# Reception, entrance canopy and glass doors.
cyl('Reception desk',(0,ay-.30,.47),.56,.62,wood,48)
cyl('Reception counter',(0,ay-.30,.79),.60,.05,white,48)
box('Reception computer',(0,ay-.22,.91),(.23,.06,.18),metal)
person(.45,ay+.05,.27)
rounded('Glass entrance canopy',0,-2.92,1.55,2.9,1.25,.075,.4,glass)
outline(0,-2.92,1.55,2.9,1.25,.4,trim,.035)
for xx in [-1.05,1.05]: cyl('Entrance canopy column',(xx,-3.25,.8),.035,1.48,metal,12)
for xx in [-.45,.45]:
    box('Lobby glass door',(xx,-2.98,.7),(.86,.018,1.16),glass)
    cyl('Door handle',(xx*.3,-3.01,.72),.012,.28,trim,8)
for x in [-4.8,4.8]:
    for y in [-3,-1.5,0,1.5,3]:
        planter(x,y,.18,.65,1.1); tree(x,y,.33,.95)
for x in [-3.15,3.15]:
    planter(x,-3.8,.19,2.9,.85)
    for dx in [-.95,.95]: tree(x+dx,-3.8,.38,1.05)
for x in [-2,-.8,.8,2]:
    planter(x,4,.17,.8,.65); tree(x,4,.35,.85)
for x in [-4.9,-2.1,2.1,4.9]:
    cyl('Landscape bollard',(x,-4.3,.31),.035,.48,metal,8)
    cyl('Bollard warm lamp',(x,-4.3,.54),.047,.065,warm,12)
for x,y in [(-.8,-3.65),(.75,-3.35),(2.1,-3.1)]: person(x,y,.08)

# Batch by material. Keep source names as semantic Blender collection metadata.
for m in list(bpy.data.materials):
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==m]
    if not objects: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]; bpy.ops.object.join(); objects[0].name=m.name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smart-hospital.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'smart-hospital.glb'),export_format='GLB',export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('HOSPITAL_EXPORT_COMPLETE',len(bpy.context.scene.objects),sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type=='MESH'))
