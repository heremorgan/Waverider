import { WaveriderAudioEngine } from './audio-engine.js';
import { createStarterProject, loadProjects, saveProjects } from './project-store.js';

const noteNames = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

const drumPads = [
  { label: 'Kick', note: 36, key: 'A' },
  { label: 'Snare', note: 38, key: 'S' },
  { label: 'Hat', note: 42, key: 'D' },
  { label: 'Clap', note: 39, key: 'F' },
  { label: 'Tom', note: 45, key: 'G' },
  { label: 'Ride', note: 51, key: 'H' }
];
const keyboardNotes = [60, 62, 64, 65, 67, 69, 71, 72];

const engine = new WaveriderAudioEngine();
const state = { projects: loadProjects(), activeId: null, selectedInstrumentId: null };
state.activeId = state.projects[0]?.id ?? createProject().id;
state.selectedInstrumentId = activeProject().instruments[0]?.id;

const $ = (selector) => document.querySelector(selector);
const refs = {
  status: $('#engine-status'), play: $('#play-toggle'), stop: $('#stop'), bpm: $('#bpm'), newProject: $('#new-project'),
  projectName: $('#project-name'), projectList: $('#project-list'), instrumentList: $('#instrument-list'), tracks: $('#tracks'),
  mixer: $('#mixer'), pads: $('#pads'), keys: $('#keys'), legato: $('#legato'), legatoValue: $('#legato-value'), meter: $('#meter-fill')
};

function persistProjects() { saveProjects(state.projects); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function activeProject() { return state.projects.find((project) => project.id === state.activeId); }
function selectedInstrument() { return activeProject().instruments.find((instrument) => instrument.id === state.selectedInstrumentId); }
function createProject() { const project = createStarterProject(); state.projects.unshift(project); persistProjects(); return project; }
function noteLabel(note) { return `${noteNames[note % 12]}${Math.floor(note / 12) - 1}`; }

async function ensureEngine() {
  await engine.resume();
  if (!refs.status.dataset.ready) refs.status.dataset.ready = 'true';
  refs.status.textContent = engine.wasm ? 'WASM audio ready' : 'JS audio ready';
}

async function trigger(note, type = selectedInstrument()?.type ?? 'keyboard') {
  await ensureEngine();
  engine.triggerInstrument(type, note, 0.86, selectedInstrument()?.legato ?? 0);
  refs.meter.animate([{ transform: 'scaleY(.22)' }, { transform: 'scaleY(1)' }, { transform: 'scaleY(.36)' }], { duration: 240 });
}

function render() {
  const project = activeProject();
  refs.projectName.value = project.name;
  refs.bpm.value = project.bpm;
  renderProjects(); renderInstruments(); renderArrangement(); renderMixer(); renderPlayable();
}

function renderProjects() {
  refs.projectList.innerHTML = state.projects.map((project) => `
    <button class="project-pill ${project.id === state.activeId ? 'active' : ''}" data-project="${project.id}">${escapeHtml(project.name)}</button>
  `).join('');
}

function renderInstruments() {
  refs.instrumentList.innerHTML = activeProject().instruments.map((instrument) => `
    <button class="instrument-card ${instrument.id === state.selectedInstrumentId ? 'active' : ''}" data-instrument="${instrument.id}">
      <span style="--track-color:${instrument.color}"></span>
      <strong>${escapeHtml(instrument.name)}</strong>
      <small>${instrument.type === 'drums' ? 'Simple drum rack' : 'Playable MIDI keys'}</small>
    </button>
  `).join('');
  const instrument = selectedInstrument();
  refs.legato.value = instrument?.legato ?? 0;
  refs.legato.disabled = instrument?.type === 'drums';
  refs.legatoValue.textContent = `${refs.legato.value} ms`;
}

function renderArrangement() {
  refs.tracks.innerHTML = activeProject().instruments.map((instrument) => `
    <article class="track-lane">
      <div class="track-title"><span style="--track-color:${instrument.color}"></span>${escapeHtml(instrument.name)}</div>
      <div class="clip-row">${instrument.clips.map((clip) => `<button class="clip">${escapeHtml(clip)}</button>`).join('')}</div>
    </article>
  `).join('');
}

function renderMixer() {
  refs.mixer.innerHTML = activeProject().instruments.map((instrument) => `
    <article class="channel-strip">
      <strong>${escapeHtml(instrument.name)}</strong>
      <input data-volume="${instrument.id}" type="range" min="0" max="100" value="${instrument.volume}" />
      <small>${instrument.volume}%</small>
    </article>
  `).join('');
}

function renderPlayable() {
  refs.pads.innerHTML = drumPads.map((pad) => `<button class="pad" data-note="${pad.note}" data-type="drums"><b>${pad.label}</b><small>${pad.key}</small></button>`).join('');
  refs.keys.innerHTML = keyboardNotes.map((note) => `<button class="key" data-note="${note}" data-type="keyboard">${noteLabel(note)}</button>`).join('');
}

refs.newProject.addEventListener('click', () => { const project = createProject(); state.activeId = project.id; state.selectedInstrumentId = project.instruments[0].id; render(); });
refs.projectName.addEventListener('input', () => { activeProject().name = refs.projectName.value || 'Untitled Project'; persistProjects(); renderProjects(); });
refs.projectList.addEventListener('click', (event) => { const id = event.target.closest('[data-project]')?.dataset.project; if (!id) return; state.activeId = id; state.selectedInstrumentId = activeProject().instruments[0].id; render(); });
refs.instrumentList.addEventListener('click', (event) => { const id = event.target.closest('[data-instrument]')?.dataset.instrument; if (!id) return; state.selectedInstrumentId = id; renderInstruments(); });
refs.legato.addEventListener('input', () => { selectedInstrument().legato = Number(refs.legato.value); refs.legatoValue.textContent = `${refs.legato.value} ms`; persistProjects(); });
refs.bpm.addEventListener('input', () => { activeProject().bpm = Number(refs.bpm.value); engine.setBpm(refs.bpm.value); persistProjects(); });
refs.pads.addEventListener('click', (event) => { const button = event.target.closest('[data-note]'); if (button) trigger(Number(button.dataset.note), button.dataset.type); });
refs.keys.addEventListener('click', (event) => { const button = event.target.closest('[data-note]'); if (button) trigger(Number(button.dataset.note), button.dataset.type); });
refs.mixer.addEventListener('input', (event) => { const id = event.target.dataset.volume; if (!id) return; const instrument = activeProject().instruments.find((item) => item.id === id); instrument.volume = Number(event.target.value); persistProjects(); renderMixer(); });
refs.play.addEventListener('click', async () => { await ensureEngine(); engine.setBpm(activeProject().bpm); engine.isPlaying ? engine.stop() : engine.start(); refs.play.textContent = engine.isPlaying ? 'Pause' : 'Run'; refs.status.textContent = engine.isPlaying ? `Running ${engine.bpm} BPM` : 'Stopped'; });
refs.stop.addEventListener('click', () => { engine.stop(); refs.play.textContent = 'Run'; refs.status.textContent = 'Stopped'; });

document.addEventListener('keydown', (event) => {
  if (event.repeat || ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  const drum = drumPads.find((pad) => pad.key.toLowerCase() === event.key.toLowerCase());
  const keyIndex = ['z', 'x', 'c', 'v', 'b', 'n', 'm', ','].indexOf(event.key.toLowerCase());
  if (drum) trigger(drum.note, 'drums');
  if (keyIndex >= 0) trigger(keyboardNotes[keyIndex], 'keyboard');
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
render();
