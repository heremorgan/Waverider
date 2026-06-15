# Waverider

Waverider is the beginning of a Cubase-like, free, high-quality music production and sampling tool that runs as a WebAssembly-powered Progressive Web App (PWA).

This repository provides a runnable project-first studio: create saved projects in the browser, run the transport, play starter MIDI keyboard and drum instruments, adjust mixer levels, and use simple legato smoothing for melodic parts.

## Features in this framework

- **Project-first workspace** with one-click project creation, local saved sessions, transport controls, track lanes, and mixer controls.
- **Starter instruments** including a playable MIDI keyboard, simple drum rack, computer-key shortcuts, and legato smoothing for melodic lines.
- **Web Audio engine** for master gain, click scheduling, synthesized drum voices, keyboard voices, and note triggering.
- **WebAssembly DSP core** written in Rust and loaded by the browser for signal helpers and future real-time processing.
- **Progressive Web App** metadata and offline cache service worker.
- **No frontend build dependency required** for the app shell; it can be served statically.

## Project layout

```text
app/                  Browser PWA application shell
  index.html          Main DAW UI
  manifest.webmanifest
  service-worker.js
  src/                JavaScript/CSS application modules, audio engine, and project store
crates/audio-engine/  Rust WebAssembly DSP core
scripts/              Local build and serve helpers
```

## Quick start

Serve the app shell locally:

```bash
./scripts/serve.sh
```

Then open <http://localhost:4173>.

## Build WebAssembly

Install the Rust WASM target once:

```bash
rustup target add wasm32-unknown-unknown
```

Build the DSP module:

```bash
./scripts/build-wasm.sh
```

The compiled module is copied to `app/pkg/waverider_audio_engine.wasm`, where the browser app loads it.

## Development notes

- The JavaScript audio engine gracefully falls back to JavaScript math when the WASM file has not been built yet.
- The current starter instruments generate synthesized drum and keyboard voices so the studio is immediately usable without bundled copyrighted audio assets.
- Projects are saved to browser local storage for lightweight create-and-run iteration.
- Future work can add timeline clips, piano-roll editing, plugin hosting abstractions, audio export, and persistent project storage.
