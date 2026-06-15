const WASM_URL = '/pkg/waverider_audio_engine.wasm';

export class WaveriderAudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.wasm = null;
    this.isPlaying = false;
    this.bpm = 112;
    this.scheduler = null;
    this.nextTick = 0;
    this.tickIndex = 0;
    this.legatoVoices = new Map();
  }

  async boot() {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    this.master = this.context.createGain();
    this.master.gain.value = 0.82;
    this.master.connect(this.context.destination);
    await this.loadWasm();
    return this.wasm ? 'WebAssembly DSP online' : 'JavaScript fallback DSP online';
  }

  async loadWasm() {
    try {
      const response = await fetch(WASM_URL);
      if (!response.ok) return;
      const module = await WebAssembly.instantiateStreaming(response, {});
      this.wasm = module.instance.exports;
    } catch {
      this.wasm = null;
    }
  }

  async resume() {
    if (!this.context) await this.boot();
    if (this.context.state !== 'running') await this.context.resume();
  }

  setBpm(bpm) { this.bpm = Number(bpm); }

  start() {
    this.stop();
    this.isPlaying = true;
    this.nextTick = this.context.currentTime + 0.05;
    this.tickIndex = 0;
    this.scheduler = window.setInterval(() => this.schedule(), 25);
  }

  stop() {
    this.isPlaying = false;
    window.clearInterval(this.scheduler);
    this.scheduler = null;
  }

  schedule() {
    const secondsPerBeat = 60 / this.bpm;
    while (this.nextTick < this.context.currentTime + 0.15) {
      this.click(this.nextTick, this.tickIndex % 4 === 0);
      this.nextTick += secondsPerBeat;
      this.tickIndex += 1;
    }
  }

  click(time, accented) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = accented ? 1320 : 880;
    gain.gain.setValueAtTime(accented ? 0.1 : 0.055, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.04);
  }

  triggerInstrument(type, note, velocity = 0.85, legatoMs = 0) {
    if (type === 'drums') return this.triggerDrum(note, velocity);
    return this.triggerKeyboard(note, velocity, legatoMs);
  }

  triggerKeyboard(note, velocity = 0.85, legatoMs = 0) {
    const now = this.context.currentTime;
    const glide = Math.max(0.003, legatoMs / 1000);
    let voice = this.legatoVoices.get('keyboard');

    if (!voice || legatoMs === 0) {
      voice = this.createKeyboardVoice(now, velocity);
      this.legatoVoices.set('keyboard', voice);
    }

    voice.oscillator.frequency.cancelScheduledValues(now);
    voice.oscillator.frequency.setTargetAtTime(this.noteToFrequency(note), now, glide / 3);
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(velocity * 0.42, now, 0.012);
    voice.gain.gain.setTargetAtTime(0.0001, now + 0.62, 0.18);
    window.clearTimeout(voice.cleanup);
    voice.cleanup = window.setTimeout(() => {
      voice.oscillator.stop();
      this.legatoVoices.delete('keyboard');
    }, 1300);
  }

  createKeyboardVoice(time, velocity) {
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    oscillator.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, time);
    filter.Q.value = 4;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.setTargetAtTime(velocity * 0.42, time, 0.012);
    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(time);
    return { oscillator, gain, cleanup: null };
  }

  triggerDrum(note, velocity = 0.85) {
    const now = this.context.currentTime;
    if (note === 36) return this.kick(now, velocity);
    if (note === 38 || note === 39) return this.noiseHit(now, velocity, note === 39 ? 0.16 : 0.22, note === 39 ? 1800 : 900);
    if (note === 42 || note === 51) return this.noiseHit(now, velocity, note === 51 ? 0.42 : 0.08, note === 51 ? 5200 : 7600);
    return this.tom(now, velocity);
  }

  kick(time, velocity) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(130, time);
    oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
    gain.gain.setValueAtTime(velocity, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.36);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.38);
  }

  tom(time, velocity) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(190, time);
    oscillator.frequency.exponentialRampToValueAtTime(82, time + 0.24);
    gain.gain.setValueAtTime(velocity * 0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.34);
  }

  noiseHit(time, velocity, decay, cutoff) {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * decay, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
    const noise = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(velocity * 0.36, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start(time);
  }

  noteToFrequency(note) {
    if (this.wasm?.midi_note_to_hz) return this.wasm.midi_note_to_hz(note);
    return 440 * 2 ** ((note - 69) / 12);
  }
}
