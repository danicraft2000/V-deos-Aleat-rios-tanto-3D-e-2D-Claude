#!/usr/bin/env bash
# Copia os arquivos enviados para material/ com nomes fixos (material/ não vai para o git: músicas, locutor e fontes têm direitos).
# Uso: ./preparar_material.sh <pasta_com_os_arquivos>
set -euo pipefail
ORIG="${1:?informe a pasta com os arquivos enviados}"
M="$(dirname "$0")/../material"
mkdir -p "$M/audio" "$M/video" "$M/fontes"
cp "$ORIG"/*Announcer*.mp3          "$M/audio/locutor.mp3"
cp "$ORIG"/*sica1.mp3               "$M/audio/musica1.mp3"
cp "$ORIG"/*sica2.mp3               "$M/audio/musica2.mp3"
cp "$ORIG"/*Vanguarda2004.mp3       "$M/audio/previsao_vanguarda_2004.mp3"
cp "$ORIG"/lv_0_*.mp4               "$M/video/vinheta_4_anos.mp4"
cp "$ORIG"/*AvantGardeStd-Bold.ttf  "$M/fontes/ITCAvantGardeStd-Bold.ttf"
cp "$ORIG"/*AvantGardeStd-Demi.ttf  "$M/fontes/ITCAvantGardeStd-Demi.ttf"
cp "$ORIG"/*Caracteres_Especiais*.txt "$M/caracteres_especiais.txt"
ls -R "$M"
