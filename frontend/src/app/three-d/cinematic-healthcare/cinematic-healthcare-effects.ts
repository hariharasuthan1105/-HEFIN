import * as T from 'three';

export type HudKind =
  | 'hospital'
  | 'intelligence'
  | 'finance'
  | 'document'
  | 'connected-care'
  | 'vitals'
  | 'anatomy';

/**
 * Procedural HUD Canvas Texture generator for futuristic holographic glass panels.
 */
export function hudPanel(kind: HudKind): T.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const c = canvas.getContext('2d')!;

  // Dark glassy background with deep cyan tint
  c.fillStyle = 'rgba(3, 14, 30, 0.85)';
  c.fillRect(0, 0, 512, 640);

  // Outer technical border
  c.strokeStyle = '#00e5ff';
  c.lineWidth = 3;
  c.strokeRect(10, 10, 492, 620);

  // Corner brackets
  const cornerSize = 24;
  c.strokeStyle = '#ffffff';
  c.lineWidth = 4;
  // Top-left
  c.beginPath(); c.moveTo(8, 8 + cornerSize); c.lineTo(8, 8); c.lineTo(8 + cornerSize, 8); c.stroke();
  // Top-right
  c.beginPath(); c.moveTo(504 - cornerSize, 8); c.lineTo(504, 8); c.lineTo(504, 8 + cornerSize); c.stroke();
  // Bottom-left
  c.beginPath(); c.moveTo(8, 632 - cornerSize); c.lineTo(8, 632); c.lineTo(8 + cornerSize, 632); c.stroke();
  // Bottom-right
  c.beginPath(); c.moveTo(504 - cornerSize, 632); c.lineTo(504, 632); c.lineTo(504, 632 - cornerSize); c.stroke();

  // Header banner
  c.fillStyle = 'rgba(0, 229, 255, 0.15)';
  c.fillRect(14, 14, 484, 64);
  c.fillStyle = '#00e5ff';
  c.font = 'bold 22px monospace';
  c.fillText('HEFIN TRUST NETWORK // NODE', 28, 45);
  c.font = '13px monospace';
  c.fillStyle = '#94a3b8';
  c.fillText('SECURE DATA PROTOCOL · REAL-TIME SYNC', 28, 66);

  // Subtle horizontal grid lines
  c.strokeStyle = 'rgba(0, 229, 255, 0.08)';
  c.lineWidth = 1;
  for (let y = 95; y < 620; y += 22) {
    c.beginPath();
    c.moveTo(20, y);
    c.lineTo(492, y);
    c.stroke();
  }

  if (kind === 'hospital' || kind === 'vitals') {
    c.fillStyle = '#ffffff';
    c.font = 'bold 26px monospace';
    c.fillText('01 // CARE INFRASTRUCTURE', 28, 125);
    c.fillStyle = '#38bdf8';
    c.font = '16px monospace';
    c.fillText('CLINICAL ADMISSION & CLAIMS', 28, 150);

    // ECG pulse lines
    c.strokeStyle = '#00e5ff';
    c.lineWidth = 3;
    for (let r = 0; r < 2; r++) {
      const baseY = 210 + r * 95;
      c.beginPath();
      c.moveTo(28, baseY);
      for (let x = 28; x < 380; x += 4) {
        const p = (x + r * 40) % 110;
        const spike = p > 45 && p < 53 ? -32 : p >= 53 && p < 61 ? 22 : Math.sin(x * 0.1) * 3;
        c.lineTo(x, baseY + spike);
      }
      c.stroke();
      c.fillStyle = '#e0f2fe';
      c.font = 'bold 24px monospace';
      c.fillText(['98.4%', '42ms'][r]!, 400, baseY + 6);
    }

    // Hospital metrics bars
    c.fillStyle = '#94a3b8';
    c.font = '14px monospace';
    c.fillText('RESOURCE LOAD', 28, 435);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = i < 10 ? '#00e5ff' : '#0284c7';
      c.fillRect(28 + i * 32, 450, 22, 50 - (i % 4) * 8);
    }
    // Cross icon
    c.fillStyle = '#38bdf8';
    c.fillRect(236, 535, 40, 70);
    c.fillRect(211, 550, 90, 40);
  } else if (kind === 'intelligence' || kind === 'anatomy') {
    c.fillStyle = '#ffffff';
    c.font = 'bold 26px monospace';
    c.fillText('02 // NEURAL AI ENGINE', 28, 125);
    c.fillStyle = '#38bdf8';
    c.font = '16px monospace';
    c.fillText('GEMMA & CLINICAL RAG PIPELINE', 28, 150);

    // Neural network layer graph
    const layers = [4, 6, 6, 4];
    const layerX = [60, 160, 260, 360];
    c.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    c.lineWidth = 1.5;
    for (let l = 0; l < layers.length - 1; l++) {
      const count1 = layers[l]!;
      const count2 = layers[l + 1]!;
      for (let i = 0; i < count1; i++) {
        const y1 = 200 + i * 35;
        for (let j = 0; j < count2; j++) {
          const y2 = 200 + j * 35;
          c.beginPath();
          c.moveTo(layerX[l]!, y1);
          c.lineTo(layerX[l + 1]!, y2);
          c.stroke();
        }
      }
    }
    // Nodes
    for (let l = 0; l < layers.length; l++) {
      const count = layers[l]!;
      for (let i = 0; i < count; i++) {
        const y = 200 + i * 35;
        c.fillStyle = l === 0 ? '#38bdf8' : l === 3 ? '#fbbf24' : '#00e5ff';
        c.beginPath();
        c.arc(layerX[l]!, y, 6, 0, Math.PI * 2);
        c.fill();
      }
    }

    c.fillStyle = '#94a3b8';
    c.font = '14px monospace';
    c.fillText('INFERENCE LATENCY: 22.4ms', 28, 440);
    c.fillText('ENCLAVE INTEGRITY: VERIFIED', 28, 465);
    c.fillText('ACTIVE PARAMETERS: 27B INT4', 28, 490);

    // Circuit badge
    c.strokeStyle = '#38bdf8';
    c.lineWidth = 2;
    c.strokeRect(180, 520, 150, 80);
    c.fillStyle = '#00e5ff';
    c.font = 'bold 18px monospace';
    c.fillText('SECURE AI', 205, 565);
  } else if (kind === 'finance') {
    c.fillStyle = '#ffffff';
    c.font = 'bold 26px monospace';
    c.fillText('03 // FINANCIAL CLARITY', 28, 125);
    c.fillStyle = '#fbbf24';
    c.font = '16px monospace';
    c.fillText('TRANSPARENT BILLING & CLAIMS', 28, 150);

    // Rising bar chart
    c.strokeStyle = '#fbbf24';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(35, 380);
    c.lineTo(470, 380);
    c.stroke();

    const heights = [40, 75, 110, 95, 150, 180, 220];
    for (let i = 0; i < heights.length; i++) {
      const x = 50 + i * 60;
      const h = heights[i]!;
      c.fillStyle = 'rgba(251, 191, 36, 0.4)';
      c.fillRect(x, 380 - h, 42, h);
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 2;
      c.strokeRect(x, 380 - h, 42, h);
    }
    // Trend line
    c.strokeStyle = '#00e5ff';
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < heights.length; i++) {
      const x = 71 + i * 60;
      const y = 370 - heights[i]!;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();

    c.fillStyle = '#e2e8f0';
    c.font = 'bold 22px monospace';
    c.fillText('SETTLEMENT: ₹0 OUT-OF-POCKET', 28, 440);
    c.font = '14px monospace';
    c.fillStyle = '#94a3b8';
    c.fillText('ZERO SURPRISE BILLING GUARANTEE', 28, 470);
    c.fillText('INSTANT PRE-AUTHORIZATION: 99.8%', 28, 495);

    // Shield emblem
    c.fillStyle = '#fbbf24';
    c.font = 'bold 48px monospace';
    c.fillText('₹', 236, 580);
  } else if (kind === 'connected-care') {
    c.fillStyle = '#ffffff';
    c.font = 'bold 26px monospace';
    c.fillText('05 // CONNECTED CARE', 28, 125);
    c.fillStyle = '#38bdf8';
    c.font = '16px monospace';
    c.fillText('CLINIC NETWORK & TELEHEALTH', 28, 150);

    // Heartbeat line
    c.strokeStyle = '#00e5ff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(28, 230);
    for (let x = 28; x < 480; x += 4) {
      const p = x % 90;
      const spike = p > 35 && p < 43 ? -36 : p >= 43 && p < 51 ? 26 : Math.sin(x * 0.08) * 3;
      c.lineTo(x, 230 + spike);
    }
    c.stroke();

    c.fillStyle = '#e0f2fe';
    c.font = 'bold 22px monospace';
    c.fillText('TELEMETRY: 72 BPM · NORMAL', 28, 305);
    c.font = '14px monospace';
    c.fillStyle = '#94a3b8';
    c.fillText('SYNCED HUBS: 14 REGIONAL HOSPITALS', 28, 340);
    c.fillText('ACTIVE CLINICS: 92 NODES ONLINE', 28, 365);
    c.fillText('SECURE TLS 1.3 ENCLAVE ROUTING', 28, 390);

    // Status chips
    for (let i = 0; i < 4; i++) {
      c.fillStyle = 'rgba(0, 229, 255, 0.12)';
      c.fillRect(28 + i * 115, 430, 100, 36);
      c.strokeStyle = '#00e5ff';
      c.lineWidth = 1.5;
      c.strokeRect(28 + i * 115, 430, 100, 36);
      c.fillStyle = '#38bdf8';
      c.font = '12px monospace';
      c.fillText(['SYNCED', 'LAT: 12ms', 'EHR OK', 'AES-256'][i]!, 36 + i * 115, 453);
    }

    // Cyan cross badge
    c.fillStyle = '#00e5ff';
    c.fillRect(238, 520, 36, 75);
    c.fillRect(218, 540, 76, 35);
  } else {
    // Document / Transparency
    c.fillStyle = '#ffffff';
    c.font = 'bold 26px monospace';
    c.fillText('04 // AUDIT & COMPLIANCE', 28, 125);
    c.fillStyle = '#38bdf8';
    c.font = '16px monospace';
    c.fillText('IMMUTABLE CARE LOGS & CONSENT', 28, 150);

    // Document lines simulation
    c.fillStyle = 'rgba(255, 255, 255, 0.12)';
    c.fillRect(40, 180, 430, 24);
    c.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let row = 0; row < 6; row++) {
      c.fillRect(40, 220 + row * 26, 430 - (row % 3) * 60, 14);
    }

    // Verified badge
    c.strokeStyle = '#00e5ff';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(256, 430, 36, 0, Math.PI * 2);
    c.stroke();
    // Checkmark
    c.strokeStyle = '#ffffff';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(240, 430);
    c.lineTo(252, 442);
    c.lineTo(275, 418);
    c.stroke();

    c.fillStyle = '#00e5ff';
    c.font = 'bold 18px monospace';
    c.fillText('VERIFIED AUTHENTIC', 155, 495);
    c.font = '13px monospace';
    c.fillStyle = '#94a3b8';
    c.fillText('SHA-256 HASH: 8f4b...39e1', 145, 525);
    c.fillText('ENCRYPTED PATIENT CONSENT', 135, 550);
    c.fillText('HIPAA & NDHM COMPLIANT', 150, 575);
  }

  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

