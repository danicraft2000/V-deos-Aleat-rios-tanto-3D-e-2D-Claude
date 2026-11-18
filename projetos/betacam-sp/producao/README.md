# Produção do vídeo "Betacam SP em 3D"

Tudo é gerado por código, sem Adobe e sem Blender: **Three.js** (3D), **Canvas** (2D), **Chromium headless** (render quadro a quadro), **FFmpeg** (montagem) e **Python** (voz, música e efeitos).

## Passo a passo

```bash
# 1) narração com voz sintética (Kokoro, offline; modelo em github.com/thewh1teagle/kokoro-onnx/releases)
pip install kokoro-onnx soundfile scipy
python3 tts.py <pasta_do_modelo>          # -> build/voz/*.wav + duracoes.json
# 2) linha do tempo a partir das durações reais da fala
python3 montar_timeline.py                # -> build/timeline.json
# 3) vídeo (1920x1080, 24 fps) — cada capítulo vira build/secoes/<id>.mp4
cd render && npm install && node render.mjs --workers 3 && cd ..
#    quadros soltos para conferir:   node render/render.mjs --stills s04:9,s13:17
#    refazer só alguns capítulos:    node render/render.mjs --secoes s03,s13
# 4) trilha (música original + efeitos sincronizados + narração)
python3 audio_mix.py                      # -> build/audio/mix.wav
# 5) junta tudo (volume no padrão do YouTube, -14 LUFS)
./finalizar.sh                            # -> build/Betacam_SP_3D_1080p.mp4 e build/Betacam_SP_3D_celular_720p.mp4
```

O render roda em CPU (SwiftShader). Neste ambiente leva por volta de 1 s por quadro (10.247 quadros).

## Onde mexer

| O quê | Arquivo |
|-------|---------|
| Texto da narração, voz e velocidade | `narracao.json` |
| Ritmo (pausas entre frases, sobra no fim de cada capítulo) | `montar_timeline.py` (`RITMO`) |
| Cenas 01–06 (intro, origem, preço, fita S, fita L, videocassete) | `render/src/cenas1.js` |
| Cenas 07–12 (conexões, inserir, duração, gravar, frame a frame, manutenção) | `render/src/cenas2.js` |
| Cenas 13–18 (mecanismo, ejetar, emissoras, desligar, fim da fabricação, encerramento) | `render/src/cenas3.js` |
| Fitas S e L (medidas, janelas, carretéis, tampa, etiquetas) | `render/src/fita.js` |
| Videocassete (frente, botões, VUs, contador, jog, traseira, conectores) | `render/src/deck.js` |
| Mecanismo interno e caminho da fita | `render/src/mecanismo.js` |
| Cabos, monitores, câmera ENG, racks, prateleira etc. | `render/src/extras.js` |
| Títulos 3D letra a letra | `render/src/texto3d.js` e `render/src/base.js` |
| Legendas animadas, cotas, cartões, etiqueta do capítulo | `render/src/overlay.js` |
| Luz, reflexos, profundidade de campo, bloom, grão | `render/src/motor.js` |
| Música e efeitos sonoros | `audio_mix.py` |

Os efeitos sonoros são declarados pelas próprias cenas (função `sons()`), exportados em `build/eventos.json` pelo `render.mjs` e lidos pelo `audio_mix.py`, então som e imagem ficam sempre no mesmo tempo.
