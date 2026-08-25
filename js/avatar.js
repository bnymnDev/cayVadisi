// Spieler-Avatar für die Third-Person-Ansicht (V) — mit Rollen-Outfits
import * as THREE from 'three';
import { state } from './state.js';
import { makeWorkerMesh } from './workers.js';

const ROLE_STYLE = {
  farmer:   { hat: true,  shirtFromOutfit: true },
  worker:   { hat: true,  shirtFromOutfit: true, basket: true },
  jandarma: { hat: false, shirt: 0x2e4432 }
};

export function createAvatar(ctx, player, terrain) {
  const { scene } = ctx;
  let parts = null;
  let phase = 0;

  function rebuild() {
    if (parts) scene.remove(parts.group);
    const style = ROLE_STYLE[state.role] || ROLE_STYLE.farmer;
    const shirt = style.shirtFromOutfit
      ? new THREE.Color(state.outfit || '#6a7ba0').getHex()
      : style.shirt;
    parts = makeWorkerMesh(0, {
      shirt,
      hat: style.hat !== false,
      basket: !!style.basket
    });
    // Jandarma: Schirmmütze
    if (state.role === 'jandarma') {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.09, 10),
        new THREE.MeshStandardMaterial({ color: 0x27352a, roughness: 0.8 })
      );
      cap.position.y = 1.6;
      const brim = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x1c2620, roughness: 0.8 })
      );
      brim.position.set(0, 1.56, 0.2);
      parts.group.add(cap, brim);
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
      if (player.moving) {
        phase += dt * (player.running ? 11 : 8);
        g.position.y += Math.abs(Math.sin(phase)) * 0.05;
        parts.armL.rotation.x = Math.sin(phase) * 0.55;
        parts.armR.rotation.x = -Math.sin(phase) * 0.55;
        if (parts.legL) {
          parts.legL.rotation.x = -Math.sin(phase) * 0.6;
          parts.legR.rotation.x = Math.sin(phase) * 0.6;
        }
      } else {
        parts.armL.rotation.x *= 0.85;
        parts.armR.rotation.x *= 0.85;
        if (parts.legL) { parts.legL.rotation.x *= 0.85; parts.legR.rotation.x *= 0.85; }
      }
    }
  };
}