/**
 * Backward compatibility alias for existing code.
 */
export function medicalPanel(kind: 'vitals' | 'anatomy'): T.CanvasTexture {
  return hudPanel(kind);
}

/**
 * Creates the 3D Gold HEFIN Shield geometry with the signature "H" emblem cutout.
 */
export function createShieldGeometry(): T.BufferGeometry {
  const shape = new T.Shape();
  // Outer shield contour
  shape.moveTo(0, 1.75);
  shape.bezierCurveTo(0.65, 1.75, 1.35, 1.55, 1.48, 1.35);
  shape.lineTo(1.48, 0.2);
  shape.bezierCurveTo(1.48, -0.65, 0.8, -1.35, 0, -1.8);
  shape.bezierCurveTo(-0.8, -1.35, -1.48, -0.65, -1.48, 0.2);
  shape.lineTo(-1.48, 1.35);
  shape.bezierCurveTo(-1.35, 1.55, -0.65, 1.75, 0, 1.75);

  // Inner signature "H" cutout
  const hole = new T.Path();
  const w = 0.58, h = 0.88, tw = 0.22, bar = 0.22;
  hole.moveTo(-w, -h);
  hole.lineTo(-w + tw, -h);
  hole.lineTo(-w + tw, -bar);
  hole.lineTo(w - tw, -bar);
  hole.lineTo(w - tw, -h);
  hole.lineTo(w, -h);
  hole.lineTo(w, h * 0.72);
  hole.lineTo(w - tw * 0.6, h);
  hole.lineTo(w - tw, h);
  hole.lineTo(w - tw, bar);
  hole.lineTo(-w + tw, bar);
  hole.lineTo(-w + tw, h);
  hole.lineTo(-w + tw * 0.6, h);
  hole.lineTo(-w, h * 0.72);
  hole.closePath();
  shape.holes.push(hole);

  const geom = new T.ExtrudeGeometry(shape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  geom.center();
  return geom;
}

/**
 * Creates 3D extruded bold letters for "HEFIN".
 */
export function createWordmarkGroup(goldMat: T.Material): T.Group {
  function makeLetter(char: string) {
    const s = new T.Shape();
    const w = 0.38, h = 0.52, th = 0.11;
    if (char === 'H') {
      s.moveTo(0, 0); s.lineTo(th, 0); s.lineTo(th, h * 0.42); s.lineTo(w - th, h * 0.42); s.lineTo(w - th, 0); s.lineTo(w, 0);
      s.lineTo(w, h); s.lineTo(w - th, h); s.lineTo(w - th, h * 0.58); s.lineTo(th, h * 0.58); s.lineTo(th, h); s.lineTo(0, h);
    } else if (char === 'E') {
      s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(w, th); s.lineTo(th, th); s.lineTo(th, h * 0.44); s.lineTo(w * 0.85, h * 0.44);
      s.lineTo(w * 0.85, h * 0.44 + th); s.lineTo(th, h * 0.44 + th); s.lineTo(th, h - th); s.lineTo(w, h - th); s.lineTo(w, h); s.lineTo(0, h);
    } else if (char === 'F') {
      s.moveTo(0, 0); s.lineTo(th, 0); s.lineTo(th, h * 0.44); s.lineTo(w * 0.85, h * 0.44); s.lineTo(w * 0.85, h * 0.44 + th);
      s.lineTo(th, h * 0.44 + th); s.lineTo(th, h - th); s.lineTo(w, h - th); s.lineTo(w, h); s.lineTo(0, h);
    } else if (char === 'I') {
      s.moveTo(0, 0); s.lineTo(th * 1.3, 0); s.lineTo(th * 1.3, h); s.lineTo(0, h);
    } else if (char === 'N') {
      s.moveTo(0, 0); s.lineTo(th, 0); s.lineTo(w - th, h * 0.35); s.lineTo(w - th, 0); s.lineTo(w, 0);
      s.lineTo(w, h); s.lineTo(w - th, h); s.lineTo(th, h * 0.65); s.lineTo(th, h); s.lineTo(0, h);
    }
    s.closePath();
    return new T.ExtrudeGeometry(s, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
  }

  const group = new T.Group();
  const chars = 'HEFIN';
  const widths = [0.48, 0.48, 0.48, 0.28, 0.48];
  const totalW = widths.reduce((a, b) => a + b, 0);
  let curX = -totalW / 2;

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]!;
    const geom = makeLetter(c);
    const m = new T.Mesh(geom, goldMat);
    m.position.set(curX, 0, 0);
    group.add(m);
    curX += widths[i]!;
  }

  return group;
}

