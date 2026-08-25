// Spieler-Avatar für die Third-Person-Ansicht (V) — mit Rollen-Outfits
import * as THREE from 'three';
import { state } from './state.js';
import { makeWorkerMesh, spawnPerson } from './workers.js';

const ROLE_STYLE = {
  farmer:   { hat: true,  shirtFromOutfit: true },
  worker:   { hat: true,  shirtFromOutfit: true, basket: true },
  jandarma: { hat: false, shirt: 0x2e4432 }
};

export function createAvatar(ctx, player, terrain, chars) {
  const { scene } = ctx;
  let parts = null;
  let phase = 0;

  function rebuild() {
    if (parts) scene.remove(parts.group);
    const style = ROLE_STYLE[state.role] || ROLE_STYLE.farmer;
    const shirt = style.shirtFromOutfit
      ? new THREE.Color(state.outfit || '#6a7ba0').getHex()
      : style.shirt;
    parts = spawnPerson(chars, 0, {
      shirt,
      hat: style.hat !== false,
      basket: !!style.basket,
      tex: state.role === 'jandarma' ? 4 : 1
    });
    // Jandarma: Schirmmütze
    if (state.role === 'jandarma') {
      const cap = new THREE.Group();
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.09, 10),
        new THREE.MeshStandardMaterial({ color: 0x27352a, roughness: 0.8 })
      );
      const brim = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x1c2620, roughness: 0.8 })
      );
      brim.position.set(0, -0.04, 0.2);
      cap.add(top, brim);
      if (parts.anim) parts.anim.attach('Head', cap, { x: 0, y: 0.12, z: 0 });
      else { cap.position.y = 1.6; parts.group.add(cap); }
    }
    parts.group.visible = false;
    scene.add(parts.group);
  }
  rebuild();

  return {
    rebuild,
    setVisible(v) { if (parts) parts.group.visible = v; },
    update(dt) {
      if (!parts || !parts.group.visible) return;
      const g = parts.group;
      g.position.set(player.pos.x, terrain.heightAt(player.pos.x, player.pos.z), player.pos.z);
      g.rotation.y = player.euler.y + Math.PI;
      if (parts.anim) {
        parts.anim.play(player.moving ? (player.running ? 'Run' : 'Walk') : 'Idle', 0.18);
        parts.anim.update(dt);
      } else if (player.moving) {
        phase += dt * (player.running ? 11 : 8);
        g.position.y += Math.abs(Math.sin(phase)) * 0.05;
        parts.armL.rotation.x = Math.sin(phase) * 0.55;
        parts.armR.rotation.x = -Math.sin(phase) * 0.55;
        parts.legL.rotation.x = -Math.sin(phase) * 0.6;
        parts.legR.rotation.x = Math.sin(phase) * 0.6;
      } else {
        parts.armL.rotation.x *= 0.85;
        parts.armR.rotation.x *= 0.85;
        parts.legL.rotation.x *= 0.85;
        parts.legR.rotation.x *= 0.85;
      }
    }
  };
}
