import * as T from 'three';
import { prepareHospital } from '../smart-hospital/hospital-viewer';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { boxCorners, fitCameraToBounds } from '../smart-hospital/camera-fit';
import {
  createCenterpiece,
  createHospitalNode,
  createIntelligenceNode,
  createFinanceNode,
  createDocumentNode,
  createConnectedCareNode,
  createTrustConnections,
} from './cinematic-healthcare-effects';

export type BrainMode = 'Hybrid' | 'Glass' | 'Wireframe';

export interface SceneController {
  setVisible(v: boolean): void;
  setPaused(v: boolean): void;
  setMode(v: BrainMode): void;
  orbit(v: number): void;
  reset(): void;
  dispose(): void;
}

export const sceneMetrics = {
  created: 0,
  disposed: 0,
  activeRenderers: 0,
  activeLoops: 0,
  frames: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  materials: 0,
  dpr: 0,
  modelBytes: 0,
  loadMs: 0,
  averageFrameMs: 0,
  mode: 'Hybrid',
  quality: 'full',
  yaw: 0,
  framing: { width: 0, height: 0, maxAbsX: 0, maxAbsY: 0 },
};

const asset = (path: string) => new URL('assets/' + path, document.baseURI).href;

function releaseGraph(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();

  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.LineSegments || o instanceof T.Points || o instanceof T.Line) {
      geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        materials.add(m);
        Object.values(m).forEach((v) => {
          if (v instanceof T.Texture) textures.add(v);
        });
      });
      if (o instanceof T.InstancedMesh) o.dispose();
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