/**
 * Creates the complete Central Trust Hub (Pedestal, Gold Shield, Wordmark, and Golden Orbit Ring).
 */
export function createCenterpiece(materials: {
  gold: T.MeshPhysicalMaterial;
  darkMetal: T.MeshStandardMaterial;
  cyanNeon: T.MeshBasicMaterial;
  goldGlow: T.MeshBasicMaterial;
}): { group: T.Group; update: (t: number) => void } {
  const group = new T.Group();

  // 1. Tiered circular pedestal
  const baseTiers = new T.Group();
  group.add(baseTiers);

  // Bottom tier
  const tier1 = new T.Mesh(new T.CylinderGeometry(3.3, 3.55, 0.28, 72), materials.darkMetal);
  tier1.position.y = 0.14;
  baseTiers.add(tier1);

  // Cyan neon ring on tier 1
  const ring1 = new T.Mesh(new T.TorusGeometry(3.42, 0.024, 8, 72), materials.cyanNeon);
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.28;
  baseTiers.add(ring1);

  // Intermediate tier with ventilation fins
  const tier2 = new T.Mesh(new T.CylinderGeometry(2.95, 3.15, 0.35, 72), materials.darkMetal);
  tier2.position.y = 0.45;
  baseTiers.add(tier2);

  // Gold accent ring on tier 2
  const goldRing = new T.Mesh(new T.TorusGeometry(3.02, 0.03, 8, 72), materials.gold);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.y = 0.62;
  baseTiers.add(goldRing);

  // Top deck
  const tier3 = new T.Mesh(new T.CylinderGeometry(2.65, 2.8, 0.25, 72), materials.darkMetal);
  tier3.position.y = 0.75;
  baseTiers.add(tier3);

  // Top cyan neon perimeter ring
  const ring3 = new T.Mesh(new T.TorusGeometry(2.7, 0.026, 8, 72), materials.cyanNeon);
  ring3.rotation.x = Math.PI / 2;
  ring3.position.y = 0.88;
  baseTiers.add(ring3);

  // Glossy recessed deck disc
  const topDeck = new T.Mesh(
    new T.CylinderGeometry(2.55, 2.55, 0.04, 64),
    new T.MeshStandardMaterial({ color: 0x071120, roughness: 0.55, metalness: 0.45 }),
  );
  topDeck.position.y = 0.89;
  baseTiers.add(topDeck);

  // 2. The 3D Gold HEFIN Shield
  const shieldPivot = new T.Group();
  shieldPivot.position.set(0, 2.75, 0);
  group.add(shieldPivot);

  const shieldGeom = createShieldGeometry();
  const shieldMesh = new T.Mesh(shieldGeom, materials.gold);
  shieldPivot.add(shieldMesh);

  // 3D Embossed Gold "H" Emblem floating inside the shield
  const hShape = new T.Shape();
  const hw = 0.42, hh = 0.65, hth = 0.14;
  hShape.moveTo(-hw, -hh); hShape.lineTo(-hw + hth, -hh); hShape.lineTo(-hw + hth, -hth * 0.45);
  hShape.lineTo(hw - hth, -hth * 0.45); hShape.lineTo(hw - hth, -hh); hShape.lineTo(hw, -hh);
  hShape.lineTo(hw, hh); hShape.lineTo(hw - hth, hh); hShape.lineTo(hw - hth, hth * 0.45);
  hShape.lineTo(-hw + hth, hth * 0.45); hShape.lineTo(-hw + hth, hh); hShape.lineTo(-hw, hh);
  hShape.closePath();
  const hGeom = new T.ExtrudeGeometry(hShape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  hGeom.center();
  const hMesh = new T.Mesh(hGeom, materials.gold);
  hMesh.position.set(0, 0, 0.05);
  shieldPivot.add(hMesh);

  // Inner backplate with subtle warm amber radiance (no additive blending)
  const backplateGeom = new T.PlaneGeometry(1.4, 2.0);
  const backplateMat = new T.MeshBasicMaterial({
    color: 0xb45309,
    transparent: true,
    opacity: 0.08,
    side: T.DoubleSide,
  });
  const backplate = new T.Mesh(backplateGeom, backplateMat);
  backplate.position.set(0, 0, -0.05);
  shieldPivot.add(backplate);

  // Internal subtle warm gold accent light
  const shieldLight = new T.PointLight(0xf59e0b, 0.35, 3.5, 2.0);
  shieldLight.position.set(0, 0, 0.15);
  shieldPivot.add(shieldLight);

  // 3. 3D Gold "HEFIN" Wordmark
  const wordmark = createWordmarkGroup(materials.gold);
  wordmark.position.set(0, 1.05, 1.95);
  wordmark.rotation.x = -0.15;
  group.add(wordmark);

  // 4. Glowing Golden Orbit Ring around shield
  const orbitGroup = new T.Group();
  orbitGroup.position.set(0, 2.75, 0);
  orbitGroup.rotation.set(0.42, 0, 0.28);
  group.add(orbitGroup);

  // Torus light ring with refined metallic amber sheen
  const orbitMat = new T.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xb45309,
    emissiveIntensity: 0.35,
    metalness: 0.8,
    roughness: 0.32,
  });
  const orbitTorus = new T.Mesh(new T.TorusGeometry(2.35, 0.032, 12, 96), orbitMat);
  orbitGroup.add(orbitTorus);

  // Golden particle trail around the ring
  const particleCount = 72;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const a = (i / particleCount) * Math.PI * 2;
    const r = 2.35 + (Math.sin(i * 5) * 0.06);
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
    positions[i * 3 + 2] = (Math.cos(i * 3) * 0.08);
  }
  const particleGeom = new T.BufferGeometry();
  particleGeom.setAttribute('position', new T.BufferAttribute(positions, 3));
  const particleMat = new T.PointsMaterial({
    color: 0xf59e0b,
    size: 0.035,
    transparent: true,
    opacity: 0.45,
  });
  const particles = new T.Points(particleGeom, particleMat);
  orbitGroup.add(particles);

  return {
    group,
    update(t: number) {
      orbitGroup.rotation.z = 0.28 + t * 0.45;
      shieldLight.intensity = 0.35 + Math.sin(t * 1.5) * 0.04;
    },
  };
}

