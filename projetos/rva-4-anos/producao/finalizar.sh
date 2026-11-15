#!/usr/bin/env bash
# Junta o vídeo renderizado com a trilha e normaliza o volume para o padrão do YouTube (-14 LUFS).
# Uso: ./finalizar.sh   -> build/RVA_4_Anos_Shorts.mp4
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -v error -y -i build/video_sem_audio.mp4 -i build/audio/mix.wav \
  -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart -shortest build/RVA_4_Anos_Shorts.mp4
echo "pronto: build/RVA_4_Anos_Shorts.mp4"
