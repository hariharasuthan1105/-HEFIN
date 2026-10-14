import * as THREE from 'three';
import { boxCorners, fitCameraToBounds } from './camera-fit';

/** Development diagnostics count owned resources, not total browser/GPU memory. */
export const hospitalMetrics = {
  created: 0,
  disposed: 0,
  activeRenderers: 0,
  activeLoops: 0,
  frames: 0,
  geometries: 0,
  materials: 0,
  textures: 0,
  drawCalls: 0,
  triangles: 0,
  dpr: 0,
  framing: { maxAbsX: 0, maxAbsY: 0, distance: 0, width: 0, height: 0 },
};
export interface HospitalController {
  setVisible(visible: boolean): void;
  setPaused(paused: boolean): void;
  reset(): void;
  dispose(): void;
}
interface Options {
  lowPower: boolean;
  onFailure: () => void;
}

/** Loaded only when the host is visible and the user's motion/power preference permits it. */
export function createHospitalScene(host: HTMLElement, options: Options): HospitalController {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'hospital-canvas';
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: !options.lowPower,
    powerPreference: 'low-power',
  });
  if (!context) throw new Error('WebGL 2 is unavailable');
  let renderer: THREE.WebGLRenderer | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let frame: number | null = null;
  let disposed = false;
  let counted = false;
  let visible = true;
  let paused = false;
  let lastTime = 0;
  let elapsed = 0;
  let lastRender = 0;
  let hovering = false;
  let entered = false;
  let targetX = 0;
  let targetY = 0;
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const scene = new THREE.Scene();
  const campus = new THREE.Group();
  const focus = new THREE.Vector3(0, 1.5, 0);
  const basePosition = new THREE.Vector3(10.4, 8.1, 13.7);
  const originalDirection = basePosition.clone().sub(focus);
  const minimumDistance = originalDirection.length();
  let fitCorners: THREE.Vector3[] = [];
  const projectedCorner = new THREE.Vector3();
  const orbitPosition = new THREE.Vector3();
  const signals: THREE.Mesh[] = [];
  const holograms: THREE.Group[] = [];
  const resource = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.add(g);
    return g;
  };
  const material = <T extends THREE.Material>(m: T): T => {
    materials.add(m);
    return m;
  };
  const boxGeometry = resource(new THREE.BoxGeometry(1, 1, 1));
  const lineMaterial = material(
    new THREE.LineBasicMaterial({ color: 0x21c9f3, transparent: true, opacity: 0.4 }),
  );
  const metal = material(
    new THREE.MeshStandardMaterial({ color: 0x567387, metalness: 0.65, roughness: 0.38 }),
  );
  const concrete = material(
    new THREE.MeshStandardMaterial({ color: 0x97b2c2, metalness: 0.35, roughness: 0.65 }),
  );
  const navy = material(
    new THREE.MeshStandardMaterial({ color: 0x101f33, metalness: 0.45, roughness: 0.5 }),
  );
  const glass = material(
    new THREE.MeshStandardMaterial({
      color: 0x174659,
      emissive: 0x0a3042,
      emissiveIntensity: 0.55,
      metalness: 0.75,
      roughness: 0.15,
      transparent: true,
      opacity: 0.8,
    }),
  );
  const cyan = material(new THREE.MeshBasicMaterial({ color: 0x43d7ef }));
  const gold = material(
    new THREE.MeshStandardMaterial({
      color: 0xe6b65d,
      emissive: 0xa2691e,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  const foliage = material(new THREE.MeshStandardMaterial({ color: 0x215961, roughness: 0.9 }));

  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: THREE.Material,
    parent: THREE.Object3D = campus,
  ) {
    const mesh = new THREE.Mesh(boxGeometry, m);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function line(
    points: number[][],
    m: THREE.LineBasicMaterial = lineMaterial,
    parent: THREE.Object3D = campus,
  ) {
    const geometry = resource(
      new THREE.BufferGeometry().setFromPoints(
        points.map((p) => new THREE.Vector3(p[0]!, p[1]!, p[2]!)),
      ),
    );
    const mesh = new THREE.Line(geometry, m);
    parent.add(mesh);
    return mesh;
  }
  function cross(x: number, y: number, z: number, size: number, parent: THREE.Object3D = campus) {
    box(size * 0.3, size, 0.05, x, y, z, cyan, parent);
    box(size, size * 0.3, 0.055, x, y, z + 0.003, cyan, parent);
  }
  function setRunning(running: boolean) {
    if (running && frame === null && !disposed) {
      lastTime = 0;
      hospitalMetrics.activeLoops++;
      frame = requestAnimationFrame(tick);
      host.dataset['rendering'] = 'running';
    } else if (!running && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
      hospitalMetrics.activeLoops--;
      host.dataset['rendering'] = 'paused';
    }
  }
  function updateLoop() {
    setRunning(visible && !paused && !document.hidden);
  }
  function draw() {
    if (!renderer || disposed || !visible || document.hidden) return;
    renderer.render(scene, camera);
    hospitalMetrics.frames++;
    hospitalMetrics.drawCalls = renderer.info.render.calls;
    hospitalMetrics.triangles = renderer.info.render.triangles;
    let maxAbsX = 0,
      maxAbsY = 0;
    for (const point of fitCorners) {
      projectedCorner.copy(point).project(camera);
      maxAbsX = Math.max(maxAbsX, Math.abs(projectedCorner.x));
      maxAbsY = Math.max(maxAbsY, Math.abs(projectedCorner.y));
    }
    hospitalMetrics.framing.maxAbsX = maxAbsX;
    hospitalMetrics.framing.maxAbsY = maxAbsY;
  }
  function resize() {
    if (!renderer || disposed) return;
    const width = Math.max(host.clientWidth, 1),
      height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const distance = fitCameraToBounds(
      camera,
      fitCorners,
      focus,
      originalDirection,
      minimumDistance,
    );
    basePosition.copy(camera.position);
    hospitalMetrics.framing = { maxAbsX: 0, maxAbsY: 0, distance, width, height };
    if (paused) draw();
  }
  function pointer(event: PointerEvent) {
    if (paused || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width - 0.5;
    targetY = (event.clientY - rect.top) / rect.height - 0.5;
    hovering = true;
  }
  function leave() {
    targetX = 0;
    targetY = 0;
    hovering = false;
  }
  function lost(event: Event) {
    event.preventDefault();
    if (!disposed) options.onFailure();
  }
  function tick(now: number) {
    if (disposed || frame === null) return;
    // One owned RAF chain. Rendering is capped at 30 fps (20 on the mobile opt-in path).
    const interval = options.lowPower ? 50 : 1000 / 30;
    if (now - lastRender >= interval) {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
      elapsed += dt;
      lastTime = now;
      lastRender = now;
      campus.rotation.y = -0.12 + Math.sin(elapsed * 0.12) * 0.14;
      const entrance = Math.min(elapsed / 0.8, 1);
      campus.position.y = -0.22 * (1 - entrance) ** 3;
      camera.position.lerp(
        orbitPosition.set(
          basePosition.x + targetX * 1.8,
          basePosition.y - targetY * 1.2,
          basePosition.z,
        ),
        0.06,
      );
      camera.lookAt(focus);
      lineMaterial.opacity += ((hovering ? 0.7 : 0.4) - lineMaterial.opacity) * 0.08;
      glass.emissiveIntensity += ((hovering ? 0.85 : 0.55) - glass.emissiveIntensity) * 0.08;
      for (let i = 0; i < signals.length; i++) {
        const node = signals[i]!;
        const phase = elapsed * 0.23 + i * ((Math.PI * 2) / signals.length);
        node.position.set(
          Math.cos(phase) * 5.15,
          0.32 + Math.sin(phase * 2 + i) * 0.06,
          Math.sin(phase) * 3.65,
        );
      }
      holograms.forEach((panel, i) => {
        panel.position.y = 3.2 + i * 0.65 + Math.sin(elapsed * 0.7 + i) * 0.07;
      });
      try {
        draw();
      } catch {
        options.onFailure();
        return;
      }
      if (!entered && entrance === 1) {
        host.dataset['entrance'] = 'complete';
        entered = true;
      }
    }
    if (!disposed && frame !== null) frame = requestAnimationFrame(tick);
  }
  function dispose() {
    if (disposed) return;
    setRunning(false);
    disposed = true;
    resizeObserver?.disconnect();
    host.removeEventListener('pointermove', pointer);
    host.removeEventListener('pointerleave', leave);
    canvas.removeEventListener('webglcontextlost', lost);
    document.removeEventListener('visibilitychange', updateLoop);
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    scene.clear();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    if (context && !context.isContextLost()) renderer?.forceContextLoss();
    canvas.remove();
    if (counted) {
      hospitalMetrics.activeRenderers--;
      hospitalMetrics.disposed++;
      hospitalMetrics.geometries -= geometries.size;
      hospitalMetrics.materials -= materials.size;
      hospitalMetrics.textures -= textures.size;
    }
    geometries.clear();
    materials.clear();
    textures.clear();
    host.dataset['rendering'] = 'disposed';
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      context,
      alpha: true,
      antialias: !options.lowPower,
    });
    renderer.setClearColor(0x080d1c, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.lowPower ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    camera.position.copy(basePosition);
    camera.lookAt(focus);
    scene.add(campus);
    scene.add(new THREE.HemisphereLight(0xc9edff, 0x122033, 2.2));
    const key = new THREE.DirectionalLight(0xbdeaff, 3.1);
    key.position.set(4, 9, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x318cff, 2);
    rim.position.set(-6, 5, -3);
    scene.add(rim);
    const warm = new THREE.PointLight(0xe6b65d, 20, 12);
    warm.position.set(1, 3, 5);
    scene.add(warm);

    // Low platform, architectural floor plates and two articulated hospital wings.
    box(10.3, 0.24, 7.2, 0, -0.12, 0, navy);
    box(10.4, 0.035, 7.3, 0, -0.18, 0, metal);
    line([
      [-5.1, 0.02, -3.5],
      [5.1, 0.02, -3.5],
      [5.1, 0.02, 3.5],
      [-5.1, 0.02, 3.5],
      [-5.1, 0.02, -3.5],
    ]);
    box(2.1, 0.12, 1.15, 0, 0.03, 3.1, concrete);
    for (const x of [-2.55, 2.55]) {
      box(3.1, 3.6, 3.5, x, 1.85, -0.05, glass);
      box(2.9, 3.5, 0.12, x, 1.85, -1.7, navy);
      for (let floor = 0; floor <= 5; floor++) {
        const y = 0.12 + floor * 0.73;
        box(3.35, 0.12, 3.8, x, y, -0.05, concrete);
        line([
          [x - 1.67, y + 0.07, 1.86],
          [x + 1.67, y + 0.07, 1.86],
          [x + 1.67, y + 0.07, -1.95],
        ]);
      }
      for (let i = 0; i <= 6; i++) box(0.042, 3.55, 0.06, x - 1.42 + i * 0.47, 1.92, 1.74, metal);
      for (const side of [-1, 1])
        for (let i = 0; i <= 5; i++)
          box(0.06, 3.55, 0.045, x + side * 1.56, 1.92, -1.5 + i * 0.62, metal);
      // Visible warm/cool window bays, instanced to keep draw calls bounded.
      const panes = new THREE.InstancedMesh(
        boxGeometry,
        material(
          new THREE.MeshBasicMaterial({
            color: x < 0 ? 0x247186 : 0x477e9c,
            transparent: true,
            opacity: 0.72,
          }),
        ),
        25,
      );
      const matrix = new THREE.Matrix4();
      let instance = 0;
      for (let floor = 0; floor < 5; floor++)
        for (let bay = 0; bay < 5; bay++) {
          matrix.compose(
            new THREE.Vector3(x - 1.13 + bay * 0.55, 0.43 + floor * 0.73, 1.72),
            new THREE.Quaternion(),
            new THREE.Vector3(0.38, 0.38, 0.035),
          );
          panes.setMatrixAt(instance++, matrix);
        }
      campus.add(panes);
      box(1.15, 0.35, 0.75, x - 0.5, 4.05, -0.5, metal);
      box(0.75, 0.5, 0.7, x + 0.7, 4.12, 0.5, navy);
      box(0.035, 0.85, 0.035, x + 0.8, 4.75, -1, concrete);
      for (let i = 0; i < 3; i++) box(0.28, 0.025, 0.55, x - 0.85 + i * 0.32, 4.24, -0.5, navy);
    }
    // Cylindrical central atrium, stacked walkways and a welcoming entrance canopy.
    const atrium = new THREE.Mesh(resource(new THREE.CylinderGeometry(1.1, 1.1, 3.85, 24)), glass);
    atrium.position.set(0, 1.96, 0.6);
    campus.add(atrium);
    const ringGeometry = resource(new THREE.TorusGeometry(1.1, 0.055, 5, 32));
    for (let floor = 0; floor <= 5; floor++) {
      const ring = new THREE.Mesh(ringGeometry, floor === 5 ? gold : metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.12 + floor * 0.76, 0.6);
      campus.add(ring);
    }
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      box(0.04, 3.85, 0.04, Math.cos(angle) * 1.1, 1.96, 0.6 + Math.sin(angle) * 1.1, metal);
    }
    box(2.7, 0.14, 1.35, 0, 0.92, 2.0, gold);
    box(1.25, 0.88, 0.12, 0, 0.47, 1.75, glass);
    box(0.04, 0.88, 0.14, 0, 0.47, 1.82, cyan);
    box(1.55, 0.92, 0.14, 0, 3.42, 1.65, navy);
    cross(0, 3.42, 1.75, 0.64);
    // Rooftop helipad and restrained landscaping make the footprint read as a campus.
    const helipad = new THREE.Mesh(
      resource(new THREE.CylinderGeometry(1.07, 1.07, 0.035, 32)),
      navy,
    );
    helipad.position.set(-2.55, 3.92, 0.55);
    campus.add(helipad);
    const heliring = new THREE.Mesh(resource(new THREE.TorusGeometry(0.84, 0.025, 4, 32)), gold);
    heliring.rotation.x = Math.PI / 2;
    heliring.position.set(-2.55, 3.95, 0.55);
    campus.add(heliring);
    box(0.1, 0.02, 0.65, -2.78, 3.96, 0.55, gold);
    box(0.1, 0.02, 0.65, -2.32, 3.96, 0.55, gold);
    box(0.55, 0.02, 0.1, -2.55, 3.96, 0.55, gold);
    const treeGeometry = resource(new THREE.IcosahedronGeometry(0.28, 1));
    for (const x of [-4.5, 4.5])
      for (let i = 0; i < 5; i++) {
        const shrub = new THREE.Mesh(treeGeometry, foliage);
        shrub.position.set(x, 0.35, -2.5 + i * 1.15);
        campus.add(shrub);
        box(0.48, 0.13, 0.48, x, 0.09, shrub.position.z, metal);
      }
    // Small holographic panels: geometric ECG strokes, no text baked into the canvas.
    const holo = material(
      new THREE.MeshBasicMaterial({
        color: 0x0d425a,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    for (let i = 0; i < 2; i++) {
      const panel = new THREE.Group();
      panel.position.set(i ? 4.7 : -4.65, 3.2 + i * 0.65, i ? 0 : 1.3);
      panel.rotation.y = 0.45;
      box(1.25, 0.88, 0.025, 0, 0, 0, holo, panel);
      line(
        [
          [-0.62, -0.44, 0.02],
          [0.62, -0.44, 0.02],
          [0.62, 0.44, 0.02],
          [-0.62, 0.44, 0.02],
          [-0.62, -0.44, 0.02],
        ],
        lineMaterial,
        panel,
      );
      line(
        [
          [-0.48, 0, 0.025],
          [-0.22, 0, 0.025],
          [-0.1, 0.2, 0.025],
          [0.02, -0.2, 0.025],
          [0.16, 0.1, 0.025],
          [0.25, 0, 0.025],
          [0.49, 0, 0.025],
        ],
        lineMaterial,
        panel,
      );
      campus.add(panel);
      holograms.push(panel);
    }
    const nodeGeometry = resource(new THREE.SphereGeometry(0.045, 6, 4));
    for (let i = 0; i < (options.lowPower ? 6 : 12); i++) {
      const node = new THREE.Mesh(nodeGeometry, cyan);
      campus.add(node);
      signals.push(node);
    }
    // Fit an envelope of the whole campus, including the full animated node orbit.
    // Sample the small yaw sweep; the added margin also covers its interpolation,
    // hologram bobbing and the 0.22-unit entrance translation. Controls remain outside.
    campus.updateMatrixWorld(true);
    const localBounds = new THREE.Box3().setFromObject(campus);
    localBounds.expandByPoint(new THREE.Vector3(-5.2, 0.2, -3.7));
    localBounds.expandByPoint(new THREE.Vector3(5.2, 0.45, 3.7));
    const envelope = new THREE.Box3();
    const yAxis = new THREE.Vector3(0, 1, 0);
    for (let sample = 0; sample <= 12; sample++) {
      const angle = -0.26 + (sample / 12) * 0.28;
      for (const point of boxCorners(localBounds))
        envelope.expandByPoint(point.applyAxisAngle(yAxis, angle));
    }
    envelope.expandByVector(new THREE.Vector3(0.08, 0.25, 0.08));
    fitCorners = boxCorners(envelope);
    // Keep all GPU allocations owned by this instance, including any future textures.
    counted = true;
    hospitalMetrics.created++;
    hospitalMetrics.activeRenderers++;
    hospitalMetrics.geometries += geometries.size;
    hospitalMetrics.materials += materials.size;
    hospitalMetrics.textures += textures.size;
    hospitalMetrics.dpr = renderer.getPixelRatio();
    host.append(canvas);
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    host.addEventListener('pointermove', pointer, { passive: true });
    host.addEventListener('pointerleave', leave);
    canvas.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', updateLoop);
    draw();
    updateLoop();
    return {
      setVisible(value) {
        visible = value;
        updateLoop();
        if (visible && paused) draw();
      },
      setPaused(value) {
        paused = value;
        updateLoop();
      },
      reset() {
        elapsed = 0.8;
        targetX = 0;
        targetY = 0;
        camera.position.copy(basePosition);
        camera.lookAt(focus);
        campus.rotation.y = -0.12;
        campus.position.y = 0;
        draw();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