/**
 * Creates the 4 peripheral rounded-corner platforms for the service nodes.
 */
export function createNodePlatform(
  size: number = 3.2,
  materials: { darkMetal: T.MeshStandardMaterial; cyanNeon: T.MeshBasicMaterial; gold: T.Material },
): T.Group {
  const group = new T.Group();

  // Tiered rounded base
  const baseGeom = new T.BoxGeometry(size, 0.28, size);
  const base = new T.Mesh(baseGeom, materials.darkMetal);
  base.position.y = 0.14;
  group.add(base);

  // Neon perimeter line on platform
  const perimeter = new T.Line(
    new T.BufferGeometry().setFromPoints([
      new T.Vector3(-size / 2, 0.29, -size / 2),
      new T.Vector3(size / 2, 0.29, -size / 2),
      new T.Vector3(size / 2, 0.29, size / 2),
      new T.Vector3(-size / 2, 0.29, size / 2),
      new T.Vector3(-size / 2, 0.29, -size / 2),
    ]),
    new T.LineBasicMaterial({ color: 0x00e5ff, linewidth: 2 }),
  );
  group.add(perimeter);

  // Upper recessed deck
  const deck = new T.Mesh(
    new T.BoxGeometry(size * 0.88, 0.08, size * 0.88),
    new T.MeshStandardMaterial({ color: 0x061122, roughness: 0.55, metalness: 0.4 }),
  );
  deck.position.y = 0.32;
  group.add(deck);

  return group;
}

