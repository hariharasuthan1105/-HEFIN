import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { boxCorners, fitCameraToBounds } from '../smart-hospital/camera-fit';
import { medicalPanel, dataConnections, displayPlatform } from './cinematic-healthcare-effects';

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
    if (o instanceof T.Mesh || o instanceof T.LineSegments || o instanceof T.Points) {
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
  const results = await Promise.allSettled(
    ['anatomical-brain', 'smart-hospital'].map(async (name) => {
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
  const [brainResult, hospitalResult] = results.map(
    (r) => (r as PromiseFulfilledResult<{ model: T.Group; bytes: number }>).value,
  );
  const brain = brainResult!.model,
    hospital = hospitalResult!.model;
  const scene = new T.Scene();
  scene.background = new T.Color(0x050e22);
  scene.fog = new T.FogExp2(0x06142a, 0.014);
  scene.add(brain, hospital);
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
    downPitch = 0;
  let softwareRenderer = false;
  const canvas = document.createElement('canvas');
  canvas.className = 'cinematic-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const camera = new T.PerspectiveCamera(35, 1, 0.1, 150);
  const focus = new T.Vector3(0, 3, 0);
  const direction = new T.Vector3(5, 6.2, 25);
  let distance = 28;
  const wire = new T.Group(),
    rim = new T.Group();
  brain.add(wire, rim);
  const neuralOrbit = new T.Group();
  neuralOrbit.position.set(-6, 5, 0.5);
  scene.add(neuralOrbit);
  const surfaceMaterials: T.MeshPhysicalMaterial[] = [];
  const originalBrainMeshes: T.Mesh[] = [];
  brain.traverse((o) => {
    if (o instanceof T.Mesh) originalBrainMeshes.push(o);
  });
  const retiredMaterials = new Set<T.Material>();
  const fitBox = new T.Box3(new T.Vector3(-10, -0.35, -6.5), new T.Vector3(11, 9, 6.5));
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
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    distance = fitCameraToBounds(camera, corners, focus, direction, 0, 1.14);
    baseCamera.copy(camera.position);
    updateCamera();
    sceneMetrics.framing.width = w;
    sceneMetrics.framing.height = h;
    draw();
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
  let links: ReturnType<typeof dataConnections>, platform: ReturnType<typeof displayPlatform>;
  function tick(now: number) {
    if (disposed || raf === null) return;
    if (now - lastRender >= (softwareRenderer ? 200 : options.lowPower ? 50 : 1000 / 30)) {
      time += last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      lastRender = now;
      brain.rotation.y = -1.05 + Math.sin(time * 0.16) * 0.08;
      brain.position.y = 5.0 + Math.sin(time * 0.7) * 0.07;
      links.update(time);
      platform.update(time);
      neuralOrbit.rotation.y = time * 0.09;
      for (const m of surfaceMaterials) m.emissiveIntensity = 0.15 + Math.sin(time * 1.25) * 0.035;
      try {
        draw();
      } catch {
        options.onFailure();
        return;
      }
    }
    if (!disposed && raf !== null) raf = requestAnimationFrame(tick);
  }
  function down(e: PointerEvent) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    drag = true;
    downX = e.clientX;
    downY = e.clientY;
    downYaw = yaw;
    downPitch = pitch;
    canvas.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    yaw = T.MathUtils.clamp(downYaw + (e.clientX - downX) * 0.0012, -0.16, 0.16);
    pitch = T.MathUtils.clamp(downPitch + (e.clientY - downY) * 0.0006, -0.055, 0.055);
    updateCamera();
    draw();
  }
  function up() {
    drag = false;
  }
  function lost(e: Event) {
    e.preventDefault();
    if (!disposed) options.onFailure();
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
    canvas.removeEventListener('webglcontextlost', lost);
    releaseGraph(scene);
    retiredMaterials.forEach((m) => m.dispose());
    mirror?.getRenderTarget().dispose();
    environment?.dispose();
    bloom?.dispose();
    output?.dispose();
    composer?.dispose();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    if (renderer && !renderer.getContext().isContextLost()) renderer.forceContextLoss();
    canvas.remove();
    scene.clear();
    if (counted) {
      sceneMetrics.activeRenderers--;
      sceneMetrics.disposed++;
    }
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
    // Software rasterizers share CPU time with navigation and accessible controls.
    // Keep the detailed models but reduce resolution and expensive screen passes.
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
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.info.autoReset = false;
    const pmrem = new T.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environment = pmrem.fromScene(room, 0.08);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.32;
    room.dispose();
    pmrem.dispose();
    scene.add(new T.HemisphereLight(0x8bbfff, 0x071021, 1.4));
    const key = new T.DirectionalLight(0xc2e8ff, 2.4);
    key.position.set(-5, 12, 10);
    scene.add(key);
    const purple = new T.PointLight(0x8b5cf6, 90, 16);
    purple.position.set(-8, 6, -3);
    scene.add(purple);
    const blue = new T.PointLight(0x21c9f3, 55, 15);
    blue.position.set(-4, 7, 5);
    scene.add(blue);
    const warm = new T.PointLight(0xffce8a, 8, 15);
    warm.position.set(6, 3, 3);
    scene.add(warm);
    hospital.position.set(5.1, 0, -0.7);
    hospital.scale.setScalar(0.9);
    hospital.traverse((o) => {
      if (o instanceof T.Mesh) {
        const m = o.material as T.MeshStandardMaterial;
        if (m.name.includes('glazing')) {
          m.opacity = 0.22;
          m.transparent = true;
          m.depthWrite = false;
          m.roughness = 0.18;
          m.metalness = 0.25;
          m.emissive.set(0x12647b);
          m.emissiveIntensity = 0.025;
        }
        if (m.name.includes('equipment')) {
          m.color.set(0xb7aaa0);
          m.emissive.set(0xffcf8a);
          m.emissiveIntensity = 0.16;
        }
        if (m.name.includes('light strips')) {
          m.emissive.set(0x21c9f3);
          m.emissiveIntensity = 1.5;
        }
        if (m.name.includes('facade bands')) m.color.set(0x34495b);
      }
    });
    const edgeMaterial = new T.MeshBasicMaterial({
      color: new T.Color(0x21c9f3).multiplyScalar(2.2),
      toneMapped: false,
    });
    for (const x of [-2.25, 2.25])
      for (let floor = 1; floor <= 5; floor++) {
        const points: T.Vector3[] = [];
        for (const [cx, cz, start] of [
          [1.33, 2.08, 0],
          [-1.33, 2.08, 90],
          [-1.33, -2.08, 180],
          [1.33, -2.08, 270],
        ])
          for (let j = 0; j <= 8; j++) {
            const a = T.MathUtils.degToRad(start! + (j * 90) / 8);
            points.push(
              new T.Vector3(
                x + cx! + 0.62 * Math.cos(a),
                0.29 + floor * 1.08,
                cz! + 0.62 * Math.sin(a),
              ),
            );
          }
        hospital.add(
          new T.Mesh(
            new T.TubeGeometry(new T.CatmullRomCurve3(points, true), 80, 0.012, 4, true),
            edgeMaterial,
          ),
        );
      }
    brain.scale.setScalar(1.18);
    brain.position.set(-6, 5, 0.5);
    brain.rotation.y = -1.05;
    const fresnel = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      vertexShader:
        'varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p; }',
      fragmentShader:
        'varying vec3 n; varying vec3 v; void main(){ float f=pow(1.-abs(dot(normalize(n),normalize(v))),2.5); vec3 color=mix(vec3(.13,.79,.95),vec3(.55,.22,1.),smoothstep(-.2,.7,n.x)); gl_FragColor=vec4(color*2.4,f*.65); }',
    });
    const wireMaterial = new T.LineBasicMaterial({
      color: 0x47bfff,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
      blending: T.AdditiveBlending,
    });
    for (const mesh of originalBrainMeshes) {
      const old = mesh.material as T.MeshStandardMaterial;
      if (old.name.includes('Neural')) {
        old.emissiveIntensity = 2;
        continue;
      }
      retiredMaterials.add(old);
      const material = new T.MeshPhysicalMaterial({
        color: old.name.includes('Violet') ? 0x241350 : 0x06334a,
        metalness: 0.25,
        roughness: 0.3,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.9,
        emissive: 0x0875aa,
        emissiveIntensity: 0.15,
        side: T.FrontSide,
      });
      mesh.material = material;
      surfaceMaterials.push(material);
      const contour = new T.Mesh(mesh.geometry, fresnel);
      contour.position.copy(mesh.position);
      contour.quaternion.copy(mesh.quaternion);
      contour.scale.copy(mesh.scale).multiplyScalar(1.001);
      rim.add(contour);
      const lines = new T.LineSegments(new T.WireframeGeometry(mesh.geometry), wireMaterial);
      lines.position.copy(mesh.position);
      lines.quaternion.copy(mesh.quaternion);
      lines.scale.copy(mesh.scale).multiplyScalar(1.002);
      wire.add(lines);
    }
    links = dataConnections();
    scene.add(links.group);
    platform = displayPlatform();
    scene.add(platform.group);
    const orbitVertices = [];
    for (let i = 0; i < 28; i++) {
      const a = (i * Math.PI * 2) / 28;
      orbitVertices.push(Math.cos(a) * 3.6, Math.sin(a * 3) * 1.3, Math.sin(a) * 2.7);
    }
    neuralOrbit.add(
      new T.Points(
        new T.BufferGeometry().setAttribute(
          'position',
          new T.Float32BufferAttribute(orbitVertices, 3),
        ),
        new T.PointsMaterial({
          color: 0x74dfff,
          size: 0.045,
          transparent: true,
          opacity: 0.8,
          toneMapped: false,
        }),
      ),
    );
    for (const [i, kind] of (['vitals', 'anatomy'] as const).entries()) {
      const panel = new T.Mesh(
        new T.PlaneGeometry(1.8, 2.25),
        new T.MeshBasicMaterial({
          map: medicalPanel(kind),
          transparent: true,
          opacity: 0.88,
          side: T.DoubleSide,
          toneMapped: false,
          depthTest: false,
          depthWrite: false,
        }),
      );
      panel.renderOrder = 10;
      panel.position.set(3.1 + i * 3.4, 3.8, 3.1);
      panel.rotation.y = 0.05;
      scene.add(panel);
    }
    const logoTexture = await new T.TextureLoader().loadAsync(asset('logo/hefin-logo.png'));
    if (disposed || options.signal.aborted) {
      logoTexture.dispose();
      throw new Error('Scene cancelled');
    }
    logoTexture.colorSpace = T.SRGBColorSpace;
    const sign = new T.Mesh(
      new T.PlaneGeometry(1.1, (1.1 * 274) / 294),
      new T.MeshBasicMaterial({ map: logoTexture, transparent: true, toneMapped: false }),
    );
    sign.position.set(5.1, 6.5, -0.2);
    scene.add(sign);
    const cross = new T.Group();
    const crossMat = new T.MeshBasicMaterial({ color: 0x53dfff, toneMapped: false });
    cross.add(
      new T.Mesh(new T.BoxGeometry(0.13, 0.55, 0.05), crossMat),
      new T.Mesh(new T.BoxGeometry(0.55, 0.13, 0.05), crossMat),
    );
    cross.position.set(8.4, 6.4, -0.4);
    scene.add(cross);
    // A single low-resolution planar reflection; skipped for mobile opt-in.
    if (!options.lowPower && !softwareRenderer) {
      mirror = new Reflector(new T.PlaneGeometry(120, 120), {
        clipBias: 0.003,
        textureWidth: 512,
        textureHeight: 512,
        color: 0x071327,
      });
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.y = -0.28;
      (mirror.material as T.ShaderMaterial).fragmentShader = (
        mirror.material as T.ShaderMaterial
      ).fragmentShader.replace(
        'gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );',
        'gl_FragColor = vec4( mix(color, base.rgb, 0.23), 1.0 );',
      );
      scene.add(mirror);
    } else {
      const ground = new T.Mesh(
        new T.PlaneGeometry(50, 35),
        new T.MeshStandardMaterial({ color: 0x08162a, metalness: 0.8, roughness: 0.3 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.28;
      scene.add(ground);
    }
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    if (!softwareRenderer) {
      bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.28, 0.45, 1.05);
      composer.addPass(bloom);
    }
    output = new OutputPass();
    composer.addPass(output);
    host.append(canvas);
    counted = true;
    sceneMetrics.created++;
    sceneMetrics.activeRenderers++;
    sceneMetrics.modelBytes = brainResult!.bytes + hospitalResult!.bytes;
    sceneMetrics.dpr = renderer.getPixelRatio();
    sceneMetrics.loadMs = performance.now() - started;
    const materialSet = new Set<T.Material>();
    scene.traverse((o) => {
      if (o instanceof T.Mesh)
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materialSet.add(m));
    });
    sceneMetrics.materials = materialSet.size;
    resize();
    observer = new ResizeObserver(resize);
    observer.observe(host);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('webglcontextlost', lost);
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return {
      setVisible(v) {
        visible = v;
        visibility();
        if (v && paused) draw();
      },
      setPaused(v) {
        paused = v;
        visibility();
      },
      setMode(v) {
        sceneMetrics.mode = v;
        wire.visible = v !== 'Glass';
        rim.visible = v === 'Hybrid';
        wireMaterial.opacity = v === 'Wireframe' ? 0.28 : 0.075;
        surfaceMaterials.forEach((m) => {
          m.opacity = v === 'Wireframe' ? 0.12 : 0.9;
        });
        draw();
      },
      orbit(v) {
        yaw = T.MathUtils.clamp(yaw + v * 0.04, -0.16, 0.16);
        updateCamera();
        draw();
      },
      reset() {
        yaw = 0;
        pitch = 0;
        time = 0;
        brain.position.y = 5;
        brain.rotation.y = -1.05;
        links.update(0);
        platform.update(0);
        updateCamera();
        draw();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
