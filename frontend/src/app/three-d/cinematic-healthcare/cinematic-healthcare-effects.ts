import * as T from 'three';

/** Synthetic display art only. No clinical measurements or reconstructed neural tracts. */
export function medicalPanel(kind: 'vitals' | 'anatomy'): T.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const c = canvas.getContext('2d')!;
  c.fillStyle = 'rgba(3,20,41,.83)';
  c.fillRect(0, 0, 512, 640);
  c.strokeStyle = '#21c9f3';
  c.lineWidth = 3;
  c.strokeRect(8, 8, 496, 624);
  c.fillStyle = '#9cecff';
  c.font = '22px monospace';
  c.fillText('HEFIN / SIMULATION', 28, 45);
  c.font = '14px monospace';
  c.fillText('ILLUSTRATIVE DATA ONLY', 28, 72);
  c.strokeStyle = 'rgba(33,201,243,.12)';
  c.lineWidth = 1;
  for (let i = 90; i < 620; i += 25) {
    c.beginPath();
    c.moveTo(24, i);
    c.lineTo(488, i);
    c.stroke();
  }
  c.strokeStyle = '#5be2ff';
  c.lineWidth = 3;
  if (kind === 'vitals') {
    c.font = '28px monospace';
    c.fillStyle = '#e0faff';
    c.fillText('AI INSIGHTS', 28, 126);
    for (let row = 0; row < 3; row++) {
      const y = 192 + row * 110;
      c.beginPath();
      c.moveTo(28, y);
      for (let x = 28; x < 360; x += 5) {
        const p = (x + row * 25) % 100;
        c.lineTo(x, y + (p > 42 && p < 50 ? -35 : p >= 50 && p < 58 ? 22 : Math.sin(x * 0.1) * 3));
      }
      c.stroke();
      c.fillStyle = row === 1 ? '#bfa2ff' : '#8eeeff';
      c.font = '26px monospace';
      c.fillText(['72', '98', '16'][row]!, 396, y + 8);
    }
    for (let i = 0; i < 15; i++) {
      c.fillStyle = i % 3 === 0 ? '#8b5cf6' : '#21c9f3';
      c.fillRect(30 + i * 29, 560 - ((i * 19) % 80), 15, 35 + ((i * 19) % 80));
    }
  } else {
    c.beginPath();
    c.arc(143, 143, 24, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    c.moveTo(143, 167);
    c.lineTo(143, 324);
    c.moveTo(85, 234);
    c.lineTo(112, 184);
    c.lineTo(174, 184);
    c.lineTo(202, 234);
    c.moveTo(143, 324);
    c.lineTo(108, 420);
    c.moveTo(143, 324);
    c.lineTo(180, 420);
    c.stroke();
    for (let i = 0; i < 40; i++) {
      const y = 125 + i * 8;
      const x = 365 + Math.sin(i * 0.25) * 55;
      const x2 = 365 - Math.sin(i * 0.25) * 55;
      c.fillStyle = '#bc91ff';
      c.beginPath();
      c.arc(x, y, 3, 0, 7);
      c.fill();
      c.fillStyle = '#60eaff';
      c.beginPath();
      c.arc(x2, y, 3, 0, 7);
      c.fill();
      if (i % 3 === 0) {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x2, y);
        c.stroke();
      }
    }
    c.fillStyle = '#a9edff';
    c.font = '23px monospace';
    c.fillText('CONNECTED CARE', 28, 505);
    c.fillRect(220, 540, 14, 60);
    c.fillRect(197, 563, 60, 14);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

export function dataConnections(): { group: T.Group; update: (time: number) => void } {
  const group = new T.Group();
  const curves: T.CatmullRomCurve3[] = [];
  const cyan = new T.MeshBasicMaterial({
    color: 0x21c9f3,
    transparent: true,
    opacity: 0.6,
    toneMapped: false,
  });
  const violet = new T.MeshBasicMaterial({
    color: 0x8b5cf6,
    transparent: true,
    opacity: 0.65,
    toneMapped: false,
  });
  for (let i = 0; i < 9; i++) {
    const offset = (i - 4) * 0.14;
    const curve = new T.CatmullRomCurve3([
      new T.Vector3(-3.7, 4.8 + offset, 0.2),
      new T.Vector3(-1.8, 5.3 + Math.sin(i) * 0.45, 0),
      new T.Vector3(0.4, 4.6 + offset, 0.6),
      new T.Vector3(3.1, 4.5 + offset, 3.1),
    ]);
    curves.push(curve);
    group.add(new T.Mesh(new T.TubeGeometry(curve, 64, 0.012, 4, false), i % 3 ? cyan : violet));
  }
  const dots = new T.InstancedMesh(
    new T.SphereGeometry(0.04, 8, 6),
    new T.MeshBasicMaterial({ color: 0xb2edff, toneMapped: false }),
    36,
  );
  dots.instanceMatrix.setUsage(T.DynamicDrawUsage);
  group.add(dots);
  const matrix = new T.Matrix4();
  const position = new T.Vector3();
  return {
    group,
    update(time) {
      for (let i = 0; i < 36; i++) {
        curves[i % 9]!.getPointAt((time * 0.13 + i / 36) % 1, position);
        matrix.makeTranslation(position);
        dots.setMatrixAt(i, matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
    },
  };
}

export function displayPlatform(): { group: T.Group; update: (time: number) => void } {
  const group = new T.Group();
  group.position.set(-6, 0, 0.5);
  const metal = new T.MeshStandardMaterial({ color: 0x102a46, metalness: 0.85, roughness: 0.2 });
  const light = new T.MeshBasicMaterial({ color: 0x21c9f3, toneMapped: false });
  const base = new T.Mesh(new T.CylinderGeometry(3.35, 3.65, 0.26, 96), metal);
  base.position.y = 0.13;
  group.add(base);
  const arcs = new T.Group();
  group.add(arcs);
  for (let i = 0; i < 4; i++) {
    const ring = new T.Mesh(new T.TorusGeometry(2.25 + i * 0.35, 0.018, 6, 96), light);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3 + i * 0.04;
    group.add(ring);
  }
  const volume = new T.Mesh(
    new T.CylinderGeometry(2.7, 2.7, 1.7, 64, 1, true),
    new T.MeshBasicMaterial({
      color: 0x21c9f3,
      transparent: true,
      opacity: 0.035,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  volume.position.y = 1.15;
  group.add(volume);
  for (let i = 0; i < 3; i++) {
    const ring = new T.Mesh(
      new T.TorusGeometry(2.8 + i * 0.15, 0.013, 4, 64, Math.PI * 1.3),
      light,
    );
    ring.rotation.set(Math.PI / 2, 0, i * 2);
    ring.position.y = 0.5 + i * 0.25;
    arcs.add(ring);
  }
  const beamMat = new T.MeshBasicMaterial({
    color: 0x21c9f3,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const beam = new T.Mesh(new T.CylinderGeometry(0.007, 0.007, 1.3 + (i % 4) * 0.12, 4), beamMat);
    beam.position.set(Math.cos(a) * 2.55, 1.05, Math.sin(a) * 2.55);
    group.add(beam);
  }
  return {
    group,
    update(t) {
      arcs.rotation.y = t * 0.12;
    },
  };
}