/**
 * Creates a holographic glass HUD panel mounted at the back of a node.
 */
export function createHolographicPanel(kind: HudKind): T.Mesh {
  const texture = hudPanel(kind);
  const panelGeom = new T.PlaneGeometry(2.3, 1.85);
  const panelMat = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.88,
    side: T.DoubleSide,
    toneMapped: false,
    depthWrite: false,
  });
  const mesh = new T.Mesh(panelGeom, panelMat);
  mesh.renderOrder = 8;
  return mesh;
}

/**
 * Creates Node A (Modern Hospital Architecture + Landscaping + Medical Cross).
 */
export function createHospitalNode(
  hospitalModel: T.Group,
  materials: { cyanNeon: T.MeshBasicMaterial; darkMetal: T.MeshStandardMaterial; gold: T.Material },
): T.Group {
  const node = new T.Group();

  // Base platform
  const platform = createNodePlatform(3.4, materials);
  node.add(platform);

  // Hospital model integration
  const hospPivot = new T.Group();
  hospPivot.position.set(0, 0.35, 0.1);
  hospPivot.scale.setScalar(0.24);
  hospitalModel.traverse((o) => {
    if (o instanceof T.Mesh) {
      const m = o.material as T.MeshStandardMaterial;
      if (m && m.emissive) {
        m.emissiveIntensity = 0.04;
      }
    }
  });
  hospPivot.add(hospitalModel);
  node.add(hospPivot);

  // Prominent luminous cyan medical cross emblem on the tower
  const crossGroup = new T.Group();
  const crossMat = new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false });
  crossGroup.add(new T.Mesh(new T.BoxGeometry(0.12, 0.44, 0.06), crossMat));
  crossGroup.add(new T.Mesh(new T.BoxGeometry(0.44, 0.12, 0.06), crossMat));
  crossGroup.position.set(0, 2.25, 0.65);
  node.add(crossGroup);

  // Stylized miniature green trees along front entrance
  const treeMat = new T.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
  const trunkMat = new T.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const treePositions: readonly [number, number][] = [
    [-1.2, 1.1], [-1.2, 0.5], [1.2, 1.1], [1.2, 0.5],
  ];
  for (const [tx, tz] of treePositions) {
    const trunk = new T.Mesh(new T.CylinderGeometry(0.04, 0.05, 0.2, 8), trunkMat);
    trunk.position.set(tx, 0.45, tz);
    node.add(trunk);
    const foliage = new T.Mesh(new T.DodecahedronGeometry(0.16, 1), treeMat);
    foliage.position.set(tx, 0.65, tz);
    node.add(foliage);
  }

  // Holographic medical HUD panel behind
  const hud = createHolographicPanel('hospital');
  hud.position.set(0, 1.45, -1.45);
  node.add(hud);

  return node;
}

/**
 * Creates Node B (Volumetric Cloud + Brain AI + Server Racks).
 */
