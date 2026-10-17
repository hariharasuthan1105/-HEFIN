import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

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
      if (o.geometry) geometries.add(o.geometry);
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
        if (!m) return;
        materials.add(m);
        const pbr = m as Record<string, unknown>;
        if (pbr['bumpMap'] instanceof T.Texture) textures.add(pbr['bumpMap']);
        if (pbr['map'] instanceof T.Texture) textures.add(pbr['map']);
      });
    } else if (o instanceof T.LineSegments || o instanceof T.Line) {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material instanceof T.Material) materials.add(o.material);
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

/** Generates fine horizontal foliar striations for cerebellum folia */
function createCerebellumTexture(): T.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const d = imgData.data;
    for (let y = 0; y < size; y++) {
      const rowVal = Math.sin(y * 0.85) * 0.45 + Math.sin(y * 1.7) * 0.25;
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const noise = (Math.random() - 0.5) * 0.15;
        const v = Math.floor(T.MathUtils.clamp((0.5 + rowVal + noise), 0, 1) * 255);
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
  tex.repeat.set(8, 24);
  return tex;
}

/** Injects two-tier electric cyan Fresnel rim highlights and dynamic depth alpha */
function applyCyanFresnel(mat: T.MeshPhysicalMaterial, rimPower = 3.2, edgePower = 6.0, intensity = 1.45) {
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       vec3 nV = normalize(-vViewPosition);
       vec3 nN = normalize(vNormal);
       float fRim = 1.0 - abs(dot(nN, nV));
       // Sharp edge-focused Fresnel rim keeps facing surfaces clear while contours glow cyan
       float rimGlow = pow(fRim, ${rimPower.toFixed(1)}) * 2.5 + pow(fRim, ${edgePower.toFixed(1)}) * 4.5;
       vec3 cyanFresnel = vec3(0.06, 0.92, 1.0) * (rimGlow * ${intensity.toFixed(2)});

       // Gentle sapphire rim-adjacent tint
       float bodyTint = pow(fRim, 1.8) * 0.35;
       vec3 sapphireTint = vec3(0.04, 0.28, 0.65) * bodyTint;

       gl_FragColor.rgb += cyanFresnel + sapphireTint;
       gl_FragColor.a = clamp(0.35 + pow(fRim, 2.0) * 0.60, 0.0, 0.96);
      `
    );
  };
}

/** Prepares genuine anatomical brain geometry with premium sapphire-blue translucent PBR tissue materials. */
export function prepareBrain(root: T.Object3D) {
  const tissueBump = createTissueTexture();
  const cerebBump = createCerebellumTexture();

  // Sapphire-blue translucent cerebral cortex tissue
  const cortexMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0x0a2d55),
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 0.85,
    clearcoatRoughness: 0.10,
    sheen: 1.0,
    sheenColor: new T.Color(0x38bdf8),
    sheenRoughness: 0.20,
    bumpMap: tissueBump,
    bumpScale: 0.02,
    transparent: true,
    opacity: 0.38,
    depthWrite: false, // Ensures internal glowing neural network renders through with zero occlusion
    side: T.FrontSide,
  });
  applyCyanFresnel(cortexMat, 3.2, 6.0, 1.45);

  // Cerebellum material with horizontal foliar striations
  const cerebMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0x0c3460),
    roughness: 0.26,
    metalness: 0.05,
    clearcoat: 0.65,
    sheen: 0.90,
    sheenColor: new T.Color(0x22d3ee),
    sheenRoughness: 0.25,
    bumpMap: cerebBump,
    bumpScale: 0.035,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    side: T.FrontSide,
  });
  applyCyanFresnel(cerebMat, 3.0, 5.8, 1.35);

  // Brainstem material with longitudinal descending flow
  const stemMat = new T.MeshPhysicalMaterial({
    color: new T.Color(0x082648),
    roughness: 0.18,
    metalness: 0.05,
    clearcoat: 0.75,
    sheen: 0.85,
    sheenColor: new T.Color(0x38bdf8),
    sheenRoughness: 0.20,
    bumpMap: tissueBump,
    bumpScale: 0.015,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: T.FrontSide,
  });
  applyCyanFresnel(stemMat, 3.0, 5.8, 1.40);

  const discard: T.Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const name = o.name.toLowerCase();
    const matName = (o.material?.name || '').toLowerCase();

    // Discard any crude legacy illustrative objects from original GLB
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
    o.renderOrder = 10; // Renders after internal neural network to ensure true translucent depth

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

/**
 * Procedurally constructs the internal warm-gold neural intelligence network
 * anchored directly to the brain pivot. Features:
 * - Limbic/callosal C-arcs through both hemispheres
 * - Interhemispheric transverse commissural bridges
 * - Cortical radiations strictly enclosed within cortical gyri and sulci
 * - Brainstem descending tracts and cerebellar peduncles
 * - Synaptic nodes and animated excitation pulse shader
 * - Volumetric internal warm-gold point lights
 */
function createNeuralIntelligenceNetwork(): {
  group: T.Group;
  update: (timeMs: number) => void;
} {
  const group = new T.Group();
  group.name = 'neural-intelligence-network';

  const rawPathways: T.Vector3[][] = [];

  // Helper for bilaterally symmetric pathways (left: s = +1, right: s = -1)
  const addBilateral = (pts: [number, number, number][]) => {
    rawPathways.push(pts.map(([x, y, z]) => new T.Vector3(x, y, z)));
    rawPathways.push(pts.map(([x, y, z]) => new T.Vector3(-x, y, z)));
  };

  // 1. Primary Limbic / Corpus Callosum C-shaped Arcs (dense golden core)
  addBilateral([
    [0.30, 0.28, 0.72],
    [0.38, 0.55, 0.50],
    [0.42, 0.72, 0.20],
    [0.42, 0.75, -0.15],
    [0.38, 0.62, -0.48],
    [0.32, 0.35, -0.72],
    [0.38, 0.12, -0.58],
    [0.48, -0.10, -0.25],
    [0.42, -0.20, 0.12],
  ]);

  // 2. Secondary Cingulate / Medial Limbic Tracts
  addBilateral([
    [0.22, 0.38, 0.62],
    [0.28, 0.75, 0.35],
    [0.30, 0.85, -0.05],
    [0.28, 0.78, -0.38],
    [0.24, 0.48, -0.65],
  ]);

  // 3. Fornix & Stria Terminalis (inner descending arc)
  addBilateral([
    [0.15, 0.35, 0.12],
    [0.18, 0.46, -0.08],
    [0.20, 0.36, -0.32],
    [0.24, 0.15, -0.45],
    [0.32, -0.08, -0.30],
  ]);

  // 4. Interhemispheric Transverse Commissures (Bridging Left & Right across X = 0)
  rawPathways.push([
    new T.Vector3(-0.30, 0.28, 0.72),
    new T.Vector3(0.0, 0.32, 0.75),
    new T.Vector3(0.30, 0.28, 0.72),
  ]);
  rawPathways.push([
    new T.Vector3(-0.38, 0.55, 0.50),
    new T.Vector3(0.0, 0.58, 0.52),
    new T.Vector3(0.38, 0.55, 0.50),
  ]);
  rawPathways.push([
    new T.Vector3(-0.42, 0.75, -0.15),
    new T.Vector3(0.0, 0.78, -0.15),
    new T.Vector3(0.42, 0.75, -0.15),
  ]);
  rawPathways.push([
    new T.Vector3(-0.38, 0.62, -0.48),
    new T.Vector3(0.0, 0.65, -0.48),
    new T.Vector3(0.38, 0.62, -0.48),
  ]);
  rawPathways.push([
    new T.Vector3(-0.32, 0.35, -0.72),
    new T.Vector3(0.0, 0.38, -0.74),
    new T.Vector3(0.32, 0.35, -0.72),
  ]);
  rawPathways.push([
    new T.Vector3(-0.42, -0.20, 0.12),
    new T.Vector3(-0.20, -0.12, 0.14),
    new T.Vector3(0.0, -0.10, 0.14),
    new T.Vector3(0.20, -0.12, 0.14),
    new T.Vector3(0.42, -0.20, 0.12),
  ]);
  rawPathways.push([
    new T.Vector3(-0.38, 0.12, -0.58),
    new T.Vector3(0.0, 0.15, -0.60),
    new T.Vector3(0.38, 0.12, -0.58),
  ]);

  // 5. Sylvian Fissure / Lateral Sulcus Pathway (prominent lateral golden pathway seamlessly branching from core)
  addBilateral([
    [0.42, 0.05, 0.15],
    [0.65, 0.10, 0.05],
    [0.86, 0.18, -0.10],
    [0.88, 0.34, -0.38],
    [0.76, 0.48, -0.68],
  ]);

  // 6. Superior Temporal Gyrus Parallel Pathway
  addBilateral([
    [0.48, -0.10, -0.25],
    [0.78, -0.14, -0.05],
    [0.92, -0.10, -0.25],
    [0.86, 0.05, -0.55],
  ]);

  // 7. Central Sulcus (Rolandic) Pathway (Ascending vertically through middle gyri)
  addBilateral([
    [0.86, 0.18, -0.10],
    [0.82, 0.55, -0.05],
    [0.72, 0.95, 0.0],
    [0.50, 1.25, 0.02],
    [0.22, 1.40, 0.02],
  ]);

  // 8. Precentral Motor Pathway
  addBilateral([
    [0.72, 0.30, 0.15],
    [0.72, 0.68, 0.18],
    [0.62, 1.05, 0.20],
    [0.40, 1.30, 0.22],
  ]);

  // 9. Parieto-Occipital Arch
  addBilateral([
    [0.76, 0.48, -0.68],
    [0.65, 0.78, -0.92],
    [0.45, 1.02, -0.95],
    [0.20, 1.15, -0.95],
  ]);

  // 10. Frontal Cortical Radiations (strictly inside frontal gyri)
  addBilateral([
    [0.30, 0.28, 0.72],
    [0.38, 0.38, 1.05],
    [0.30, 0.50, 1.35],
    [0.18, 0.60, 1.45],
  ]);
  addBilateral([
    [0.30, 0.28, 0.72],
    [0.48, 0.12, 0.98],
    [0.55, 0.02, 1.18],
  ]);
  addBilateral([
    [0.38, 0.55, 0.50],
    [0.58, 0.68, 0.80],
    [0.72, 0.80, 1.05],
  ]);
  addBilateral([
    [0.28, 0.75, 0.35],
    [0.50, 0.95, 0.60],
    [0.58, 1.10, 0.78],
  ]);
  addBilateral([
    [0.22, 0.38, 0.62],
    [0.26, 0.80, 0.75],
    [0.22, 1.10, 0.88],
    [0.15, 1.28, 0.95],
  ]);

  // 11. Occipital Radiations (Optic Radiations to Visual Cortex)
  addBilateral([
    [0.32, 0.35, -0.72],
    [0.52, 0.40, -1.05],
    [0.48, 0.42, -1.35],
  ]);
  addBilateral([
    [0.32, 0.35, -0.72],
    [0.42, 0.60, -1.02],
    [0.38, 0.72, -1.28],
  ]);
  addBilateral([
    [0.38, 0.12, -0.58],
    [0.46, 0.08, -0.98],
    [0.35, 0.02, -1.28],
  ]);
  addBilateral([
    [0.48, 0.42, -1.35],
    [0.28, 0.44, -1.45],
    [0.10, 0.38, -1.48],
  ]);

  // 12. Brainstem Axonal Columns (strictly within brainstem column)
  rawPathways.push([
    new T.Vector3(0.0, 0.20, 0.02),
    new T.Vector3(0.0, -0.15, -0.02),
    new T.Vector3(0.0, -0.45, -0.06),
    new T.Vector3(0.0, -0.75, -0.10),
    new T.Vector3(0.0, -1.02, -0.12),
  ]);
  addBilateral([
    [0.10, 0.14, 0.0],
    [0.09, -0.18, -0.03],
    [0.07, -0.48, -0.07],
    [0.05, -0.76, -0.11],
    [0.03, -1.00, -0.13],
  ]);
  addBilateral([
    [0.08, 0.08, -0.12],
    [0.07, -0.22, -0.14],
    [0.06, -0.52, -0.15],
    [0.04, -0.80, -0.16],
  ]);

  // 13. Cerebellar Peduncles & Foliar Arborization (strictly inside cerebellum)
  addBilateral([
    [0.11, -0.18, -0.04],
    [0.30, -0.30, -0.28],
    [0.48, -0.45, -0.55],
    [0.62, -0.55, -0.80],
  ]);
  addBilateral([
    [0.09, -0.05, -0.15],
    [0.25, -0.20, -0.38],
    [0.42, -0.36, -0.62],
  ]);
  addBilateral([
    [0.08, -0.42, -0.15],
    [0.25, -0.50, -0.38],
    [0.46, -0.60, -0.65],
    [0.58, -0.68, -0.85],
  ]);
  addBilateral([
    [0.48, -0.45, -0.55],
    [0.65, -0.48, -0.62],
    [0.74, -0.52, -0.72],
  ]);
  addBilateral([
    [0.62, -0.55, -0.80],
    [0.52, -0.62, -0.92],
    [0.35, -0.65, -0.95],
  ]);
  rawPathways.push([
    new T.Vector3(0.0, -0.22, -0.28),
    new T.Vector3(0.0, -0.40, -0.52),
    new T.Vector3(0.0, -0.58, -0.75),
    new T.Vector3(0.0, -0.72, -0.92),
  ]);

  // 14. Thalamic Dense Core Clusters
  addBilateral([
    [0.38, 0.55, 0.50],
    [0.22, 0.35, 0.25],
    [0.12, 0.22, 0.05],
    [0.0, 0.25, 0.05],
  ]);
  addBilateral([
    [0.42, 0.75, -0.15],
    [0.25, 0.42, -0.10],
    [0.14, 0.22, -0.05],
    [0.0, 0.25, -0.05],
  ]);
  addBilateral([
    [0.38, 0.62, -0.48],
    [0.24, 0.36, -0.35],
    [0.14, 0.15, -0.15],
  ]);

  // Generate tube geometries and extract unique synaptic node positions
  const tubeGeometries: T.BufferGeometry[] = [];
  const nodePositions: T.Vector3[] = [];
  const nodeSet = new Set<string>();

  for (const pts of rawPathways) {
    if (pts.length < 2) continue;
    const curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.25);
    const tubeGeom = new T.TubeGeometry(curve, 22, 0.024, 6, false);
    tubeGeometries.push(tubeGeom);

    // Collect key nodes at start, end, and midpoint
    const samples = [0, 0.5, 1];
    for (const t of samples) {
      const p = curve.getPoint(t);
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
      if (!nodeSet.has(key)) {
        nodeSet.add(key);
        nodePositions.push(p);
      }
    }
  }

  // Merge all neural tubes into 1 single BufferGeometry for optimal performance (1 draw call)
  const mergedGeom = BufferGeometryUtils.mergeGeometries(tubeGeometries, false);
  tubeGeometries.forEach((g) => g.dispose());

  // Luminous warm-gold neural material with traveling excitation pulses
  const neuralMat = new T.MeshBasicMaterial({
    color: new T.Color(0xffa200), // Pure warm amber gold unaffected by scene key lights
    transparent: true,
    opacity: 0.96,
  });

  neuralMat.onBeforeCompile = (shader) => {
    shader.uniforms['uTime'] = { value: 0 };
    shader.vertexShader = `
      varying vec3 vWorldPos;
      ${shader.vertexShader}
    `.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );
    shader.fragmentShader = `
      uniform float uTime;
      varying vec3 vWorldPos;
      ${shader.fragmentShader}
    `.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       // Traveling neural excitation pulses
       float wave1 = sin(vWorldPos.y * 7.0 + vWorldPos.z * 5.0 - uTime * 4.0);
       float wave2 = sin(vWorldPos.x * 6.0 - vWorldPos.z * 6.0 + uTime * 3.5);
       float pulse = smoothstep(0.65, 0.98, max(wave1, wave2));
       vec3 pulseFlash = vec3(1.0, 0.95, 0.6) * (pulse * 2.5);
       gl_FragColor.rgb += pulseFlash;
      `
    );
    neuralMat.userData['shader'] = shader;
  };

  const neuralTubesMesh = new T.Mesh(mergedGeom, neuralMat);
  neuralTubesMesh.name = 'neural-pathway-tubes';
  neuralTubesMesh.renderOrder = 1;
  group.add(neuralTubesMesh);

  // Synaptic node points rendered via single InstancedMesh (1 draw call)
  const nodeCount = nodePositions.length;
  const nodeGeom = new T.SphereGeometry(0.042, 10, 8);
  const nodeMat = new T.MeshBasicMaterial({
    color: new T.Color(0xffd54f),
  });

  const nodeInstanced = new T.InstancedMesh(nodeGeom, nodeMat, nodeCount);
  nodeInstanced.name = 'neural-synaptic-nodes';
  nodeInstanced.renderOrder = 2;

  const dummy = new T.Object3D();
  for (let i = 0; i < nodeCount; i++) {
    const p = nodePositions[i];
    if (!p) continue;
    dummy.position.copy(p);
    const scale = 0.85 + Math.sin(i * 1.3) * 0.35;
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    nodeInstanced.setMatrixAt(i, dummy.matrix);
  }
  nodeInstanced.instanceMatrix.needsUpdate = true;
  group.add(nodeInstanced);

  // Internal warm-gold volumetric point lights illuminating from inside the cortex
  const ptCenter = new T.PointLight(0xff6a00, 14.0, 7.0, 1.2);
  ptCenter.position.set(0, 0.35, 0.05);
  group.add(ptCenter);

  const ptLeft = new T.PointLight(0xff7700, 9.0, 6.0, 1.2);
  ptLeft.position.set(0.35, 0.40, -0.08);
  group.add(ptLeft);

  const ptRight = new T.PointLight(0xff7700, 9.0, 6.0, 1.2);
  ptRight.position.set(-0.35, 0.40, -0.08);
  group.add(ptRight);

  const ptStem = new T.PointLight(0xff5500, 7.0, 4.0, 1.2);
  ptStem.position.set(0, -0.30, -0.10);
  group.add(ptStem);

  return {
    group,
    update: (timeMs: number) => {
      const sec = timeMs * 0.001;
      const sh = neuralMat.userData['shader'];
      if (sh && sh.uniforms['uTime']) {
        sh.uniforms['uTime'].value = sec;
      }
      // Gentle breathing pulsation on internal lights
      ptCenter.intensity = 14.0 + Math.sin(sec * 2.5) * 2.0;
      ptLeft.intensity = 9.0 + Math.cos(sec * 2.2) * 1.5;
      ptRight.intensity = 9.0 + Math.sin(sec * 2.2) * 1.5;
    },
  };
}

