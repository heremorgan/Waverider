#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p app/pkg
rustc --crate-type=cdylib --target wasm32-unknown-unknown --edition=2021 crates/audio-engine/src/lib.rs -O -o app/pkg/waverider_audio_engine.wasm
