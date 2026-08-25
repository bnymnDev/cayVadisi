// Minimap: gebackene Gelände-Übersicht + lebende Marker (Spieler, Arbeiter, Fahrzeuge)
import { CFG } from './config.js';
import { state } from './state.js';
import { clamp } from './util.js';

const MAP_PX = 168;         // Anzeigegröße (CSS skaliert mit)
const BAKE_PX = 168;        // Auflösung der Gelände-Textur

export function createMinimap(ctx, terrain, player, getWorkers, getVehicles) {
  const el = document.getElementById('minimap');
  const cv = document.getElementById('minimap-canvas');
  cv.width = MAP_PX; cv.height = MAP_PX;
  const g = cv.getContext('2d');

  const W = CFG.worldSize;                  // Welt: [-W/2, W/2]
  const toMap = (x, z) => [
    (x / W + 0.5) * MAP_PX,
    (z / W + 0.5) * MAP_PX
  ];

  // ---- Hintergrund einmalig backen ----
  const bg = document.createElement('canvas');
  bg.width = bg.height = BAKE_PX;
  {
    const bgg = bg.getContext('2d');
    const img = bgg.createImageData(BAKE_PX, BAKE_PX);
    for (let py = 0; py < BAKE_PX; py++) {
      for (let px = 0; px < BAKE_PX; px++) {
        const x = (px / BAKE_PX - 0.5) * W;
        const z = (py / BAKE_PX - 0.5) * W;
        const h = terrain.heightAt(x, z);
        let r, gg, b;
        if (h < 0.35) {                       // Meer
          const d = clamp(-h / 8, 0, 1);
          r = 38 - d * 14; gg = 82 - d * 26; b = 112 - d * 30;
        } else if (terrain.pathWeight(x, z) > 0.45) {
          r = 121; gg = 96; b = 66;           // Weg/Straße
        } else if (terrain.fieldMask(x, z) > 0.55) {
          r = 46; gg = 92; b = 40;            // Teefeld
        } else {
          const t = clamp(h / 42, 0, 1);      // Wiese -> Berg
          r = 74 + t * 66; gg = 108 + t * 34; b = 58 + t * 44;
        }
        const i = (py * BAKE_PX + px) * 4;
        img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
      }
    }
    bgg.putImageData(img, 0, 0);
  }

  // Feste Orte
  const POIS = [
    { x: CFG.hut.x, z: CFG.hut.z, icon: '⚖' },
    { x: CFG.home.x, z: CFG.home.z, icon: '🏠' },
    { x: CFG.farm.barn.x, z: CFG.farm.barn.z, icon: '🐄' },
    { x: CFG.city.market.x, z: CFG.city.market.z, icon: '🏪' },
    { x: CFG.city.dealer.x, z: CFG.city.dealer.z, icon: '🚗' }
  ];

  let visible = true;
  let accum = 0;

  function draw() {
    g.clearRect(0, 0, MAP_PX, MAP_PX);
    g.save();
    // runde Maske
    g.beginPath();
    g.arc(MAP_PX / 2, MAP_PX / 2, MAP_PX / 2 - 1, 0, Math.PI * 2);
    g.clip();
    g.drawImage(bg, 0, 0, MAP_PX, MAP_PX);

    // POIs
    g.font = '11px serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of POIS) {
      const [mx, my] = toMap(p.x, p.z);
      g.fillText(p.icon, mx, my);
    }

    // Arbeiter (kleine helle Punkte)
    const workers = getWorkers();
    if (workers) {
      g.fillStyle = 'rgba(244,239,228,0.95)';
      for (const w of workers) {
        const [mx, my] = toMap(w.x, w.z);
        g.beginPath();
        g.arc(mx, my, 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }

    // Fahrzeuge (goldene Rechtecke)
    const fleet = getVehicles();
    if (fleet) {
      g.fillStyle = 'rgba(216,165,49,0.95)';
      for (const f of Object.values(fleet)) {
        const [mx, my] = toMap(f.x, f.z);
        g.fillRect(mx - 2, my - 1.4, 4, 2.8);
      }
    }

    // Spieler-Pfeil (zeigt Blickrichtung)
    {
      const [mx, my] = toMap(player.pos.x, player.pos.z);
      const yaw = player.euler.y;
      g.save();
      g.translate(mx, my);
      g.rotate(-yaw);
      g.fillStyle = '#fff';
      g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, -5.5);
      g.lineTo(3.6, 4.2);
      g.lineTo(0, 2.2);
      g.lineTo(-3.6, 4.2);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }
    g.restore();
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
      visible = !visible;
      el.classList.toggle('hidden', !visible);
    }
  });

  draw();
  return {
    update(dt) {
      if (!visible) return;
      accum += dt;
      if (accum < 0.2) return;   // 5 Hz reicht
      accum = 0;
      draw();
    },
    show(v) { visible = v; el.classList.toggle('hidden', !v); }
  };
}
