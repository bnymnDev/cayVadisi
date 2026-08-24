// Blättchen-Partikel beim Pflücken (Pool)
import * as THREE from 'three';

const MAX = 240;

export function createParticles(ctx, atlasUrl) {
  const tl = new THREE.TextureLoader(ctx.loadingManager);
  const atlas = tl.load(atlasUrl);
  atlas.colorSpace = THREE.SRGBColorSpace;

  const geo = new THREE.PlaneGeometry(0.10, 0.08);
  // UV auf die Trieb-Zelle (unten rechts)
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, 0.5 + uv.getX(i) * 0.5, uv.getY(i) * 0.5);
  }
  const mat = new THREE.MeshStandardMaterial({
    map: atlas, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.7
  });
  const mesh = new THREE.InstancedMesh(geo, mat, MAX);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  ctx.scene.add(mesh);

  const parts = [];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();

  return {
    burst(pos, n = 12, toward = null) {
      for (let i = 0; i < n && parts.length < MAX; i++) {
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 2
        );
        if (toward) {
          dir.add(toward.clone().sub(pos).normalize().multiplyScalar(1.2));
        }
        parts.push({
          p: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.3, (Math.random() - 0.5) * 0.5)),
          v: dir,
          rot: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          rv: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
          life: 0.9 + Math.random() * 0.35
        });
      }
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const pt = parts[i];
        pt.life -= dt;
        if (pt.life <= 0) { parts.splice(i, 1); continue; }
        pt.v.y -= 4.5 * dt;
        pt.v.multiplyScalar(1 - dt * 1.6);
        pt.p.addScaledVector(pt.v, dt);
        pt.rot.addScaledVector(pt.rv, dt);
      }
      mesh.count = parts.length;
      for (let i = 0; i < parts.length; i++) {
        const pt = parts[i];
        e.set(pt.rot.x, pt.rot.y, pt.rot.z);
        q.setFromEuler(e);
        const sc = Math.min(1, pt.life * 2.2);
        s.set(sc, sc, sc);
        m4.compose(pt.p, q, s);
        mesh.setMatrixAt(i, m4);
      }
      if (parts.length) mesh.instanceMatrix.needsUpdate = true;
    }
  };
}
