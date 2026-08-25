// PIN-Gate für öffentlich erreichbare Deployments (z. B. Subdomain auf nesbun.de).
// Hinweis: Das ist ein SOFT-Schutz gegen zufällige Besucher — die Spieldateien
// selbst bleiben abrufbar. Echte Auth ginge nur serverseitig (z. B. Basic Auth).
// PIN ändern: neuen Hash erzeugen mit
//   await crypto.subtle.digest('SHA-256', new TextEncoder().encode('meinpin'))
// (Hex) und unten eintragen. Aktueller PIN: cay1453
const PIN_HASH = 'a32ed549575cd45820975b79bd3aaabadb9618768825c7d37312b29b470f6a84';
const GATE_ON_HOSTS = /\.github\.io$|(^|\.)nesbun\.de$/;   // localhost bleibt offen

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function initGate() {
  if (!GATE_ON_HOSTS.test(location.hostname)) return;
  try { if (sessionStorage.getItem('cv_gate') === 'ok') return; } catch (e) { /* egal */ }

  const wrap = document.createElement('div');
  wrap.id = 'gate';
  wrap.innerHTML = `
    <div class="gate-card">
      <div style="font-size:44px">🍃</div>
      <h2>Çay Vadisi</h2>
      <p>Privater Zugang — bitte Code eingeben<br><small>Özel erişim · Private access</small></p>
      <input id="gate-pin" type="password" inputmode="text" autocomplete="off" placeholder="Code">
      <button id="gate-btn">Enter</button>
      <p id="gate-err" style="color:#e08d7f;min-height:1.2em"></p>
    </div>`;
  document.body.appendChild(wrap);

  const tryPin = async () => {
    const val = document.getElementById('gate-pin').value.trim();
    if (await sha256Hex(val) === PIN_HASH) {
      try { sessionStorage.setItem('cv_gate', 'ok'); } catch (e) { /* egal */ }
      wrap.remove();
    } else {
      document.getElementById('gate-err').textContent = '✗';
      document.getElementById('gate-pin').value = '';
    }
  };
  document.getElementById('gate-btn').addEventListener('click', tryPin);
  document.getElementById('gate-pin').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryPin();
    e.stopPropagation();   // Spiel-Hotkeys nicht auslösen
  });
  setTimeout(() => document.getElementById('gate-pin').focus(), 100);
}
