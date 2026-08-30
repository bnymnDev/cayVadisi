// v23: Jahreszeiten-Feste am Festplatz der Kasaba — je Saison ein eigenes
// Fest am 3. Saisontag: Herbst-Erntedank (Altar mit Kürbissen und Mais),
// Winter-Schneefest (Schneemann in drei sichtbaren Etappen bauen),
// Frühlings-Hıdırellez (Feuer zum Drüberspringen). Der Sommer hat bereits
// das große Çay-Festivali.
import * as THREE from 'three';
import { CFG } from '../config.js';
import { state, seasonOf } from '../state.js';

export function createSeasonFest(ctx, terrain) {
  const { scene } = ctx;
  const S = CFG.seasonFest.spot;
  const gy = terrain.heightAt(S.x, S.z);

  // ---- Herbst: Erntedank-Altar ----
  const autumn = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x8a6238, roughness: 0.9 }));
  table.position.y = 0.4;
  autumn.add(table);
  for (let i = 0; i < 4; i++) {
    const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.7 }));
    pumpkin.scale.y = 0.8;
    pumpkin.position.set(-0.9 + i * 0.6, 0.95, (i % 2 ? 0.25 : -0.2));
    autumn.add(pumpkin);
  }
  for (let i = 0; i < 3; i++) {
    const corn = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0xe3c24f, roughness: 0.8 }));
    corn.rotation.z = 0.5 + i * 0.4;
    corn.position.set(0.4 + i * 0.25, 0.92, 0.35);
    autumn.add(corn);
  }

  // ---- Winter: Schneemann (3 Kugeln nacheinander) ----
  const winter = new THREE.Group();
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.9 });
  const balls = [];
  const sizes = [0.7, 0.5, 0.35];
  let hh = 0;
  for (let i = 0; i < 3; i++) {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(sizes[i], 10, 8), snowMat);
    hh += sizes[i] * (i ? 1.5 : 1);
    ball.position.y = hh;
    winter.add(ball);
    balls.push(ball);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 6),
    new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.6 }));
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, hh, 0.4);
  winter.add(nose);

  // ---- Frühling: Hıdırellez-Feuer ----
  const spring = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 5),
      new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 1 }));
    log.rotation.z = 0.9;
    log.rotation.y = (i / 5) * Math.PI * 2;
    log.position.y = 0.3;
    spring.add(log);
  }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 7),
    new THREE.MeshBasicMaterial({ color: 0xf2913a, transparent: true, opacity: 0.9 }));
  fire.position.y = 0.9;
  spring.add(fire);
  const fireLight = new THREE.PointLight(0xf2913a, 0, 12, 2);
  fireLight.position.y = 1.2;
  spring.add(fireLight);

  for (const grp of [autumn, winter, spring]) {
    grp.position.set(S.x, gy, S.z);
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    grp.visible = false;
    scene.add(grp);
  }

  function festToday() {
    if ((state.day - 1) % CFG.seasonDays !== CFG.seasonFest.dayInSeason) return null;
    const sIdx = seasonOf(state.day, CFG);
    return sIdx === 1 ? 'erntedank' : sIdx === 2 ? 'schneefest' : sIdx === 3 ? 'hidirellez' : null;
  }

  return {
    festToday,
    near(px, pz) { return Math.hypot(px - S.x, pz - S.z) < CFG.interactDist + 3; },
    update(dt, elapsed, night) {
      const fest = festToday();
      autumn.visible = fest === 'erntedank';
      winter.visible = fest === 'schneefest';
      spring.visible = fest === 'hidirellez';
      if (winter.visible) {
        for (let i = 0; i < balls.length; i++) balls[i].visible = i < state.snowman;
        nose.visible = state.snowman >= 3;
      }
      if (spring.visible) {
        fire.scale.y = 1 + Math.sin(elapsed * 10) * 0.18;
        fireLight.intensity = night ? 2 + Math.sin(elapsed * 8) * 0.5 : 0.8;
      }
    }
  };
}
