/* ============================================================
   Tiny procedural audio engine — no samples, all synthesis.
   ============================================================ */
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.mode = null;
    this.ambientNodes = [];
    this.lastGrowl = 0;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 5;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(2);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
  }

  makeNoise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone({ freq = 220, freq2 = null, type = 'sine', dur = 0.2, vol = 0.2, attack = 0.005, pan = 0, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); node = p;
    }
    osc.connect(g); node.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, type = 'lowpass', freq = 1200, freq2 = null, q = 1, pan = 0, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq2), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); node = p;
    }
    src.connect(f); f.connect(g); node.connect(this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  /* ---------------- weapons ---------------- */
  shoot(kind = 'shotgun') {
    if (kind === 'shotgun') {
      this.noise({ dur: 0.34, vol: 0.55, type: 'lowpass', freq: 2600, freq2: 220, q: 0.8 });
      this.noise({ dur: 0.1, vol: 0.4, type: 'highpass', freq: 1800 });
      this.tone({ freq: 110, freq2: 38, type: 'sine', dur: 0.28, vol: 0.5 });
      this.tone({ freq: 58, freq2: 30, type: 'triangle', dur: 0.38, vol: 0.32 });
    } else if (kind === 'pistol') {
      this.noise({ dur: 0.12, vol: 0.32, type: 'bandpass', freq: 2200, q: 1.4 });
      this.tone({ freq: 240, freq2: 70, type: 'square', dur: 0.09, vol: 0.16 });
      this.tone({ freq: 90, freq2: 40, type: 'sine', dur: 0.16, vol: 0.28 });
    } else if (kind === 'chaingun') {
      this.noise({ dur: 0.09, vol: 0.26, type: 'bandpass', freq: 2600, q: 1 });
      this.tone({ freq: 160, freq2: 60, type: 'square', dur: 0.07, vol: 0.12 });
    }
  }

  empty() {
    this.tone({ freq: 320, freq2: 180, type: 'square', dur: 0.05, vol: 0.08 });
    this.tone({ freq: 140, type: 'square', dur: 0.03, vol: 0.05, delay: 0.06 });
  }

  reload() {
    this.noise({ dur: 0.06, vol: 0.14, type: 'highpass', freq: 3000 });
    this.tone({ freq: 420, type: 'square', dur: 0.03, vol: 0.05, delay: 0.1 });
  }

  /* ---------------- feedback ---------------- */
  hurtBig() {
    this.tone({ freq: 190, freq2: 55, type: 'sawtooth', dur: 0.4, vol: 0.3 });
    this.noise({ dur: 0.25, vol: 0.2, type: 'lowpass', freq: 700 });
  }
  playerHurt() {
    this.tone({ freq: 300, freq2: 120, type: 'square', dur: 0.18, vol: 0.16 });
    this.noise({ dur: 0.12, vol: 0.12, type: 'lowpass', freq: 900 });
  }
  enemyHurt(pan = 0) {
    this.tone({ freq: 240, freq2: 160, type: 'sawtooth', dur: 0.14, vol: 0.12, pan });
    this.noise({ dur: 0.1, vol: 0.1, type: 'bandpass', freq: 900, q: 2, pan });
  }
  enemyDie(pan = 0) {
    this.tone({ freq: 180, freq2: 42, type: 'sawtooth', dur: 0.55, vol: 0.18, pan });
    this.noise({ dur: 0.4, vol: 0.14, type: 'lowpass', freq: 800, freq2: 120, pan });
  }
  growl(pan = 0) {
    if (!this.ctx) return;
    const t = this.now();
    if (t - this.lastGrowl < 0.55) return;
    this.lastGrowl = t;
    this.tone({ freq: 70 + Math.random() * 30, freq2: 42, type: 'sawtooth', dur: 0.55, vol: 0.055, pan });
    this.noise({ dur: 0.4, vol: 0.03, type: 'lowpass', freq: 300, pan });
  }
  pickup() {
    this.tone({ freq: 660, type: 'sine', dur: 0.09, vol: 0.13 });
    this.tone({ freq: 990, type: 'sine', dur: 0.14, vol: 0.11, delay: 0.07 });
  }
  key() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.13, delay: i * 0.09 }));
    this.tone({ freq: 130, type: 'sine', dur: 1.2, vol: 0.12 });
  }
  door() {
    this.noise({ dur: 0.7, vol: 0.2, type: 'lowpass', freq: 500, freq2: 1600 });
    this.tone({ freq: 90, freq2: 140, type: 'sawtooth', dur: 0.7, vol: 0.05 });
  }
  locked() {
    this.tone({ freq: 180, type: 'square', dur: 0.08, vol: 0.12 });
    this.tone({ freq: 120, type: 'square', dur: 0.12, vol: 0.12, delay: 0.1 });
  }
  portal() {
    this.tone({ freq: 160, freq2: 640, type: 'sine', dur: 0.8, vol: 0.16 });
    this.tone({ freq: 240, freq2: 960, type: 'triangle', dur: 0.8, vol: 0.08, delay: 0.05 });
    this.noise({ dur: 0.7, vol: 0.1, type: 'bandpass', freq: 800, freq2: 3000, q: 2 });
  }
  ui() {
    this.tone({ freq: 520, type: 'square', dur: 0.035, vol: 0.05 });
  }
  clear() {
    [262, 330, 392, 523].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 1.0, vol: 0.12, delay: i * 0.12 }));
    this.tone({ freq: 65, type: 'sine', dur: 1.4, vol: 0.16 });
  }
  death() {
    this.tone({ freq: 130, freq2: 45, type: 'sawtooth', dur: 1.6, vol: 0.24 });
    this.tone({ freq: 65, freq2: 30, type: 'triangle', dur: 2.0, vol: 0.2 });
    this.noise({ dur: 1.4, vol: 0.08, type: 'lowpass', freq: 400, freq2: 80 });
  }

  /* ---------------- ambience ---------------- */
  startAmbient(mode = 'neighborhood') {
    if (!this.ctx) return;
    if (this.mode === mode) return;
    this.stopAmbient();
    this.mode = mode;
    const bus = this.ctx.createGain();
    bus.gain.value = 0.0001;
    bus.connect(this.master);
    bus.gain.setTargetAtTime(mode === 'level' ? 0.32 : 0.26, this.ctx.currentTime, 1.2);
    const nodes = [bus];

    const drone = (freq, type, gain, detune = 0) => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      g.gain.value = gain;
      o.connect(g); g.connect(bus); o.start();
      nodes.push(o, g);
      return o;
    };

    if (mode === 'neighborhood') {
      drone(110, 'sine', 0.05, -6);
      drone(164.8, 'sine', 0.035, 5);
      drone(220, 'triangle', 0.018, 8);
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 0.07; lg.gain.value = 0.012;
      lfo.connect(lg); lg.connect(bus); lfo.start();
      nodes.push(lfo, lg);
      // soft wind
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 340;
      const g = this.ctx.createGain(); g.gain.value = 0.045;
      src.connect(f); f.connect(g); g.connect(bus); src.start();
      nodes.push(src, f, g);
    } else {
      drone(55, 'sine', 0.11, -4);
      drone(82.4, 'sine', 0.05, 7);
      drone(110, 'triangle', 0.022, -9);
      const beat = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      beat.type = 'sine'; beat.frequency.value = 46;
      bg.gain.value = 0.0001;
      beat.connect(bg); bg.connect(bus); beat.start();
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.frequency.value = 0.55; lg.gain.value = 0.055;
      lfo.connect(lg); lg.connect(bg.gain); lfo.start();
      nodes.push(beat, bg, lfo, lg);
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = this.ctx.createGain(); g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(bus); src.start();
      nodes.push(src, f, g);
    }
    this.ambientNodes = nodes;
    this.ambientBus = bus;
  }

  stopAmbient() {
    if (!this.ambientBus) return;
    const bus = this.ambientBus;
    bus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    const nodes = this.ambientNodes;
    setTimeout(() => {
      for (const n of nodes) { try { n.stop && n.stop(); } catch {} try { n.disconnect && n.disconnect(); } catch {} }
      try { bus.disconnect(); } catch {}
    }, 900);
    this.ambientBus = null;
    this.ambientNodes = [];
    this.mode = null;
  }
}
