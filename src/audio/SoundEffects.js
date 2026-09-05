/**
 * Procedural Web Audio API Sound Effects Engine
 * Generates realistic industrial audio without external audio dependencies.
 */

class SoundEffectsEngine {
  constructor() {
    this.ctx = null;
    this.humGain = null;
    this.humOsc1 = null;
    this.humOsc2 = null;
    this.isHumming = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // MCB Knob switch toggle
  playSwitchClick(pitch = 1.0) {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(120 * pitch, t + 0.04);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);

    // Mechanical snap resonance
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.02, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 * pitch;
    filter.Q.value = 3;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Heavy Industrial Contactor / Relay Thunk
  playContactorThunk() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Heavy low frequency impact
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.09);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.11);

    // High metal snap
    this.playSwitchClick(0.7);
  }

  // Electrical Arc Discharge Zap (during trip)
  playArcZap() {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // 50Hz / 100Hz Transformer Electromagnetic Hum
  startTransformerHum() {
    this.init();
    if (!this.ctx || this.isHumming) return;

    const t = this.ctx.currentTime;
    this.humOsc1 = this.ctx.createOscillator();
    this.humOsc2 = this.ctx.createOscillator();
    this.humGain = this.ctx.createGain();

    this.humOsc1.type = 'sawtooth';
    this.humOsc1.frequency.value = 50; // 50 Hz base mains
    this.humOsc2.type = 'sine';
    this.humOsc2.frequency.value = 100; // 100 Hz 2nd harmonic

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;

    this.humGain.gain.setValueAtTime(0.001, t);
    this.humGain.gain.linearRampToValueAtTime(0.12, t + 0.3);

    this.humOsc1.connect(filter);
    this.humOsc2.connect(filter);
    filter.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);

    this.humOsc1.start(t);
    this.humOsc2.start(t);
    this.isHumming = true;
  }

  stopTransformerHum() {
    if (!this.isHumming || !this.humGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.humGain.gain.linearRampToValueAtTime(0.001, t + 0.2);
    setTimeout(() => {
      try {
        if (this.humOsc1) this.humOsc1.stop();
        if (this.humOsc2) this.humOsc2.stop();
      } catch (e) {}
      this.isHumming = false;
    }, 250);
  }

  // Digital HMI Beep
  playBeep(freq = 1200) {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Emergency Stop Alarm chirp
  playAlarmChirp() {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.15);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
}

export const soundFx = new SoundEffectsEngine();
