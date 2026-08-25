// v6: Autoradio — prozedural erzeugte Musik im Karadeniz-Stil (WebAudio, keine Dateien)
// Sender: Radyo Karadeniz (Kemençe, schnell), Arabesk FM (langsam, moll), Aus.

export function createRadio(audioCtxGetter) {
  let station = 0;                 // 0 = aus, 1 = Karadeniz, 2 = Arabesk
  let nodes = null;                // {gain, timer}
  let nextNote = 0;
  let step = 0;

  // Hicaz-artige Skala (Halbton-Offsets ab Grundton)
  const SCALE_KARADENIZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
  const SCALE_ARABESK = [0, 2, 3, 5, 7, 8, 11, 12];

  function ensureNodes(ac, master) {
    if (nodes) return nodes;
    const gain = ac.createGain();
    gain.gain.value = 0.0;
    // leichtes "Radio"-Bandpass-Gefühl
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.35;
    gain.connect(bp).connect(master);
    nodes = { gain, bp };
    return nodes;
  }

  function note(ac, out, freq, t0, dur, gainV, type = 'sawtooth', vibrato = 0) {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (vibrato > 0) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = 7;
      const lg = ac.createGain();
      lg.gain.value = freq * vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t0); lfo.stop(t0 + dur);
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gainV, t0 + 0.015);
    g.gain.setValueAtTime(gainV, t0 + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(out);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function drum(ac, out, t0, low) {
    const o = ac.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(low ? 130 : 240, t0);
    o.frequency.exponentialRampToValueAtTime(45, t0 + 0.1);
    const g = ac.createGain();
    g.gain.setValueAtTime(low ? 0.16 : 0.09, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    o.connect(g).connect(out);
    o.start(t0); o.stop(t0 + 0.2);
  }

  // Melodie-Generator: schrittweise Bewegung mit Ornamenten
  let degree = 4;
  function scheduleBar(ac) {
    const out = nodes.gain;
    const kara = station === 1;
    const scale = kara ? SCALE_KARADENIZ : SCALE_ARABESK;
    const base = kara ? 392 : 220;             // G4 / A3
    const beat = kara ? 0.16 : 0.32;           // Tempo
    const t0 = Math.max(ac.currentTime + 0.05, nextNote);
    const steps = kara ? 8 : 4;
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * beat;
      // 7/8-Gefühl für Karadeniz: jede 4. Zählzeit verkürzt
      const swing = kara && i % 4 === 3 ? beat * 0.5 : beat;
      // Melodieschritt
      degree += Math.floor(Math.random() * 5) - 2;
      degree = Math.max(0, Math.min(scale.length - 1, degree));
      const freq = base * Math.pow(2, scale[degree] / 12);
      note(ac, out, freq, t, swing * (kara ? 1.05 : 1.8), kara ? 0.05 : 0.055,
        'sawtooth', kara ? 0.012 : 0.02);
      // Kemençe-Ornament: schnelle Nebennote
      if (kara && Math.random() < 0.45) {
        const orn = base * Math.pow(2, scale[Math.min(degree + 1, scale.length - 1)] / 12);
        note(ac, out, orn, t + swing * 0.5, swing * 0.35, 0.03, 'sawtooth', 0.012);
      }
      // Percussion
      if (i % 2 === 0) drum(ac, out, t, i % 4 === 0);
      // Bordun
      if (i === 0) note(ac, out, base / 2, t, steps * beat, 0.028, 'triangle');
    }
    nextNote = t0 + steps * beat;
    step++;
  }

  return {
    get station() { return station; },
    stationName() { return station === 1 ? 'Radyo Karadeniz 🎻' : station === 2 ? 'Arabesk FM 🌙' : null; },

    next(ac, master) {
      station = (station + 1) % 3;
      if (station === 0 && nodes) nodes.gain.gain.setTargetAtTime(0, ac.currentTime, 0.2);
      if (station > 0) {
        ensureNodes(ac, master);
        nodes.gain.gain.setTargetAtTime(0.9, ac.currentTime, 0.2);
        nextNote = 0;
      }
      return station;
    },

    off(ac) {
      station = 0;
      if (nodes && ac) nodes.gain.gain.setTargetAtTime(0, ac.currentTime, 0.3);
    },

    update(ac) {
      if (station === 0 || !ac || !nodes) return;
      if (ac.currentTime > nextNote - 0.4) scheduleBar(ac);
    }
  };
}
