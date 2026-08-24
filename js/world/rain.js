// Regen: instanzierte Tropfen-Streaks um die Kamera
import * as THREE from 'three';

const COUNT = 1400, RADIUS = 24, TOP = 16, SPEED = 19;

export function createRain(ctx) {
  const geo = new THREE.PlaneGeometry(0.014, 0.5);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xbfd4e2, transparent: true, opacity: 0.33,
    depthWrite: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 5;
  ctx.scene.add(mesh);

  const pos = new Float32Array(COUNT * 3);
  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();

  function respawn(i, cam) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * RADIUS;
    pos[i * 3] = cam.x + Math.cos(a) * r;
    pos[i * 3 + 1] = cam.y + 4 + Math.random() * TOP;
    pos[i * 3 + 2] = cam.z + Math.sin(a) * r;
  }

  let inited = false;

  return {
    update(dt, camPos, rainT) {
      const active = rainT > 0.02;
      mesh.visible = active;
      if (!active) { inited = false; return; }
      if (!inited) {
        for (let i = 0; i < COUNT; i++) {
          respawn(i, camPos);
          pos[i * 3 + 1] = camPos.y - 2 + Math.random() * (TOP + 6);
        }
        inited = true;
      }
      mesh.count = Math.max(40, Math.floor(COUNT * rainT));
      for (let i = 0; i < mesh.count; i++) {
        pos[i * 3 + 1] -= SPEED * dt;
        if (pos[i * 3 + 1] < camPos.y - 3) respawn(i, camPos);
        const dx = pos[i * 3] - camPos.x, dz = pos[i * 3 + 2] - camPos.z;
        if (dx * dx + dz * dz > RADIUS * RADIUS * 1.4) respawn(i, camPos);
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        m4.makeRotationY(Math.atan2(camPos.x - v.x, camPos.z - v.z));
        m4.setPosition(v);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
