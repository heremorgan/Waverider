import { WaveriderAudioEngine } from './audio-engine.js';

const tracks = [
  { name: 'Sampler One', color: '#6ee7ff', volume: 86, clips: ['Intro groove', 'Verse chops'] },
  { name: 'Analog Bass', color: '#a78bfa', volume: 74, clips: ['Sub pattern'] },
  { name: 'Glass Keys', color: '#f9a8d4', volume: 68, clips: ['Hook progression', 'Bridge'] },
  { name: 'Atmosphere', color: '#86efac', volume: 58, clips: ['Wide texture'] }
];

const padNotes = [48, 50, 52, 53, 55, 57, 60, 64, 67, 69, 72, 76];
const engine = new WaveriderAudioEngine();
const status = document.querySelector('#engine-status');
const playToggle = document.querySelector('#play-toggle');
const stopButton = document.querySelector('#stop');
const bpm = document.querySelector('#bpm');
const metronome = document.querySelector('#metronome');
const meterFill = document.querySelector('#meter-fill');

function renderTracks() {
  const trackRoot = document.querySelector('#tracks');
  const mixerRoot = document.querySelector('#mixer');
  trackRoot.innerHTML = '';
  mixerRoot.innerHTML = '';

  tracks.forEach((track) => {
    const lane = document.createElement('article');
    lane.className = 'track-lane';
    lane.innerHTML = `
      <div class="track-title"><span style="--track-color:${track.color}"></span>${track.name}</div>
      <div class="clip-row">${track.clips.map((clip) => `<button class="clip">${clip}</button>`).join('')}</div>
    `;
    trackRoot.append(lane);

    const strip = document.createElement('article');
    strip.className = 'channel-strip';
    strip.innerHTML = `<strong>${track.name}</strong><input type="range" min="0" max="100" value="${track.volume}" /><small>${track.volume}%</small>`;
    mixerRoot.append(strip);
  });
}

function renderPads() {
  const pads = document.querySelector('#pads');
  padNotes.forEach((note, index) => {
    const pad = document.createElement('button');
    pad.className = 'pad';
    pad.type = 'button';
    pad.textContent = `Pad ${index + 1}\n${note}`;
    pad.addEventListener('click', () => trigger(note));
    pads.append(pad);
  });
}

async function ensureEngine() {
  await engine.resume();
  if (!status.dataset.ready) {
    status.textContent = engine.wasm ? 'WebAssembly DSP online' : 'JavaScript fallback DSP online';
    status.dataset.ready = 'true';
  }
}

async function trigger(note) {
  await ensureEngine();
  engine.triggerNote(note);
  meterFill.animate([{ transform: 'scaleY(0.25)' }, { transform: 'scaleY(1)' }, { transform: 'scaleY(0.35)' }], { duration: 220 });
}

playToggle.addEventListener('click', async () => {
  await ensureEngine();
  engine.setBpm(bpm.value);
  engine.setMetronome(metronome.checked);
  if (engine.isPlaying) {
    engine.stop();
    playToggle.textContent = 'Play';
    status.textContent = 'Stopped';
  } else {
    engine.start();
    playToggle.textContent = 'Pause';
    status.textContent = `Playing at ${engine.bpm} BPM`;
  }
});

stopButton.addEventListener('click', () => {
  engine.stop();
  playToggle.textContent = 'Play';
  status.textContent = 'Stopped';
});

bpm.addEventListener('input', () => engine.setBpm(bpm.value));
metronome.addEventListener('change', () => engine.setMetronome(metronome.checked));
document.querySelectorAll('.library-card').forEach((button) => button.addEventListener('click', () => trigger(Number(button.dataset.note))));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
}

renderTracks();
renderPads();
