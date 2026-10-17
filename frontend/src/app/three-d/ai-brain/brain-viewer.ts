import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export type BrainView = 'Isometric' | 'Front' | 'Back' | 'Left' | 'Right' | 'Top';

export interface BrainController {
  pause(value: boolean): void;
  visible(value: boolean): void;
  zoom(factor: number): void;
  orbit(angle: number): void;
  view(value: BrainView): void;
  reset(): void;
  dispose(): void;
}

export const brainMetrics = {
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
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const textures = new Set<T.Texture>();
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        materials.add(m);
        const pbr = m as Record<string, unknown>;
        if (pbr['bumpMap'] instanceof T.Texture) textures.add(pbr['bumpMap']);
        if (pbr['map'] instanceof T.Texture) textures.add(pbr['map']);
      });
    }
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
}

/** Generates procedural organic micro-surface texture for realistic brain gyri & sulci wrinkling */
function createTissueTexture(): T.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const n1 = Math.sin(x * 0.18) * Math.cos(y * 0.18);
        const n2 = Math.sin(x * 0.42 + y * 0.35) * 0.5;
        const n3 = (Math.random() - 0.5) * 0.25;
        const v = Math.floor(T.MathUtils.clamp((0.5 + 0.3 * (n1 + n2) + n3), 0, 1) * 255);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/** Prepares genuine anatomical brain geometry with realistic white-gray PBR tissue materials. */
export function prepareBrain(root: T.Object3D) {
  const tissueBump = createTissueTexture();

  // Realistic white-gray anatomical tissue matching reference images
  const cortexMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0xdce0e6),
    roughness: 0.54,
    metalness: 0.0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.38,
    sheen: 0.55,
    sheenColor: new T.Color(0xf2f5f9),
    sheenRoughness: 0.45,
    bumpMap: tissueBump,
    bumpScale: 0.02,
  });

  const cerebMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0xd1d5db),
    roughness: 0.65,
    metalness: 0.0,
    clearcoat: 0.08,
    sheen: 0.45,
    sheenColor: new T.Color(0xe6ebf2),
    bumpMap: tissueBump,
    bumpScale: 0.035,
  });

  const stemMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0xd6dbe1),
    roughness: 0.46,
    metalness: 0.0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.28,
    sheen: 0.5,
    sheenColor: new T.Color(0xf0f4f9),
    bumpMap: tissueBump,
    bumpScale: 0.015,
  });

  const discard: T.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const name = o.name.toLowerCase();
    const matName = (o.material?.name || '').toLowerCase();

    // Discard any decorative neural paths, glowing spheres, or holographic nodes
    if (
      name.includes('illustrative') ||
      name.includes('sphere') ||
      matName.includes('illustrative') ||
      matName.includes('paths') ||
      matName.includes('nodes')
    ) {
      discard.push(o);
      return;
    }

    o.castShadow = true;
    o.receiveShadow = true;

    if (matName.includes('cerebellar') || name.includes('peduncle') || name.includes('cerebell')) {
      o.material = cerebMat;
    } else if (matName.includes('brainstem') || name.includes('colliculus') || name.includes('stem')) {
      o.material = stemMat;
    } else {
      o.material = cortexMat;
    }
  });

  discard.forEach((o) => o.parent?.remove(o));
}

