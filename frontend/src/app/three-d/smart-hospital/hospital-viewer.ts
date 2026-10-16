import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type HospitalView = 'Isometric' | 'Front' | 'Side' | 'Top';
export interface HospitalController {
  pause(value: boolean): void;
  visible(value: boolean): void;
  zoom(factor: number): void;
  orbit(angle: number): void;
  view(value: HospitalView): void;
  dispose(): void;
}
export const hospitalMetrics = {
  active: 0,
  frames: 0,
  calls: 0,
  triangles: 0,
  bytes: 0,
  loadMs: 0,
  renderMs: 0,
  dpr: 0,
  quality: '',
  distance: 0,
  azimuth: 0,
  geometries: 0,
};

function release(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

/** Preserve the authored pearl, blue glass and gold palette in both hospital scenes. */
export function prepareHospital(root: T.Object3D) {
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const m = o.material as T.MeshStandardMaterial;
    o.castShadow = !m.transparent;
    o.receiveShadow = !m.transparent;
    if (m.transparent) {
      m.depthWrite = false;
      m.side = T.FrontSide;
    }
    m.envMapIntensity = 0.65;
  });
}

export async function createHospitalViewer(
  host: HTMLElement,
  signal: AbortSignal,
  onFailure: () => void,
  onInteraction: () => void,
): Promise<HospitalController> {
  const start = performance.now();
  const asset = (path: string) => new URL('assets/' + path, document.baseURI).href;
  const decoder = new DRACOLoader().setDecoderPath(asset('draco/')).setWorkerLimit(1);
  let root: T.Group | undefined;
  try {
    const response = await fetch(asset('models/smart-hospital.glb'), { signal });
    if (!response.ok) throw new Error('Hospital model unavailable');
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    root = (await new GLTFLoader().setDRACOLoader(decoder).parseAsync(bytes, '')).scene;
    hospitalMetrics.bytes = bytes.byteLength;
    signal.throwIfAborted();
  } catch (error) {
    if (root) release(root);
    throw error;
  } finally {
    decoder.dispose();
  }
  const scene = new T.Scene();
  scene.background = new T.Color(0x071323);
  scene.add(root);
  prepareHospital(root);
  const bounds = new T.Box3().setFromObject(root);
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3());
  const radius = size.length() / 2;
  const camera = new T.PerspectiveCamera(32, 1, 0.1, 200);
  let renderer: T.WebGLRenderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    release(root);
    throw error;
  }
  const canvas = renderer.domElement;
  canvas.className = 'hospital-canvas';
  canvas.setAttribute(
    'aria-label',
    'Interactive 3D hospital. Drag to rotate, pinch or scroll to zoom.',
  );
  canvas.setAttribute('tabindex', '0');
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.85;
  const gl = renderer.getContext(),
    debug = gl.getExtension('WEBGL_debug_renderer_info');
  const software = /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(
    debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : '',
  );
  const lowPower = software || innerWidth < 700;
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = T.PCFShadowMap;
  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = env.texture;
  scene.environmentIntensity = 0.35;
  scene.add(new T.HemisphereLight(0xc9e5ff, 0x806447, 0.65));
  const key = new T.DirectionalLight(0xffe3ba, 2);
  key.position.set(-8, 16, 10);
  key.castShadow = !lowPower;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 12, bottom: -9, near: 0.1, far: 40 });
  key.shadow.bias = -0.001;
  scene.add(key);
  const fill = new T.DirectionalLight(0x91cfff, 0.8);
  fill.position.set(8, 8, -8);
  scene.add(fill);
  const atriumLight = new T.PointLight(0xffb44f, 4, 12);
  atriumLight.position.set(0, 4, 2);
  scene.add(atriumLight);
  scene.fog = new T.Fog(0x071323, 45, 110);
  const floor = new T.Mesh(
    new T.PlaneGeometry(200, 200),
    new T.MeshStandardMaterial({ color: 0x0a1726, roughness: 0.35, metalness: 0.3 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = bounds.min.y - 0.015;
  floor.receiveShadow = true;
  scene.add(floor);
  const composer = !lowPower ? new EffectComposer(renderer) : undefined;
  const bloom = composer ? new UnrealBloomPass(new T.Vector2(1, 1), 0.18, 0.35, 1.05) : undefined;
  const output = composer ? new OutputPass() : undefined;
  if (composer && bloom && output) {
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(output);
  }
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(center);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.035;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotateSpeed = 0.55;
  controls.autoRotate = true;
  let paused = false,
    visible = true,
    disposed = false,
    raf = 0,
    last = 0,
    dirty = true,
    fitted = 28;
  let selected: HospitalView = 'Isometric';
  const directions: Record<HospitalView, T.Vector3> = {
    Isometric: new T.Vector3(10, 7, 17).normalize(),
    Front: new T.Vector3(0, 1, 22).normalize(),
    Side: new T.Vector3(22, 2, 0).normalize(),
    Top: new T.Vector3(0, 22, 0.8).normalize(),
  };
  function draw() {
    if (disposed || !visible || document.hidden) return;
    const t = performance.now();
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    hospitalMetrics.frames++;
    hospitalMetrics.calls = renderer.info.render.calls;
    hospitalMetrics.triangles = renderer.info.render.triangles;
    hospitalMetrics.renderMs = performance.now() - t;
    hospitalMetrics.distance = camera.position.distanceTo(controls.target);
    hospitalMetrics.azimuth = controls.getAzimuthalAngle();
    hospitalMetrics.geometries = renderer.info.memory.geometries;
  }
  function schedule() {
    if (!raf && !disposed && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    if (now - last < (software ? 160 : 33)) {
      schedule();
      return;
    }
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    const changed = controls.update(delta);
    if (changed || dirty) {
      dirty = false;
      draw();
    }
    if (!paused || changed) schedule();
  }
  const changed = () => {
    dirty = true;
    schedule();
  };
  const interact = () => {
    paused = true;
    controls.autoRotate = false;
    onInteraction();
    changed();
  };
  controls.addEventListener('change', changed);
  controls.addEventListener('start', interact);
  function view(value: HospitalView) {
    selected = value;
    controls.reset();
    controls.target.copy(center);
    camera.position.copy(center).addScaledVector(directions[value], fitted);
    controls.update();
    dirty = true;
    schedule();
  }
  function resize() {
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);
    const ratio = software
      ? Math.min(0.8, Math.sqrt(250000 / (w * h)))
      : Math.min(devicePixelRatio, lowPower ? 1 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer?.setPixelRatio(ratio);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const previousFit = fitted;
    const halfFov = Math.min(
      T.MathUtils.degToRad(camera.fov / 2),
      Math.atan(Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect),
    );
    fitted = (radius / Math.sin(halfFov)) * 0.96;
    controls.minDistance = radius * 0.85;
    controls.maxDistance = fitted * 1.8;
    if (hospitalMetrics.frames === 0) view(selected);
    else
      camera.position
        .sub(controls.target)
        .multiplyScalar(fitted / previousFit)
        .add(controls.target);
    hospitalMetrics.dpr = ratio;
    changed();
  }
  const visibility = () => {
    if (document.hidden && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else changed();
  };
  const lost = (e: Event) => {
    e.preventDefault();
    dispose();
    onFailure();
  };
  function keydown(e: KeyboardEvent) {
    if (['ArrowLeft', 'ArrowRight', '+', '-', 'Home'].includes(e.key)) {
      e.preventDefault();
      interact();
      if (e.key === 'Home') view('Isometric');
      else if (e.key === '+' || e.key === '-') zoom(e.key === '+' ? 0.85 : 1.15);
      else orbit(e.key === 'ArrowLeft' ? -0.25 : 0.25);
    }
  }
  function zoom(factor: number) {
    interact();
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(
      T.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance),
    );
    camera.position.copy(controls.target).add(offset);
    controls.update();
    changed();
  }
  function orbit(angle: number) {
    interact();
    const offset = camera.position
      .clone()
      .sub(controls.target)
      .applyAxisAngle(new T.Vector3(0, 1, 0), angle);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    changed();
  }
  const observer = new ResizeObserver(resize);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    observer.disconnect();
    controls.dispose();
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('webglcontextlost', lost);
    canvas.removeEventListener('keydown', keydown);
    release(scene);
    env.dispose();
    bloom?.dispose();
    output?.dispose();
    composer?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    hospitalMetrics.active--;
  }
  host.append(canvas);
  observer.observe(host);
  document.addEventListener('visibilitychange', visibility);
  canvas.addEventListener('webglcontextlost', lost);
  canvas.addEventListener('keydown', keydown);
  hospitalMetrics.active++;
  hospitalMetrics.quality = software ? 'software' : lowPower ? 'mobile' : 'full';
  hospitalMetrics.loadMs = performance.now() - start;
  resize();
  view('Isometric');
  schedule();
  return {
    pause(value) {
      paused = value;
      controls.autoRotate = !value;
      changed();
    },
    visible(value) {
      visible = value;
      if (!value) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else changed();
    },
    zoom,
    orbit,
    view,
    dispose,
  };
}
