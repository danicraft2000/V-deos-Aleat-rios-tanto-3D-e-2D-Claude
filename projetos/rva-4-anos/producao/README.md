# Produção do Shorts "RVA 4 Anos"

Tudo é gerado por código, sem Adobe: **Three.js** (3D), **Canvas** (2D), **Chromium headless** (render quadro a quadro) e **FFmpeg** (montagem).

## Passo a passo

```bash
# 0) coloque os vídeos de arquivo em ../material/ (nomes em clips.json)
# 1) trechos dos vídeos -> quadros JPG + áudio do Agenda
python3 preparar_material.py
# 2) narração com voz sintética (Kokoro, offline; modelo em github.com/thewh1teagle/kokoro-onnx/releases)
pip install kokoro-onnx soundfile
python3 tts.py <pasta_do_modelo> build/voz
# 3) trilha (música sintetizada + efeitos + narração + áudio original do Agenda)
pip install scipy
python3 audio_mix.py
# 4) vídeo (1080x1920, 30 fps)
cd render && npm install && node render.mjs && cd ..
#    conferir quadros soltos: node render.mjs --stills 3.0,20.5,55
# 5) junta tudo
./finalizar.sh
```

## Onde mexer

| O quê | Arquivo |
|-------|---------|
| Tempo das cenas, falas, efeitos sonoros | `timeline.json` |
| Texto da narração e voz | `narracao.json` |
| Trechos dos vídeos usados | `clips.json` |
| Visual de cada cena (textos, animações) | `render/src/scenes.js` |
| Logos (vetor e 3D) | `render/src/logos.js` |
| Música e efeitos | `audio_mix.py` |

## Espaços reservados (trocar pelas suas fotos/vídeos)

- Cena 3 (9–13 s): **foto sua na festa dos 20 anos** (polaroide "SUA FOTO DA FESTA")
- Cena 4 (14,7–16,8 s): **foto da visita em SJC** (polaroide "SUA FOTO DA VISITA")
- Cena 7 (37,6–41 s): **clipe da recriação no Blender** (viewport "PRÉVIA")
