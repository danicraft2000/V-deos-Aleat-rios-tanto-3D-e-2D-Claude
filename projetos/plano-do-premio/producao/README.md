# Produção do vídeo "Plano do Prêmio"

Tudo é gerado por código, sem Adobe: **Three.js** (3D), **Canvas** (2D), **Chromium headless** (render quadro a quadro),
**Kokoro** (voz sintética offline) e **FFmpeg** (montagem). As fotos dos consoles e do tablet estão em `../referencias/fotos/`.

## Passo a passo

```bash
pip install kokoro-onnx soundfile scipy pillow
# 1) fotos -> cartões limpos (build/fotos/)
python3 preparar_fotos.py
# 2) narração + linha do tempo (modelo em github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
python3 tts.py <pasta_do_modelo>
# 3) trilha (música lo-fi sintetizada + efeitos + narração)
python3 audio_mix.py
# 4) vídeo (1920x1080, 30 fps), mostra "QUADROS feitos/total" durante o render
cd render && npm install && node render.mjs && cd ..
#    conferir quadros soltos: node render/render.mjs --stills 14,85,160
# 5) junta tudo
./finalizar.sh   # -> build/Plano_do_Premio_Daniel.mp4
```

## Onde mexer

| O quê | Arquivo |
|-------|---------|
| Texto da narração e das legendas | `narracao.json` (depois rode `tts.py` de novo) |
| Tempo das cenas | gerado por `montar_timeline.py` a partir da narração |
| Visual de cada cena (3D, textos, números) | `render/src/scenes.js` |
| Peças 3D (moedas, troféu, rosca, cadeado, fita VHS...) | `render/src/three3d.js` |
| Música e efeitos | `audio_mix.py` |