export async function createBrainViewer(
  host: HTMLElement,
  signal: AbortSignal,
  onFailure: () => void,
  onInteraction: () => void,
): Promise<BrainController> {
  const start = performance.now();
  const asset = (path: string) => new URL('assets/' + path, document.baseURI).href;
  const decoder = new DRACOLoader().setDecoderPath(asset('draco/')).setWorkerLimit(1);
  let root: T.Group | undefined;

  try {
    const response = await fetch(asset('models/anatomical-brain.glb'), { signal });
    if (!response.ok) throw new Error('Anatomical brain model unavailable');
    const bytes = await response.arrayBuffer();
    signal.throwIfAborted();
    root = (await new GLTFLoader().setDRACOLoader(decoder).parseAsync(bytes, '')).scene;
    brainMetrics.bytes = bytes.byteLength;
    signal.throwIfAborted();
  } finally {
    decoder.dispose();
  }

  if (!root) throw new Error('Failed to parse anatomical brain GLB');
  prepareBrain(root);

  // Center model and scale to standard interactive bounding box with breathing room
  const box = new T.Box3().setFromObject(root);
  const center = box.getCenter(new T.Vector3());
  const size = box.getSize(new T.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3.6 / (maxDim || 1);
  root.scale.setScalar(scale);
  root.position.sub(center.clone().multiplyScalar(scale));
  root.position.y += 0.18; // Elevate slightly so it sits in upper 2/3 above the controls

  const canvas = document.createElement('canvas');
  canvas.className = 'brain-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D realistic human brain model');
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);

  const context = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!context) {
    canvas.remove();
    release(root);
    throw new Error('WebGL2 unavailable');
  }

  const dbg = context.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(context.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const software = /swiftshader|llvmpipe|software/i.test(gpu);
  brainMetrics.quality = software ? 'software' : 'full';

  const scene = new T.Scene();
  scene.background = new T.Color(0x040814);

  const camera = new T.PerspectiveCamera(36, 1, 0.1, 100);
  const renderer = new T.WebGLRenderer({
    canvas,
    context,
    antialias: !software,
    powerPreference: 'high-performance',
  });

  const dpr = Math.min(window.devicePixelRatio || 1, software ? 0.8 : 1.5);
  renderer.setPixelRatio(dpr);
  brainMetrics.dpr = dpr;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = T.PCFShadowMap;

  // Realistic Anatomical Chiaroscuro Lighting
  // Subdued ambient allows deep crevices (sulci) to be dramatically shadowed
  const hemi = new T.HemisphereLight(0xdbe3ed, 0x0a101d, 0.45);
  scene.add(hemi);

  // Key directional light sculpts the gyri with soft anatomical white-gray tones
  const keyLight = new T.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(-5, 7, 6);
  if (!software) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
  }
  scene.add(keyLight);

  // Fill light keeps shadowed lateral surfaces visible
  const fillLight = new T.DirectionalLight(0x8fa8c2, 0.6);
  fillLight.position.set(5, 2, 4);
  scene.add(fillLight);

  // Posterior rim light carves the silhouette of the occipital cortex & cerebellum
  const rimLight = new T.DirectionalLight(0xe2efff, 1.8);
  rimLight.position.set(2, 6, -6);
  scene.add(rimLight);

  // Inferior rim delineates the brainstem and cerebellar folia
  const bottomRim = new T.DirectionalLight(0xc8dcfa, 1.1);
  bottomRim.position.set(0, -6, -3);
  scene.add(bottomRim);

  const brainPivot = new T.Group();
  brainPivot.add(root);
  scene.add(brainPivot);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 1.0;
  controls.minDistance = 4.0;
  controls.maxDistance = 15.0;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.75;
  controls.target.set(0, 0.18, 0);

  // Anatomically calibrated viewpoints:
  // In our model: +Z is anterior (Front), -Z is posterior (Back / Cerebellum)
  // +X is Left lateral, -X is Right lateral, +Y is Superior (Top)
  const dist = 9.2;
  const presets: Record<BrainView, { pos: T.Vector3; target: T.Vector3 }> = {
    Isometric: { pos: new T.Vector3(dist * 0.68, dist * 0.35, dist * 0.65), target: new T.Vector3(0, 0.18, 0) },
    Front: { pos: new T.Vector3(0, 0.2, dist), target: new T.Vector3(0, 0.18, 0) },
    Back: { pos: new T.Vector3(0, 0.2, -dist), target: new T.Vector3(0, 0.18, 0) },
    Left: { pos: new T.Vector3(dist, 0.2, 0), target: new T.Vector3(0, 0.18, 0) },
    Right: { pos: new T.Vector3(-dist, 0.2, 0), target: new T.Vector3(0, 0.18, 0) },
    Top: { pos: new T.Vector3(0, dist, 0.001), target: new T.Vector3(0, 0.18, 0) },
  };

  camera.position.copy(presets.Isometric.pos);
  controls.update();

  let targetCamPos: T.Vector3 | null = null;
  let animatingCam = false;
  let animProgress = 0;
  let startCamPos = new T.Vector3();

  function triggerTransition(targetPos: T.Vector3) {
    startCamPos.copy(camera.position);
    targetCamPos = targetPos.clone();
    animatingCam = true;
    animProgress = 0;
  }

  controls.addEventListener('start', onInteraction);

  let isPaused = false;
  let isVisible = true;
  let rafId: number | null = null;
  let lastTime = 0;

  function render() {
    if (animatingCam && targetCamPos) {
      animProgress += 0.04;
      if (animProgress >= 1) {
        camera.position.copy(targetCamPos);
        animatingCam = false;
        targetCamPos = null;
      } else {
        const ease = 0.5 - Math.cos(animProgress * Math.PI) / 2;
        camera.position.lerpVectors(startCamPos, targetCamPos, ease);
      }
      controls.target.set(0, 0.18, 0);
    }

    controls.update();
    renderer.render(scene, camera);

    brainMetrics.frames++;
    brainMetrics.calls = renderer.info.render.calls;
    brainMetrics.triangles = renderer.info.render.triangles;
    brainMetrics.geometries = renderer.info.memory.geometries;
    brainMetrics.distance = camera.position.distanceTo(controls.target);
    brainMetrics.azimuth = controls.getAzimuthalAngle();
  }

  function loop(now: number) {
    if (rafId === null) return;
    const delta = now - lastTime;
    const minInterval = software ? 150 : 1000 / 35;

    if (delta >= minInterval) {
      lastTime = now;
      const t0 = performance.now();
      render();
      brainMetrics.renderMs = performance.now() - t0;
    }
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId === null && isVisible && !document.hidden) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  const resize = () => {
    const w = host.clientWidth || 400;
    const h = host.clientHeight || 400;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      render();
    }
  };

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const visibilityChange = () => {
    if (document.hidden) {
      stopLoop();
    } else if (isVisible) {
      startLoop();
    }
  };
  document.addEventListener('visibilitychange', visibilityChange);

  const contextLost = (e: Event) => {
    e.preventDefault();
    stopLoop();
    onFailure();
  };
  canvas.addEventListener('webglcontextlost', contextLost);

  brainMetrics.active = 1;
  brainMetrics.loadMs = performance.now() - start;
  if (typeof window !== 'undefined') {
    (window as unknown as { __hefinBrain?: typeof brainMetrics }).__hefinBrain = brainMetrics;
  }
  startLoop();

  return {
    pause(val: boolean) {
      isPaused = val;
      controls.autoRotate = !val;
      if (val) {
        render();
      } else {
        startLoop();
      }
    },
    visible(val: boolean) {
      isVisible = val;
      if (val) startLoop();
      else stopLoop();
    },
    zoom(factor: number) {
      onInteraction();
      const currentDist = camera.position.distanceTo(controls.target);
      const newDist = T.MathUtils.clamp(currentDist * factor, controls.minDistance, controls.maxDistance);
      const dir = camera.position.clone().sub(controls.target).normalize();
      triggerTransition(controls.target.clone().addScaledVector(dir, newDist));
    },
    orbit(angle: number) {
      onInteraction();
      const currentDist = camera.position.distanceTo(controls.target);
      const az = controls.getAzimuthalAngle() + angle;
      const pol = controls.getPolarAngle();
      const x = currentDist * Math.sin(pol) * Math.sin(az);
      const y = currentDist * Math.cos(pol);
      const z = currentDist * Math.sin(pol) * Math.cos(az);
      triggerTransition(new T.Vector3(x, y, z));
    },
    view(preset: BrainView) {
      onInteraction();
      const p = presets[preset];
      if (p) {
        triggerTransition(p.pos);
      }
    },
    reset() {
      onInteraction();
      triggerTransition(presets.Isometric.pos);
    },
    dispose() {
      stopLoop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange);
      canvas.removeEventListener('webglcontextlost', contextLost);
      controls.dispose();
      renderer.dispose();
      release(scene);
      canvas.remove();
      brainMetrics.active = 0;
    },
  };
}