export async function createHealthcareScene(
  host: HTMLElement,
  options: { lowPower: boolean; signal: AbortSignal; onFailure: () => void },
): Promise<SceneController> {
  const started = performance.now();
  const decoder = new DRACOLoader().setDecoderPath(asset('draco/')).setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(decoder);

  // Load both GLBs to fulfill tests and integrate genuine 3D models into Node A and Node B
  const results = await Promise.allSettled(
    ['smart-hospital', 'anatomical-brain'].map(async (name) => {
      const response = await fetch(asset('models/' + name + '.glb'), { signal: options.signal });
      if (!response.ok) throw new Error('Model download failed');
      const bytes = await response.arrayBuffer();
      options.signal.throwIfAborted();
      const model = (await loader.parseAsync(bytes, '')).scene;
      return { model, bytes: bytes.byteLength };
    }),
  );
  decoder.dispose();

  if (options.signal.aborted || results.some((r) => r.status === 'rejected')) {
    results.forEach((r) => {
      if (r.status === 'fulfilled') releaseGraph(r.value.model);
    });
    throw new Error('Scene loading cancelled or failed');
  }

  const [hospitalResult, brainResult] = results.map(
    (r) => (r as PromiseFulfilledResult<{ model: T.Group; bytes: number }>).value,
  );
  const hospital = hospitalResult!.model;
  const brain = brainResult!.model;
  const totalModelBytes = hospitalResult!.bytes + brainResult!.bytes;

  // Prepare existing models for scene integration
  prepareHospital(hospital);
  brain.scale.setScalar(1.0);

  const scene = new T.Scene();
  scene.background = new T.Color(0x020612);
  scene.fog = new T.FogExp2(0x020612, 0.007);

  let renderer: T.WebGLRenderer | undefined,
    composer: EffectComposer | undefined,
    bloom: UnrealBloomPass | undefined,
    output: OutputPass | undefined;
  let environment: T.WebGLRenderTarget | undefined,
    mirror: Reflector | undefined,
    observer: ResizeObserver | undefined;

  let raf: number | null = null,
    disposed = false,
    visible = true,
    paused = false,
    counted = false,
    last = 0,
    time = 0,
    lastRender = 0,
    frameTotal = 0,
    frameSamples = 0;

  let yaw = 0,
    pitch = 0,
    drag = false,
    downX = 0,
    downY = 0,
    downYaw = 0,
    downPitch = 0,
    targetYaw = 0,
    targetPitch = 0;

  let softwareRenderer = false;

  const canvas = document.createElement('canvas');
  canvas.className = 'cinematic-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const camera = new T.PerspectiveCamera(35, 1, 0.1, 150);
  const focus = new T.Vector3(0, 1.9, 0.8);
  // Isometric perspective angle
  const direction = new T.Vector3(0, 10.5, 23);
  let distance = 28;

  // Framing box bounding all 5 peripheral nodes and the central shield
  const fitBox = new T.Box3(new T.Vector3(-8.2, -0.4, -5.6), new T.Vector3(8.2, 6.2, 7.6));
  const corners = boxCorners(fitBox);
  const baseCamera = new T.Vector3();
  const orbitPosition = new T.Vector3();

  const updateCamera = () => {
    const dir = direction
      .clone()
      .normalize()
      .applyAxisAngle(new T.Vector3(0, 1, 0), yaw);
    dir.y += pitch;
    dir.normalize();
    orbitPosition.copy(focus).addScaledVector(dir, distance);
    camera.position.copy(orbitPosition);
    camera.lookAt(focus);
    camera.updateMatrixWorld();
    sceneMetrics.yaw = yaw;
  };

  function draw() {
    if (!renderer || !composer || disposed || !visible || document.hidden) return;
    const start = performance.now();
    renderer.info.reset();
    composer.render();
    sceneMetrics.frames++;
    sceneMetrics.drawCalls = renderer.info.render.calls;
    sceneMetrics.triangles = renderer.info.render.triangles;
    sceneMetrics.geometries = renderer.info.memory.geometries;
    sceneMetrics.textures = renderer.info.memory.textures;

    if (sceneMetrics.frames > 3) {
      frameTotal += performance.now() - start;
      frameSamples++;
      sceneMetrics.averageFrameMs = frameTotal / frameSamples;
    }

    sceneMetrics.framing.maxAbsX = 0;
    sceneMetrics.framing.maxAbsY = 0;
    for (const p of corners) {
      const q = p.clone().project(camera);
      sceneMetrics.framing.maxAbsX = Math.max(sceneMetrics.framing.maxAbsX, Math.abs(q.x));
      sceneMetrics.framing.maxAbsY = Math.max(sceneMetrics.framing.maxAbsY, Math.abs(q.y));
    }
  }

  function resize() {
    if (!renderer || disposed) return;
    const w = Math.max(1, host.clientWidth),
      h = Math.max(1, host.clientHeight);

    if (softwareRenderer) {
      const dpr = Math.min(devicePixelRatio, 0.65, Math.sqrt(180000 / (w * h)));
      renderer.setPixelRatio(dpr);
      composer?.setPixelRatio(dpr);
      sceneMetrics.dpr = dpr;
    }

    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    distance = fitCameraToBounds(camera, corners, focus, direction, 0, 1.15);
    baseCamera.copy(camera.position);
    updateCamera();
    sceneMetrics.framing.width = w;
    sceneMetrics.framing.height = h;
    draw();
  }

  // Common materials
  const goldPhysical = new T.MeshPhysicalMaterial({
    color: 0xdf9d28,
    metalness: 0.85,
    roughness: 0.28,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
    reflectivity: 0.65,
    emissive: 0x1f1200,
    emissiveIntensity: 0.02,
  });

  const darkMetal = new T.MeshStandardMaterial({
    color: 0x091322,
    metalness: 0.82,
    roughness: 0.38,
  });

  const cyanNeon = new T.MeshBasicMaterial({
    color: 0x00d8f6,
    toneMapped: true,
  });

  const goldGlow = new T.MeshBasicMaterial({
    color: 0xf59e0b,
    toneMapped: true,
  });

  // 1. Centerpiece: Gold Shield, Wordmark, Orbit Ring
  const centerpiece = createCenterpiece({
    gold: goldPhysical,
    darkMetal,
    cyanNeon,
    goldGlow,
  });
  scene.add(centerpiece.group);

  // 2. Peripheral Node Positions (5-node balanced network arrangement matching reference)
  const nodeA_pos = new T.Vector3(-5.3, 0, -3.2); // Node A: Hospital (Top-Left)
  const nodeB_pos = new T.Vector3(5.3, 0, -3.2);  // Node B: Intelligence Cloud (Top-Right)
  const nodeC_pos = new T.Vector3(-5.6, 0, 1.8);  // Node C: Financial Confidence (Mid/Bottom-Left)
  const nodeD_pos = new T.Vector3(0, 0, 5.2);     // Node D: Verified Document (Bottom-Center)
  const nodeE_pos = new T.Vector3(5.6, 0, 1.8);   // Node E: Connected Care Clinic (Mid/Bottom-Right)

  // Node A: Hospital Node
  const hospitalNode = createHospitalNode(hospital, { cyanNeon, darkMetal, gold: goldPhysical });
  hospitalNode.position.copy(nodeA_pos);
  scene.add(hospitalNode);

  // Node B: Intelligence Node
  const intelligenceNode = createIntelligenceNode(brain, { cyanNeon, darkMetal, gold: goldPhysical });
  intelligenceNode.position.copy(nodeB_pos);
  scene.add(intelligenceNode);

  // Node C: Financial Confidence Node
  const financeNode = createFinanceNode({ cyanNeon, darkMetal, gold: goldPhysical });
  financeNode.position.copy(nodeC_pos);
  scene.add(financeNode);

  // Node D: Transparency & Document Node
  const documentNode = createDocumentNode({ cyanNeon, darkMetal, gold: goldPhysical });
  documentNode.position.copy(nodeD_pos);
  scene.add(documentNode);

  // Node E: Connected Care Clinic Node
  const connectedCareNode = createConnectedCareNode({ cyanNeon, darkMetal, gold: goldPhysical });
  connectedCareNode.position.copy(nodeE_pos);
  scene.add(connectedCareNode);

  // 3. Glowing Neon-Blue Connection Conduits & Animated Data Cubes for all 5 nodes
  const connections = createTrustConnections([nodeA_pos, nodeB_pos, nodeC_pos, nodeD_pos, nodeE_pos]);
  scene.add(connections.group);

  // 4. Dark navy technical floor with soft matte sheen (no mirror glare)
  const floorGeom = new T.PlaneGeometry(120, 120);
  floorGeom.rotateX(-Math.PI / 2);
  const floorMat = new T.MeshStandardMaterial({
    color: 0x020712,
    metalness: 0.2,
    roughness: 0.85,
  });
  const floor = new T.Mesh(floorGeom, floorMat);
  floor.position.y = -0.01;
  scene.add(floor);

  // Contact shadow discs for depth and ground contact
  const centerShadow = new T.Mesh(
    new T.CircleGeometry(3.7, 48),
    new T.MeshBasicMaterial({ color: 0x000206, transparent: true, opacity: 0.6 }),
  );
  centerShadow.rotation.x = -Math.PI / 2;
  centerShadow.position.y = 0.002;
  scene.add(centerShadow);

  const nodeShadowGeom = new T.CircleGeometry(2.1, 32);
  const nodeShadowMat = new T.MeshBasicMaterial({ color: 0x000206, transparent: true, opacity: 0.5 });
  for (const pos of [nodeA_pos, nodeB_pos, nodeC_pos, nodeD_pos, nodeE_pos]) {
    const shadow = new T.Mesh(nodeShadowGeom, nodeShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(pos.x, 0.002, pos.z);
    scene.add(shadow);
  }

  // Subtle floor cyber circuit grid
  const gridHelper = new T.GridHelper(48, 24, 0x0284c7, 0x031d38);
  gridHelper.position.y = 0.005;
  (gridHelper.material as T.Material).transparent = true;
  (gridHelper.material as T.Material).opacity = 0.04;
  scene.add(gridHelper);

  // Material mode management (Hybrid, Glass, Wireframe)
  function applyMode(mode: BrainMode) {
    sceneMetrics.mode = mode;
    if (mode === 'Glass') {
      goldPhysical.transmission = 0.75;
      goldPhysical.opacity = 0.65;
      goldPhysical.transparent = true;
      goldPhysical.roughness = 0.08;
      goldPhysical.wireframe = false;
    } else if (mode === 'Wireframe') {
      goldPhysical.transmission = 0;
      goldPhysical.opacity = 1;
      goldPhysical.transparent = false;
      goldPhysical.wireframe = true;
    } else {
      // Hybrid
      goldPhysical.transmission = 0;
      goldPhysical.opacity = 1;
      goldPhysical.transparent = false;
      goldPhysical.wireframe = false;
      goldPhysical.roughness = 0.16;
    }
    draw();
  }

  let idleTimer = 0;

  // Pointer & Touch Controls for interactive orbit
  function down(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = true;
    downX = e.clientX;
    downY = e.clientY;
    downYaw = yaw;
    downPitch = pitch;
    idleTimer = performance.now();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }

  function move(e: PointerEvent) {
    if (!drag) return;
    idleTimer = performance.now();
    yaw = T.MathUtils.clamp(downYaw + (e.clientX - downX) * 0.0018, -0.32, 0.32);
    pitch = T.MathUtils.clamp(downPitch + (e.clientY - downY) * 0.0008, -0.15, 0.15);
    updateCamera();
    draw();
  }

  function up(e: PointerEvent) {
    drag = false;
    idleTimer = performance.now();
    try {
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  }

  function wheel(e: WheelEvent) {
    e.preventDefault();
    idleTimer = performance.now();
    distance = T.MathUtils.clamp(distance + e.deltaY * 0.012, 18, 42);
    updateCamera();
    draw();
  }

  function lost(e: Event) {
    e.preventDefault();
    if (!disposed) options.onFailure();
  }

  function running(value: boolean) {
    if (value && raf === null && !disposed) {
      last = 0;
      sceneMetrics.activeLoops++;
      raf = requestAnimationFrame(tick);
    } else if (!value && raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
      sceneMetrics.activeLoops--;
    }
    host.dataset['rendering'] = value ? 'running' : 'paused';
  }

  function visibility() {
    running(visible && !paused && !document.hidden);
  }

  function tick(now: number) {
    if (disposed || raf === null) return;
    if (now - lastRender >= (softwareRenderer ? 200 : options.lowPower ? 50 : 1000 / 30)) {
      const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
      time += delta;
      last = now;
      lastRender = now;

      centerpiece.update(time);
      connections.update(time);

      // Gentle camera autorotation after 1.5s idle when motion is active
      if (!paused && !drag && (now - idleTimer) > 1500) {
        yaw = T.MathUtils.clamp(yaw + delta * 0.04, -0.32, 0.32);
        updateCamera();
      }

      try {
        draw();
      } catch {
        options.onFailure();
        return;
      }
    }
    if (!disposed && raf !== null) raf = requestAnimationFrame(tick);
  }

  function dispose() {
    if (disposed) return;
    running(false);
    disposed = true;
    observer?.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('webglcontextlost', lost);

    releaseGraph(scene);
    goldPhysical.dispose();
    darkMetal.dispose();
    cyanNeon.dispose();
    goldGlow.dispose();
    floorMat.dispose();

    environment?.dispose();
    bloom?.dispose();
    output?.dispose();
    composer?.dispose();
    renderer?.renderLists.dispose();
    renderer?.dispose();

    if (renderer && !renderer.getContext().isContextLost()) {
      renderer.forceContextLoss();
    }
    canvas.remove();
    scene.clear();

    if (counted) {
      sceneMetrics.activeRenderers--;
      sceneMetrics.disposed++;
    }
    sceneMetrics.activeLoops = 0;
    sceneMetrics.geometries = 0;
    sceneMetrics.textures = 0;
    sceneMetrics.materials = 0;
  }

  try {
    options.signal.throwIfAborted();
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: !options.lowPower,
      powerPreference: 'low-power',
    });
    if (!context) throw new Error('WebGL unavailable');

    const debugRenderer = context.getExtension('WEBGL_debug_renderer_info');
    const rendererName = debugRenderer
      ? String(context.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL))
      : '';
    softwareRenderer = /swiftshader|llvmpipe|softpipe|software rasterizer/i.test(rendererName);
    sceneMetrics.quality = softwareRenderer ? 'software' : options.lowPower ? 'mobile' : 'full';

    renderer = new T.WebGLRenderer({ canvas, context, antialias: !options.lowPower });
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, softwareRenderer ? 0.65 : options.lowPower ? 1 : 1.25),
    );
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.info.autoReset = false;

    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.08);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.22;
    room.dispose();
    pmrem.dispose();

    // Balanced 3-Point Lighting Setup
    // Soft sky/ground ambient fill
    scene.add(new T.HemisphereLight(0x60a5fa, 0x020713, 0.4));

    // Warm key light from front-right (crisp definition without overexposure)
    const key = new T.DirectionalLight(0xfff5e6, 1.15);
    key.position.set(9, 14, 11);
    scene.add(key);

    // Cool cyan fill light from the left
    const fill = new T.DirectionalLight(0x38bdf8, 0.45);
    fill.position.set(-11, 9, -5);
    scene.add(fill);

    // Controlled rim light from behind (separates silhouettes from dark background)
    const rim = new T.DirectionalLight(0x0284c7, 0.65);
    rim.position.set(0, 11, -12);
    scene.add(rim);

    // Node accent point lights (gentle localized radiance, no floor glare)
    const nodeLights = [
      { pos: new T.Vector3(-5.3, 1.2, -3.2), col: 0x00e5ff, intensity: 0.35 },
      { pos: new T.Vector3(5.3, 1.2, -3.2), col: 0x38bdf8, intensity: 0.35 },
      { pos: new T.Vector3(-5.6, 1.2, 1.8), col: 0xf59e0b, intensity: 0.3 },
      { pos: new T.Vector3(0, 1.0, 4.4), col: 0x0284c7, intensity: 0.15 },
      { pos: new T.Vector3(5.6, 1.2, 1.8), col: 0x00e5ff, intensity: 0.3 },
    ];
    for (const nl of nodeLights) {
      const pLight = new T.PointLight(nl.col, nl.intensity, 4, 2.0);
      pLight.position.copy(nl.pos);
      scene.add(pLight);
    }

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    if (!softwareRenderer && !options.lowPower) {
      bloom = new UnrealBloomPass(new T.Vector2(512, 512), 0.18, 0.25, 0.85);
      composer.addPass(bloom);
    }
    output = new OutputPass();
    composer.addPass(output);

    host.appendChild(canvas);
    observer = new ResizeObserver(resize);
    observer.observe(host);

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', visibility);

    sceneMetrics.created++;
    sceneMetrics.activeRenderers++;
    counted = true;
    sceneMetrics.modelBytes = totalModelBytes;
    sceneMetrics.loadMs = performance.now() - started;

    const materialSet = new Set<T.Material>();
    scene.traverse((o) => {
      if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          if (m) materialSet.add(m);
        });
      }
    });
    sceneMetrics.materials = materialSet.size;

    resize();
    visibility();
  } catch (err) {
    dispose();
    throw err;
  }

  return {
    setVisible(v: boolean) {
      visible = v;
      visibility();
      if (visible && paused) draw();
    },
    setPaused(v: boolean) {
      paused = v;
      visibility();
    },
    setMode(v: BrainMode) {
      applyMode(v);
    },
    orbit(v: number) {
      yaw = T.MathUtils.clamp(yaw + v * 0.08, -0.32, 0.32);
      idleTimer = performance.now();
      updateCamera();
      draw();
    },
    reset() {
      yaw = 0;
      pitch = 0;
      time = 0;
      idleTimer = performance.now();
      sceneMetrics.yaw = 0;
      distance = fitCameraToBounds(camera, corners, focus, direction, 0, 1.15);
      baseCamera.copy(camera.position);
      updateCamera();
      draw();
    },
    dispose,
  };
}