export function createIntelligenceNode(
  brainModel: T.Group,
  materials: { cyanNeon: T.MeshBasicMaterial; darkMetal: T.MeshStandardMaterial; gold: T.Material },
): T.Group {
  const node = new T.Group();

  // Base platform
  const platform = createNodePlatform(3.4, materials);
  node.add(platform);

  // Miniature server racks beneath cloud
  const rackMat = new T.MeshStandardMaterial({ color: 0x091424, metalness: 0.85, roughness: 0.3 });
  const bladeMat = new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false });
  const rackPositions = [-0.85, -0.3, 0.3, 0.85];
  for (const rx of rackPositions) {
    const rack = new T.Mesh(new T.BoxGeometry(0.44, 0.75, 0.7), rackMat);
    rack.position.set(rx, 0.72, 0.25);
    node.add(rack);
    for (let slot = 0; slot < 5; slot++) {
      const led = new T.Mesh(new T.BoxGeometry(0.36, 0.04, 0.02), bladeMat);
      led.position.set(rx, 0.48 + slot * 0.12, 0.61);
      node.add(led);
    }
  }

  // Glowing volumetric cloud structure
  const cloudGroup = new T.Group();
  cloudGroup.position.set(0, 1.85, 0.1);
  node.add(cloudGroup);

  const cloudMat = new T.MeshPhysicalMaterial({
    color: 0x0284c7,
    emissive: 0x0096c7,
    emissiveIntensity: 0.12,
    roughness: 0.35,
    metalness: 0.1,
    transmission: 0.65,
    transparent: true,
    opacity: 0.78,
  });

  const cloudPuffs = [
    { x: 0, y: 0.15, z: 0, r: 0.68 },
    { x: -0.55, y: 0, z: 0, r: 0.48 },
    { x: 0.55, y: 0, z: 0, r: 0.48 },
    { x: -0.28, y: 0.42, z: 0, r: 0.42 },
    { x: 0.28, y: 0.42, z: 0, r: 0.44 },
  ];
  for (const p of cloudPuffs) {
    const puff = new T.Mesh(new T.SphereGeometry(p.r, 20, 16), cloudMat);
    puff.position.set(p.x, p.y, p.z);
    cloudGroup.add(puff);
  }

  // Brain AI model centered inside / in front of cloud
  const brainPivot = new T.Group();
  brainPivot.position.set(0, 1.85, 0.25);
  brainPivot.scale.setScalar(0.32);
  brainPivot.add(brainModel);
  node.add(brainPivot);

  // Holographic AI intelligence HUD panel behind
  const hud = createHolographicPanel('intelligence');
  hud.position.set(0, 1.45, -1.45);
  node.add(hud);

  return node;
}

/**
 * Creates Node C (Financial Confidence: Stacks of Gold/Silver Coins + Financial Shield + Bar Chart).
 */
export function createFinanceNode(
  materials: { cyanNeon: T.MeshBasicMaterial; darkMetal: T.MeshStandardMaterial; gold: T.MeshPhysicalMaterial },
): T.Group {
  const node = new T.Group();

  // Base platform
  const platform = createNodePlatform(3.4, materials);
  node.add(platform);

  // Silver / Platinum material for alternating coins
  const silverMat = new T.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.18 });

  // 1. Stacks of coins
  const coinGeom = new T.CylinderGeometry(0.32, 0.32, 0.07, 28);
  const stacks = [
    { x: -0.85, z: 0.4, count: 8, mat: materials.gold },
    { x: -0.85, z: -0.3, count: 5, mat: silverMat },
    { x: -0.35, z: 0.6, count: 10, mat: materials.gold },
    { x: -0.35, z: -0.1, count: 6, mat: silverMat },
    { x: 0.25, z: 0.5, count: 7, mat: silverMat },
  ];

  for (const s of stacks) {
    for (let i = 0; i < s.count; i++) {
      const coin = new T.Mesh(coinGeom, s.mat);
      coin.position.set(s.x, 0.38 + i * 0.075, s.z);
      node.add(coin);
    }
  }

  // 2. Financial Protection Shield with Dollar/Currency Sign
  const shieldShape = new T.Shape();
  shieldShape.moveTo(0, 0.9);
  shieldShape.bezierCurveTo(0.35, 0.9, 0.7, 0.8, 0.75, 0.7);
  shieldShape.lineTo(0.75, 0.1);
  shieldShape.bezierCurveTo(0.75, -0.35, 0.4, -0.7, 0, -0.9);
  shieldShape.bezierCurveTo(-0.4, -0.7, -0.75, -0.35, -0.75, 0.1);
  shieldShape.lineTo(-0.75, 0.7);
  shieldShape.bezierCurveTo(-0.7, 0.8, -0.35, 0.9, 0, 0.9);
  shieldShape.closePath();

  const finShieldGeom = new T.ExtrudeGeometry(shieldShape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2 });
  finShieldGeom.center();
  const finShield = new T.Mesh(finShieldGeom, materials.gold);
  finShield.position.set(0.45, 1.35, -0.1);
  finShield.rotation.y = -0.25;
  node.add(finShield);

  // 3D Dollar Symbol on financial shield
  const dollarGeom = new T.CylinderGeometry(0.04, 0.04, 0.75, 8);
  const dollarPillar = new T.Mesh(dollarGeom, materials.gold);
  dollarPillar.position.set(0.45, 1.35, 0.05);
  dollarPillar.rotation.y = -0.25;
  node.add(dollarPillar);

  // 3. Upward Rising Bar Chart
  const barMat = new T.MeshPhysicalMaterial({
    color: 0x00e5ff,
    transmission: 0.65,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
    emissive: 0x00b4d8,
    emissiveIntensity: 0.12,
  });
  const barCapMat = new T.MeshBasicMaterial({ color: 0x38bdf8, toneMapped: true });
  const chartHeights = [0.4, 0.65, 0.95, 1.3];
  for (let i = 0; i < chartHeights.length; i++) {
    const h = chartHeights[i]!;
    const bar = new T.Mesh(new T.BoxGeometry(0.18, h, 0.18), barMat);
    bar.position.set(0.85 + i * 0.24, 0.35 + h / 2, 0.2);
    node.add(bar);
    const cap = new T.Mesh(new T.BoxGeometry(0.2, 0.03, 0.2), barCapMat);
    cap.position.set(0.85 + i * 0.24, 0.35 + h + 0.015, 0.2);
    node.add(cap);
  }

  // Holographic financial HUD panel behind
  const hud = createHolographicPanel('finance');
  hud.position.set(0, 1.45, -1.45);
  node.add(hud);

  return node;
}

/**
 * Creates Node D (Transparency & Verification: 3D Verified Document + Checkmark Badge).
 */
