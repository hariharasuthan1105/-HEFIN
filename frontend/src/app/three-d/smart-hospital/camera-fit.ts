import { Box3, PerspectiveCamera, Quaternion, Vector3 } from 'three';

export function boxCorners(bounds: Box3): Vector3[] {
  const points: Vector3[] = [];
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) points.push(new Vector3(x, y, z));
  return points;
}

/** Exact perspective constraints for all eight corners, with a screen-space margin.
 * In camera coordinates depth = distance - corner.z. Thus each corner needs
 * distance >= corner.z + padding * abs(corner.x/y) / tan(horizontal/vertical FOV / 2).
 * Keep the original distance when it already fits, preserving desktop composition.
 */
export function fitCameraToBounds(
  camera: PerspectiveCamera,
  corners: readonly Vector3[],
  target: Vector3,
  direction: Vector3,
  minimumDistance: number,
  padding = 1.12,
): number {
  const unit = direction.clone().normalize();
  camera.position.copy(target).add(unit);
  camera.lookAt(target);
  const inverse = new Quaternion().copy(camera.quaternion).invert();
  const tanVertical = Math.tan((camera.fov * Math.PI) / 360);
  const tanHorizontal = tanVertical * camera.aspect;
  let distance = minimumDistance;
  for (const point of corners) {
    const local = point.clone().sub(target).applyQuaternion(inverse);
    distance = Math.max(
      distance,
      local.z + (padding * Math.abs(local.x)) / tanHorizontal,
      local.z + (padding * Math.abs(local.y)) / tanVertical,
    );
  }
  camera.position.copy(target).addScaledVector(unit, distance);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return distance;
}
