// v15: der Falke von der Yayla — verletzt auf seinem Felsen gefunden,
// mit drei Hamsi aufgepäppelt. Zahm kreist er über dem Spieler und meldet
// alle zwei Spielstunden die Richtung zum nächsten Fund (Sammelkarte oder
// Dede-Erinnerung).
import * as THREE from 'three';
import { CFG } from './config.js';
import { state } from './state.js';

function buildFalconMesh() {
  const g = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0x6d5236, roughness: 0.9 });
  const light = new THREE.MeshStandardMaterial({ color: 0xcfc0a4, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 7), feather);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), light);
  head.position.set(0, 0.05, 0.32);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5),
    new THREE.MeshStandardMaterial({ color: 0xe3c24f, roughness: 0.5 }));
  beak.position.set(0, 0.03, 0.44);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), feather.clone());
    wing.material.side = THREE.DoubleSide;
    wing.position.set(s * 0.36, 0.04, 0);
    wing.rotation.y = s * 0.1;
    g.add(wing);
    wings.push(wing);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, wings };
}

export function createFalcon(ctx, terrain, player) {
  const { scene } = ctx;
  const F = CFG.falcon;
  const parts = buildFalconMesh();
  const perchY = terrain.heightAt(F.perch.x, F.perch.z);
  // Sitzfelsen
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7, 0),
    new THREE.MeshStandardMaterial({ color: 0x7d7a72, roughness: 0.95 }));
  rock.position.set(F.perch.x, perchY + 0.35, F.perch.z);
  rock.castShadow = true;
  scene.add(rock);
  parts.group.position.set(F.perch.x, perchY + 0.85, F.perch.z);
  scene.add(parts.group);

  let orbit = 0;

  return {
    nearPerch(px, pz) {
      return !state.falcon.tame && Math.hypot(px - F.perch.x, pz - F.perch.z) < CFG.interactDist + 2;
    },
    update(dt, elapsed) {
      const flap = Math.sin(elapsed * (state.falcon.tame ? 10 : 2)) * 0.6;
      parts.wings[0].rotation.z = flap;
      parts.wings[1].rotation.z = -flap;
      if (!state.falcon.tame) {
        // verletzt auf dem Felsen: sitzt, zuckt nur mit den Flügeln
        parts.group.rotation.y = Math.sin(elapsed * 0.4) * 0.6;
        return;
      }
      // zahm: kreist über dem Spieler
      orbit += dt * 0.9;
      const r = 5.5, h = 7.5 + Math.sin(elapsed * 0.7) * 1.2;
      const x = player.pos.x + Math.cos(orbit) * r;
      const z = player.pos.z + Math.sin(orbit) * r;
      parts.group.position.set(x, Math.max(player.pos.y + h, terrain.heightAt(x, z) + 3), z);
      parts.group.rotation.y = Math.atan2(-Math.sin(orbit), -Math.cos(orbit)) + Math.PI / 2;
    }
  };
}