export function createDocumentNode(
  materials: { cyanNeon: T.MeshBasicMaterial; darkMetal: T.MeshStandardMaterial; gold: T.Material },
): T.Group {
  const node = new T.Group();

  // Base platform
  const platform = createNodePlatform(3.4, materials);
  node.add(platform);

  // 1. Crisp white 3D document
  const docGroup = new T.Group();
  docGroup.position.set(0, 1.25, -0.1);
  docGroup.rotation.x = -0.12;
  node.add(docGroup);

  const docMat = new T.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.65, metalness: 0.0 });
  const docBody = new T.Mesh(new T.BoxGeometry(1.2, 1.6, 0.08), docMat);
  docGroup.add(docBody);

  // Folded upper-right corner
  const foldGeom = new T.ConeGeometry(0.22, 0.09, 3);
  foldGeom.rotateY(Math.PI / 4);
  const fold = new T.Mesh(foldGeom, new T.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.6 }));
  fold.position.set(0.5, 0.7, 0.04);
  docGroup.add(fold);

  // Document lines (horizontal dark slate readable contract lines)
  const lineMat = new T.MeshBasicMaterial({ color: 0x334155 });
  const title = new T.Mesh(new T.BoxGeometry(0.8, 0.08, 0.02), new T.MeshBasicMaterial({ color: 0x0369a1 }));
  title.position.set(0, 0.52, 0.05);
  docGroup.add(title);
  for (let i = 0; i < 5; i++) {
    const l = new T.Mesh(new T.BoxGeometry(0.85 - (i % 2) * 0.2, 0.035, 0.02), lineMat);
    l.position.set(-0.02, 0.32 - i * 0.12, 0.05);
    docGroup.add(l);
  }

  // 2. Circular metallic blue badge with 3D checkmark in front
  const badgeGroup = new T.Group();
  badgeGroup.position.set(0.25, 0.85, 0.65);
  node.add(badgeGroup);

  // Circular disc
  const badgeDisc = new T.Mesh(
    new T.CylinderGeometry(0.42, 0.42, 0.1, 32),
    new T.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 }),
  );
  badgeDisc.rotation.x = Math.PI / 2.2;
  badgeGroup.add(badgeDisc);

  // Outer glowing cyan ring
  const badgeRing = new T.Mesh(new T.TorusGeometry(0.44, 0.03, 8, 32), materials.cyanNeon);
  badgeRing.rotation.x = Math.PI / 2.2;
  badgeGroup.add(badgeRing);

  // 3D Extruded Checkmark
  const checkShape = new T.Shape();
  checkShape.moveTo(-0.24, 0.04);
  checkShape.lineTo(-0.08, -0.16);
  checkShape.lineTo(0.24, 0.2);
  checkShape.lineTo(0.18, 0.26);
  checkShape.lineTo(-0.08, -0.05);
  checkShape.lineTo(-0.18, 0.09);
  checkShape.closePath();
  const checkGeom = new T.ExtrudeGeometry(checkShape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 });
  checkGeom.center();
  const checkMesh = new T.Mesh(checkGeom, new T.MeshBasicMaterial({ color: 0xffffff, toneMapped: true }));
  checkMesh.position.set(0, 0.04, 0.08);
  checkMesh.rotation.x = -0.25;
  badgeGroup.add(checkMesh);

  // Holographic compliance HUD panel behind
  const hud = createHolographicPanel('document');
  hud.position.set(0, 1.45, -1.45);
  node.add(hud);

  return node;
}

/**
 * Creates Node E (Connected Care / Community Clinic: 2-story medical clinic + cyan cross + trees + HUD panel).
 */
export function createConnectedCareNode(
  materials: { cyanNeon: T.MeshBasicMaterial; darkMetal: T.MeshStandardMaterial; gold: T.Material },
): T.Group {
  const node = new T.Group();

  // Base platform
  const platform = createNodePlatform(3.4, materials);
  node.add(platform);

  // Modern 2-story clinic building
  const clinicGroup = new T.Group();
  clinicGroup.position.set(0, 0.35, 0.1);
  node.add(clinicGroup);

  // Main architectural pavilion body
  const bodyMat = new T.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.15 });
  const body = new T.Mesh(new T.BoxGeometry(2.1, 1.25, 1.6), bodyMat);
  body.position.y = 0.625;
  clinicGroup.add(body);

  // Lower floor wide glass window with warm glow
  const groundGlass = new T.Mesh(
    new T.BoxGeometry(1.85, 0.48, 0.08),
    new T.MeshPhysicalMaterial({
      color: 0xffedd5,
      emissive: 0xfde68a,
      emissiveIntensity: 0.08,
      roughness: 0.18,
      transmission: 0.6,
      transparent: true,
      opacity: 0.88,
    }),
  );
  groundGlass.position.set(0, 0.35, 0.82);
  clinicGroup.add(groundGlass);

  // Upper floor glass band
  const upperGlass = new T.Mesh(
    new T.BoxGeometry(1.85, 0.38, 0.08),
    new T.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.08,
      roughness: 0.15,
      transmission: 0.65,
      transparent: true,
      opacity: 0.85,
    }),
  );
  upperGlass.position.set(0, 0.95, 0.82);
  clinicGroup.add(upperGlass);

  // Dark roof canopy with architectural overhang
  const roof = new T.Mesh(
    new T.BoxGeometry(2.35, 0.08, 1.85),
    new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 }),
  );
  roof.position.y = 1.28;
  clinicGroup.add(roof);

  // Entrance canopy
  const canopy = new T.Mesh(
    new T.BoxGeometry(0.85, 0.04, 0.45),
    new T.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 }),
  );
  canopy.position.set(0, 0.62, 1.0);
  clinicGroup.add(canopy);

  // Illuminated cyan medical cross on the upper facade
  const crossGroup = new T.Group();
  crossGroup.add(new T.Mesh(new T.BoxGeometry(0.08, 0.32, 0.04), materials.cyanNeon));
  crossGroup.add(new T.Mesh(new T.BoxGeometry(0.32, 0.08, 0.04), materials.cyanNeon));
  crossGroup.position.set(0, 0.96, 0.87);
  clinicGroup.add(crossGroup);

  // Stylized miniature green trees along the clinic entrance
  const treeMat = new T.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
  const trunkMat = new T.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const treePositions: readonly [number, number][] = [
    [-1.2, 1.1], [-1.2, 0.4], [1.2, 1.1], [1.2, 0.4],
  ];
  for (const [tx, tz] of treePositions) {
    const trunk = new T.Mesh(new T.CylinderGeometry(0.035, 0.045, 0.2, 8), trunkMat);
    trunk.position.set(tx, 0.45, tz);
    node.add(trunk);
    const foliage = new T.Mesh(new T.DodecahedronGeometry(0.15, 1), treeMat);
    foliage.position.set(tx, 0.65, tz);
    node.add(foliage);
  }

  // Holographic Connected Care HUD panel behind
  const hud = createHolographicPanel('connected-care');
  hud.position.set(0, 1.45, -1.45);
  node.add(hud);

  return node;
}

