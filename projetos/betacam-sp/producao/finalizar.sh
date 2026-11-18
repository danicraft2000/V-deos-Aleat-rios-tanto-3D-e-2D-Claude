#!/usr/bin/env bash
# Junta o vídeo renderizado com a trilha, normaliza o volume para o padrão do YouTube (-14 LUFS)
# e gera duas versões:
#   build/Betacam_SP_3D_1080p.mp4        (1920x1080, 24 fps — para o YouTube)
#   build/Betacam_SP_3D_celular_720p.mp4 (1280x720, mais leve — para ver/enviar pelo celular)
set -euo pipefail
cd "$(dirname "$0")"
ffmpeg -v error -y -i build/audio/mix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 build/audio/mix_norm.wav
ffmpeg -v error -y -i build/video_sem_audio.mp4 -i build/audio/mix_norm.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 20 -maxrate 10M -bufsize 20M -pix_fmt yuv420p -tune film \
  -c:a aac -b:a 192k -movflags +faststart -shortest build/Betacam_SP_3D_1080p.mp4
ffmpeg -v error -y -i build/video_sem_audio.mp4 -i build/audio/mix_norm.wav \
  -map 0:v -map 1:a -vf "scale=1280:720:flags=lanczos" -c:v libx264 -preset slow -crf 25 -maxrate 3M -bufsize 6M -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart -shortest build/Betacam_SP_3D_celular_720p.mp4
ls -lh build/Betacam_SP_3D_*.mp4
