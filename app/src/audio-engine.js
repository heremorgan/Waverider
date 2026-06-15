const WASM_URL = '/pkg/waverider_audio_engine.wasm';

export class WaveriderAudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.wasm = null;
    this.isPlaying = false;
    this.bpm = 128;
    this.metronomeEnabled = true;
    this.scheduler = null;
    this.nextTick = 0;
    this.tickIndex = 0;
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

  setBpm(bpm) {
    this.bpm = Number(bpm);
  }

  setMetronome(enabled) {
    this.metronomeEnabled = enabled;
  }

  start() {
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
      if (this.metronomeEnabled) this.click(this.nextTick, this.tickIndex % 4 === 0);
      this.nextTick += secondsPerBeat / 2;
      this.tickIndex += 1;
    }
  }

  click(time, accented) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.frequency.value = accented ? 1320 : 880;
    gain.gain.setValueAtTime(accented ? 0.12 : 0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }

  triggerNote(note, velocity = 0.85) {
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const frequency = this.noteToFrequency(note);

    oscillator.type = note < 50 ? 'triangle' : 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, now);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(note < 50 ? 180 : 2400, now);
    filter.Q.value = 6;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(velocity, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (note < 50 ? 0.35 : 0.9));

    oscillator.connect(filter).connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + 1);
  }

  noteToFrequency(note) {
    if (this.wasm?.midi_note_to_hz) return this.wasm.midi_note_to_hz(note);
    return 440 * 2 ** ((note - 69) / 12);
  }
}
