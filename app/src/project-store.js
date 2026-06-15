export const STORAGE_KEY = 'waverider.projects.v1';

export function createStarterProject() {
  return {
    id: crypto.randomUUID(),
    name: 'New Wave Project',
    bpm: 112,
    instruments: [
      { id: crypto.randomUUID(), type: 'keyboard', name: 'MIDI Keyboard', color: '#6ee7ff', volume: 82, legato: 48, clips: ['Warm chords'] },
      { id: crypto.randomUUID(), type: 'drums', name: 'Drum Rack', color: '#f9a8d4', volume: 88, legato: 0, clips: ['Starter beat'] }
    ]
  };
}

export function loadProjects() {
  try {
    const projects = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(projects) ? projects : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
