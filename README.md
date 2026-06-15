# Waverider

Waverider is the beginning of a Cubase-like, free, high-quality music production and sampling tool that runs as a WebAssembly-powered Progressive Web App (PWA).

This repository currently provides a runnable framework: a browser DAW shell, Web Audio graph, transport, track model, sampler pads, PWA manifest/service worker, and a small Rust WebAssembly DSP core.

## Features in this framework

- **DAW-style workspace** with transport controls, track lanes, mixer controls, and sampler pads.
- **Web Audio engine** for master gain, click/metronome scheduling, sampler playback, and note triggering.
- **WebAssembly DSP core** written in Rust and loaded by the browser for signal helpers and future real-time processing.
- **Progressive Web App** metadata and offline cache service worker.
- **No frontend build dependency required** for the app shell; it can be served statically.

## Project layout

```text
app/                  Browser PWA application shell
  index.html          Main DAW UI
  manifest.webmanifest
  service-worker.js
  src/                JavaScript/CSS application modules
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
- The current sampler generates built-in high-quality synthesized sample buffers so the framework is immediately usable without bundled copyrighted audio assets.
- Future work can add timeline clips, piano-roll editing, plugin hosting abstractions, audio export, and persistent project storage.