/**
 * Creates the glowing neon-blue connection system (curved multi-strand data paths & animated traveling data cubes).
 */
export function createTrustConnections(nodePositions: T.Vector3[]): {
  group: T.Group;
  update: (time: number) => void;
} {
  const group = new T.Group();
  const curves: T.CatmullRomCurve3[] = [];

  const cyanMat = new T.MeshBasicMaterial({ color: 0x00d8f6, transparent: true, opacity: 0.65, toneMapped: true });
  const blueMat = new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, toneMapped: true });

  // For each of the 4 outer nodes, create a 3-strand arched data conduit to the central pedestal
  for (let n = 0; n < nodePositions.length; n++) {
    const end = nodePositions[n]!;
    const startDir = end.clone().setY(0).normalize();
    const start = startDir.clone().multiplyScalar(2.8).setY(0.5);

    // 3 parallel strands
    for (let s = -1; s <= 1; s++) {
      const perp = new T.Vector3(-startDir.z, 0, startDir.x).multiplyScalar(s * 0.16);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.y = 0.28 + Math.abs(s) * 0.06;

      const p0 = start.clone().add(perp);
      const p1 = mid.clone().add(perp);
      const p2 = end.clone().setY(0.42).add(perp);

      const curve = new T.CatmullRomCurve3([p0, p1, p2]);
      curves.push(curve);

      const tubeGeom = new T.TubeGeometry(curve, 48, 0.022, 6, false);
      const tubeMesh = new T.Mesh(tubeGeom, s === 0 ? blueMat : cyanMat);
      group.add(tubeMesh);
    }
  }

  // Concentric subtle circular routing tracks on the dark floor
  const floorTrackMat = new T.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.18 });
  const trackRadii = [3.8, 5.0, 6.2, 7.6];
  for (const r of trackRadii) {
    const track = new T.Mesh(new T.TorusGeometry(r, 0.014, 4, 96), floorTrackMat);
    track.rotation.x = Math.PI / 2;
    track.position.y = 0.03;
    group.add(track);
  }

  // Small animated glowing cyan data cubes traveling along the conduits
  const cubeCount = 28;
  const cubeGeom = new T.BoxGeometry(0.14, 0.14, 0.14);
  const cubeMat = new T.MeshBasicMaterial({ color: 0xa5f3fc, toneMapped: false });
  const cubes = new T.InstancedMesh(cubeGeom, cubeMat, cubeCount);
  cubes.instanceMatrix.setUsage(T.DynamicDrawUsage);
  group.add(cubes);

  const matrix = new T.Matrix4();
  const pos = new T.Vector3();
  const rotMatrix = new T.Matrix4();

  return {
    group,
    update(time: number) {
      for (let i = 0; i < cubeCount; i++) {
        const curveIdx = i % curves.length;
        const curve = curves[curveIdx]!;
        const t = (time * 0.14 + (i / cubeCount)) % 1;
        curve.getPointAt(t, pos);
        matrix.makeTranslation(pos);
        rotMatrix.makeRotationY(time * 2 + i);
        matrix.multiply(rotMatrix);
        cubes.setMatrixAt(i, matrix);
      }
      cubes.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * Backward compatibility alias for existing code.
 */
export function dataConnections(): { group: T.Group; update: (time: number) => void } {
  return createTrustConnections([
    new T.Vector3(-5.2, 0, -3.4),
    new T.Vector3(5.2, 0, -3.4),
    new T.Vector3(-5.2, 0, 3.4),
    new T.Vector3(5.2, 0, 3.4),
  ]);
}

/**
 * Backward compatibility alias for existing code.
 */
export function displayPlatform(): { group: T.Group; update: (time: number) => void } {
  const gold = new T.MeshPhysicalMaterial({ color: 0xfdc419, metalness: 0.94, roughness: 0.16, clearcoat: 0.85 });
  const darkMetal = new T.MeshStandardMaterial({ color: 0x0c1626, metalness: 0.88, roughness: 0.28 });
  const cyanNeon = new T.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false });
  const goldGlow = new T.MeshBasicMaterial({ color: 0xffd54f, toneMapped: false });
  return createCenterpiece({ gold, darkMetal, cyanNeon, goldGlow });
}
