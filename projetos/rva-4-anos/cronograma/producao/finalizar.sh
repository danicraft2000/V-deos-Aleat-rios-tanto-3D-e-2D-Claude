#!/usr/bin/env bash
# Junta o vídeo renderizado com a mixagem e deixa o volume no padrão do YouTube (-14 LUFS, pico -1,5 dBTP),
# com loudnorm em duas passadas (ganho linear, sem "bombear" o som).
# Uso: ./finalizar.sh   -> ../build/RVA_4_Anos_Cronograma.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
B=build
ALVO="I=-14:TP=-1.5:LRA=11"
J=$(ffmpeg -nostats -hide_banner -i "$B/audio/mix.wav" -af "loudnorm=$ALVO:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
med() { echo "$J" | python3 -c "import sys, json; print(json.load(sys.stdin)['$1'])"; }
FILTRO="loudnorm=$ALVO:measured_I=$(med input_i):measured_TP=$(med input_tp):measured_LRA=$(med input_lra):measured_thresh=$(med input_thresh):offset=$(med target_offset):linear=true"
ffmpeg -v error -y -i "$B/video_sem_audio.mp4" -i "$B/audio/mix.wav" -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -tune animation \
  -af "$FILTRO" -c:a aac -b:a 256k -ar 48000 \
  -movflags +faststart -shortest "$B/RVA_4_Anos_Cronograma.mp4"
echo "pronto: $B/RVA_4_Anos_Cronograma.mp4"