/**
 * Creates the concentric cyan holographic HUD ground reticle at the base of the brain
 * matching the futuristic medical visualization aesthetics.
 */
function createHolographicGroundReticle(): T.Group {
  const reticle = new T.Group();
  reticle.name = 'holographic-ground-reticle';
  reticle.position.set(0, -1.55, 0);

  const cyanMat = new T.LineBasicMaterial({
    color: new T.Color(0x0ea5e9),
    transparent: true,
    opacity: 0.38,
  });

  const brightCyanMat = new T.LineBasicMaterial({
    color: new T.Color(0x38bdf8),
    transparent: true,
    opacity: 0.65,
  });

  // Concentric circle rings
  const radii = [0.85, 1.35, 1.80];
  radii.forEach((r, idx) => {
    const pts: T.Vector3[] = [];
    const segments = idx === 1 ? 48 : 64;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new T.Vector3(Math.cos(theta) * r, 0, Math.sin(theta) * r));
    }
    const geom = new T.BufferGeometry().setFromPoints(pts);
    const line = new T.Line(geom, idx === 1 ? brightCyanMat : cyanMat);
    reticle.add(line);
  });

  // Crosshair ticks and compass markers
  const tickPts: T.Vector3[] = [];
  const tickCount = 16;
  for (let i = 0; i < tickCount; i++) {
    const theta = (i / tickCount) * Math.PI * 2;
    const isMajor = i % 4 === 0;
    const r1 = 1.74;
    const r2 = isMajor ? 1.94 : 1.84;
    tickPts.push(new T.Vector3(Math.cos(theta) * r1, 0, Math.sin(theta) * r1));
    tickPts.push(new T.Vector3(Math.cos(theta) * r2, 0, Math.sin(theta) * r2));
  }
  // Central subtle crosshair lines
  tickPts.push(new T.Vector3(-0.35, 0, 0), new T.Vector3(0.35, 0, 0));
  tickPts.push(new T.Vector3(0, 0, -0.35), new T.Vector3(0, 0, 0.35));

  const ticksGeom = new T.BufferGeometry().setFromPoints(tickPts);
  const ticks = new T.LineSegments(ticksGeom, brightCyanMat);
  reticle.add(ticks);

  return reticle;
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

  // Center model and scale to standard interactive bounding box
  const box = new T.Box3().setFromObject(root);
  const center = box.getCenter(new T.Vector3());
  const size = box.getSize(new T.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3.6 / (maxDim || 1);
  root.scale.setScalar(scale);
  root.position.sub(center.clone().multiplyScalar(scale));
  root.position.y += 0.18; // Elevate slightly so it sits in upper 2/3 above controls

  const canvas = document.createElement('canvas');
  canvas.className = 'brain-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D sapphire-blue neural intelligence brain model with golden neural pathways');
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

  // Cinematic Cool Oceanic Lighting with Cyan Contours
  const hemi = new T.HemisphereLight(0x38bdf8, 0x031835, 1.1);
  scene.add(hemi);

  // Key directional light sculpts gyri with crisp cool white-blue tones
  const keyLight = new T.DirectionalLight(0xe0f2fe, 3.0);
  keyLight.position.set(-5, 7, 6);
  if (!software) {
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
  }
  scene.add(keyLight);

  // Fill light keeps shadowed lateral surfaces visible with azure depth
  const fillLight = new T.DirectionalLight(0x0284c7, 1.6);
  fillLight.position.set(6, 2, 4);
  scene.add(fillLight);

  // Posterior rim light carves the silhouette of the occipital cortex & cerebellum in icy cyan
  const rimLight = new T.DirectionalLight(0x38bdf8, 3.8);
  rimLight.position.set(0, 5, -7);
  scene.add(rimLight);

  // Inferior rim delineates the brainstem and cerebellar folia
  const bottomRim = new T.DirectionalLight(0x06b6d4, 2.2);
  bottomRim.position.set(0, -6, -2);
  scene.add(bottomRim);

  // Brain Pivot: contains the anatomical brain AND the procedural neural network
  // Guaranteeing 100% spatial anchoring and lockstep rotation
  const brainPivot = new T.Group();
  brainPivot.name = 'brain-pivot';
  brainPivot.add(root);

  // Build and attach the procedural golden neural intelligence network
  const neuralNetwork = createNeuralIntelligenceNetwork();
  brainPivot.add(neuralNetwork.group);

  scene.add(brainPivot);

  // Add holographic HUD ground reticle at the base
  const groundReticle = createHolographicGroundReticle();
  scene.add(groundReticle);

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

  // Calibrated view presets matching the 6 reference collage panels
  // In our model: +Z is anterior (Front), -Z is posterior (Back / Cerebellum)
  // +X is Left lateral, -X is Right lateral, +Y is Superior (Top)
  const dist = 9.2;
  const presets: Record<BrainView, { pos: T.Vector3; target: T.Vector3 }> = {
    Isometric: { pos: new T.Vector3(dist * 0.65, dist * 0.28, dist * 0.70), target: new T.Vector3(0, 0.18, 0) },
    Front: { pos: new T.Vector3(0, 0.2, dist), target: new T.Vector3(0, 0.18, 0) },
    Back: { pos: new T.Vector3(0, 0.2, -dist), target: new T.Vector3(0, 0.18, 0) },
    Left: { pos: new T.Vector3(dist, 0.2, 0), target: new T.Vector3(0, 0.18, 0) },
    Right: { pos: new T.Vector3(-dist, 0.2, 0), target: new T.Vector3(0, 0.18, 0) },
    // Top view oriented with anterior frontal pole facing up (+Z at top of screen)
    Top: { pos: new T.Vector3(0, dist, -0.001), target: new T.Vector3(0, 0.18, 0) },
  };

  camera.position.copy(presets.Isometric.pos);
  controls.update();

  let targetCamPos: T.Vector3 | null = null;
  let animatingCam = false;
  let animProgress = 0;
  const startCamPos = new T.Vector3();

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

  function render(now: number) {
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

    // Update traveling neural excitation pulses and light pulsation
    neuralNetwork.update(now);

    // Subtle slow rotation of holographic ground reticle for HUD alive feel
    groundReticle.rotation.y = now * 0.0003;

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
      render(now);
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
      render(performance.now());
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
        render(performance.now());
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
