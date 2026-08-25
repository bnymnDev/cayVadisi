// Prozedurale Sound-Engine (WebAudio): Meer, Wind, Regen, Möwen, UI
import { clamp, lerp } from './util.js';

export function createAudio() {
  let ac = null;
  let master = null;
  let sea = null, wind = null, rain = null;
  let engine = null;   // {osc, oscG, noise}
  let enabled = true;
  let started = false;
  let gullTimer = 6;

  function noiseBuffer(ac, seconds = 2, brown = false) {
    const len = Math.floor(ac.sampleRate * seconds);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
    return buf;
  }

  function loopNoise(brown, filterType, freq, q, gain0) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, 3, brown);
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = gain0;
    src.connect(f).connect(g).connect(master);
    src.start();
    return { src, f, g };
  }

  function ensure() {
    if (started || !enabled) return;
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);

    sea = loopNoise(true, 'lowpass', 420, 0.6, 0.0);
    // Wellen-LFO auf das Meer
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoG = ac.createGain(); lfoG.gain.value = 0.35;
    const seaBase = ac.createConstantSource(); seaBase.offset.value = 0.65;
    const seaAmp = ac.createGain(); seaAmp.gain.value = 0; // wird per Distanz gesetzt
    lfo.connect(lfoG); lfoG.connect(seaAmp.gain);
    seaBase.connect(seaAmp.gain);
    lfo.start(); seaBase.start();
    sea.g.gain.value = 1; // Pegel läuft über seaAmp
    sea.g.disconnect(); sea.g.connect(seaAmp).connect(master);
    sea.amp = seaAmp;

    wind = loopNoise(false, 'bandpass', 480, 0.45, 0.02);
    rain = loopNoise(false, 'highpass', 1600, 0.4, 0.0);

    started = true;
  }

  function blip(freq, dur, type = 'sine', gain = 0.2, when = 0) {
    if (!started) return;
    const o = ac.createOscillator();
    o.type = type; o.frequency.value = freq;
    const g = ac.createGain();
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noiseBurst(freq, q, dur, gain, when = 0) {
    if (!started) return;
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac, 0.4);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain();
    const t = ac.currentTime + when;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  return {
    ensure,
    get ctx() { return ac; },
    get masterNode() { return master; },
    setEnabled(v) {
      enabled = v;
      if (started && master) master.gain.value = v ? 0.9 : 0;
      if (v && !started) ensure();
      if (v && ac && ac.state === 'suspended') ac.resume();
    },

    update(dt, seaDist, windStrength, rainT, playerMoving, running) {
      if (!started) return;
      if (ac.state === 'suspended') return;
      // Meer: lauter nahe der Küste
      const seaVol = clamp(1 - (seaDist - 8) / 110, 0.06, 1) * 0.34;
      sea.amp.gain.setTargetAtTime(seaVol, ac.currentTime, 0.4);
      wind.g.gain.setTargetAtTime(0.015 + windStrength * 0.05, ac.currentTime, 0.6);
      rain.g.gain.setTargetAtTime(rainT * 0.16, ac.currentTime, 0.5);

      // Möwen gelegentlich, nahe Meer
      gullTimer -= dt;
      if (gullTimer <= 0) {
        gullTimer = 7 + Math.random() * 14;
        if (seaDist < 130 && Math.random() < 0.8) this.gull();
      }
    },

    gull() {
      if (!started) return;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f0 = 1150 + Math.random() * 250;
        const t = i * 0.28 + Math.random() * 0.08;
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        const g = ac.createGain();
        const f = ac.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 2.5;
        const t0 = ac.currentTime + t;
        o.frequency.setValueAtTime(f0, t0);
        o.frequency.exponentialRampToValueAtTime(f0 * 0.72, t0 + 0.22);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.045, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(f).connect(g).connect(master);
        o.start(t0); o.stop(t0 + 0.4);
      }
    },

    // ---- v2: Motor (läuft nur beim Fahren) ----
    engineStart() {
      if (!started) return;
      if (engine) return;
      const osc = ac.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = 42;
      const f = ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 1.2;
      const g = ac.createGain();
      g.gain.value = 0.0001;
      osc.connect(f).connect(g).connect(master);
      osc.start();
      engine = { osc, g, f };
    },
    engineStop() {
      if (!engine) return;
      engine.g.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15);
      const e = engine;
      setTimeout(() => { try { e.osc.stop(); } catch (err) {} }, 500);
      engine = null;
    },
    engineUpdate(throttle01, speedKmh) {
      if (!engine) return;
      const rpm = 40 + throttle01 * 120 + speedKmh * 0.8;
      engine.osc.frequency.setTargetAtTime(rpm, ac.currentTime, 0.08);
      engine.f.frequency.setTargetAtTime(260 + throttle01 * 500, ac.currentTime, 0.1);
      engine.g.gain.setTargetAtTime(0.03 + throttle01 * 0.05, ac.currentTime, 0.1);
    },

    // ---- v2: Tiere & Hof ----
    animal(type) {
      if (!started) return;
      if (type === 'cow') {
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        const f = ac.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 420;
        const g = ac.createGain();
        const t0 = ac.currentTime;
        o.frequency.setValueAtTime(95, t0);
        o.frequency.linearRampToValueAtTime(70, t0 + 0.7);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.07, t0 + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        o.connect(f).connect(g).connect(master);
        o.start(t0); o.stop(t0 + 1);
      } else if (type === 'sheep') {
        const o = ac.createOscillator();
        o.type = 'square';
        const g = ac.createGain();
        const t0 = ac.currentTime;
        o.frequency.setValueAtTime(220, t0);
        const lfo = ac.createOscillator();
        lfo.frequency.value = 9;
        const lg = ac.createGain(); lg.gain.value = 30;
        lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.035, t0 + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
        o.connect(g).connect(master);
        o.start(t0); lfo.start(t0);
        o.stop(t0 + 0.6); lfo.stop(t0 + 0.6);
      } else { // chicken
        for (let i = 0; i < 3; i++) {
          blip(880 + Math.random() * 200, 0.08, 'square', 0.03, i * 0.12);
        }
      }
    },
    harvest() { noiseBurst(1200, 0.8, 0.12, 0.14); blip(440, 0.12, 'triangle', 0.08, 0.05); },
    // v7: Kangal-Bellen — zwei kurze, tiefe "Woff"s
    bark() {
      if (!started) return;
      for (let i = 0; i < 2; i++) {
        const t0 = i * 0.22;
        blip(140 + Math.random() * 30, 0.14, 'sawtooth', 0.09, t0);
        noiseBurst(500, 0.9, 0.1, 0.1, t0 + 0.01);
      }
    },
    horn(kind = 'sedan') {
      if (!started) return;
      // Traktor tief und rau, Lux zweistimmig-edel, Rest klassisch
      if (kind === 'tractor') {
        blip(180, 0.5, 'square', 0.09);
      } else if (kind === 'lux') {
        blip(440, 0.35, 'square', 0.07);
        blip(554, 0.35, 'square', 0.07);
      } else {
        blip(370, 0.32, 'square', 0.08);
        blip(466, 0.32, 'square', 0.06);
      }
    },
    screech() { noiseBurst(2600, 2.2, 0.28, 0.09); },
    jet() { noiseBurst(300, 0.4, 2.2, 0.16); blip(90, 2.4, 'sawtooth', 0.05); },
    plant() { noiseBurst(500, 0.9, 0.15, 0.12); },
    cash() {
      blip(740, 0.1, 'sine', 0.14);
      blip(988, 0.16, 'sine', 0.14, 0.07);
      noiseBurst(7000, 1.5, 0.12, 0.08, 0.03);
    },
    tierUp() {
      blip(523, 0.14, 'sine', 0.15);
      blip(659, 0.14, 'sine', 0.15, 0.12);
      blip(784, 0.14, 'sine', 0.15, 0.24);
      blip(1047, 0.3, 'sine', 0.16, 0.36);
    },

    pickTick() { noiseBurst(2400, 1.2, 0.05, 0.10); },
    pickDone() {
      noiseBurst(1800, 0.8, 0.09, 0.16);
      noiseBurst(900, 0.9, 0.14, 0.12, 0.03);
      blip(520 + Math.random() * 120, 0.1, 'triangle', 0.05, 0.02);
    },
    step(run) { noiseBurst(300 + Math.random() * 120, 0.7, 0.07, run ? 0.055 : 0.04); },
    sell() {
      blip(660, 0.14, 'sine', 0.16);
      blip(880, 0.2, 'sine', 0.16, 0.09);
      noiseBurst(6800, 1.4, 0.14, 0.09, 0.05);
      noiseBurst(7600, 1.6, 0.1, 0.07, 0.16);
    },
    buy() { blip(520, 0.1, 'triangle', 0.14); blip(780, 0.16, 'triangle', 0.14, 0.08); },
    deny() { blip(210, 0.2, 'square', 0.06); },
    orderDone() { blip(587, 0.12, 'sine', 0.15); blip(740, 0.12, 'sine', 0.15, 0.1); blip(988, 0.24, 'sine', 0.16, 0.2); },
    thunderish() { noiseBurst(180, 0.5, 1.2, 0.2); },
    gondola() { blip(120, 2.0, 'sawtooth', 0.03); },
    sleep() { blip(392, 0.3, 'sine', 0.1); blip(262, 0.5, 'sine', 0.1, 0.25); }
  };
}
