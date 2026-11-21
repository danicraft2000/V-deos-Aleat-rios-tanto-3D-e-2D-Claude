#!/usr/bin/env bash
# Junta o corpo do trailer (render) + a vinheta de 4 anos (entra com um clarão branco) + o som mixado (-14 LUFS).
# Uso: ./finalizar.sh   -> build/RVA_4_Anos_Trailer_Oficial.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
VT=$(python3 -c "import json;print(json.load(open('producao/timeline.json'))['vinheta_t'])")
ffmpeg -v error -y -i build/video_corpo.mp4 -i material/video/vinheta_4_anos.mp4 -i build/audio/mix.wav \
  -filter_complex "[0:v]trim=0:${VT},setpts=PTS-STARTPTS,fps=30,format=yuv420p[a];[1:v]fps=30,scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.35:color=white,format=yuv420p[b];[a][b]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -tune animation \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest build/RVA_4_Anos_Trailer_Oficial.mp4
echo "pronto: build/RVA_4_Anos_Trailer_Oficial.mp4"
