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
  const _snowScale = new THREE.Vector3(4.5, 0.11, 4.5);

  function respawn(i, cam) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * RADIUS;
    pos[i * 3] = cam.x + Math.cos(a) * r;
    pos[i * 3 + 1] = cam.y + 4 + Math.random() * TOP;
    pos[i * 3 + 2] = cam.z + Math.sin(a) * r;
  }

  let inited = false;

  return {
    // snowT > 0: Flocken statt Tropfen (Winter)
    update(dt, camPos, rainT, snowT = 0) {
      const snow = snowT > 0.02;
      const t = snow ? snowT : rainT;
      // Erscheinungsbild umschalten
      if (snow && !mesh.userData.snow) {
        mesh.userData.snow = true;
        mat.color.setHex(0xffffff);
        mat.opacity = 0.8;
      } else if (!snow && mesh.userData.snow) {
        mesh.userData.snow = false;
        mat.color.setHex(0xbfd4e2);
        mat.opacity = 0.33;
      }
      const speed = snow ? 2.6 : SPEED;
      const active = t > 0.02;
      mesh.visible = active;
      if (!active) { inited = false; return; }
      if (!inited) {
        for (let i = 0; i < COUNT; i++) {
          respawn(i, camPos);
          pos[i * 3 + 1] = camPos.y - 2 + Math.random() * (TOP + 6);
        }
        inited = true;
      }
      mesh.count = Math.max(40, Math.floor(COUNT * t));
      for (let i = 0; i < mesh.count; i++) {
        pos[i * 3 + 1] -= speed * dt;
        if (pos[i * 3 + 1] < camPos.y - 3) respawn(i, camPos);
        const dx = pos[i * 3] - camPos.x, dz = pos[i * 3 + 2] - camPos.z;
        if (dx * dx + dz * dz > RADIUS * RADIUS * 1.4) respawn(i, camPos);
        v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
        if (snow) v.x += Math.sin(pos[i * 3 + 1] * 1.7 + i) * 0.15;   // Flocken taumeln
        m4.makeRotationY(Math.atan2(camPos.x - v.x, camPos.z - v.z));
        if (snow) m4.scale(_snowScale);                                // Streak -> Flöckchen
        m4.setPosition(v);
        mesh.setMatrixAt(i, m4);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
