# Produção do vídeo "Cronograma de Divulgação dos 4 Anos da RVA"

Tudo é gerado por código: **Canvas 2D** (motion graphics), **Three.js** (disco do 4, 3 arcos, calendários e caixas
secretas em 3D), **Chromium headless** (render quadro a quadro), **NumPy** (mixagem) e **FFmpeg** (montagem).

## Passo a passo

```bash
# 1) copia e prepara o material enviado (locuções, músicas, pack de efeitos, vinheta e logos)
python3 preparar_material.py /caminho/da/pasta/com/os/arquivos
# 2) vídeo (1920x1080, 30 fps) -> ../build/video_sem_audio.mp4
cd render && npm install && node render.mjs && cd ..
#    conferir quadros soltos: node render.mjs --stills 49.5,119.5,205
#    só um trecho:            node render.mjs --de 115 --ate 126 --saida teaser.mp4
# 3) mixagem (locução + música com ducking + efeitos) -> ../build/audio/mix.wav
python3 audio_mix.py
# 4) junta tudo em -14 LUFS -> ../build/RVA_4_Anos_Cronograma.mp4
./finalizar.sh
```

## Onde mexer

| O quê | Arquivo |
|-------|---------|
| Início de cada locução, cenas, transições, tremidas, músicas e **todos os efeitos sonoros** | `timeline.json` |
| Cenas da narração 1 (abertura até a visão geral) | `render/src/scenes_a.js` |
| Dezembro, janeiro, o segredo e o teaser do 30/01 | `render/src/scenes_b.js` |
| Orçamento, fechamento e final | `render/src/scenes_c.js` |
| Efeitos visuais (texto 3D, animações de texto, bokeh, confete, flare, ícones) | `render/src/fx.js` |
| Transições e camadas fixas (logo no canto, barra do cronograma) | `render/src/main.js` |
| Volumes da voz/música e ducking | `audio_mix.py` |

Os tempos das cenas seguem a locução: em `scenes_*.js`, `at('N3', 23.37)` quer dizer "23,37 s depois do início da
Narração 3". Se mudar o início de uma narração no `timeline.json`, as animações dela andam junto (os efeitos sonoros
do `timeline.json` estão em tempo absoluto e precisam ser ajustados à mão).

## Efeitos do pack (cortados pelos silêncios)

| Nome | Som |
|------|-----|
| fx01 | varredura descendo (whoosh agudo longo) |
| fx02 | tique-taque subindo (riser de pulsos) |
| fx03 | swish curto |
| fx04 | impacto grave |
| fx05 | riser de ruído |
| fx06 | whoosh + batida |
| fx07 | relógio tique-taque |
| fx08 | batida curta |
| fx09 | braam grave |
| fx10 | glitch digital |
| fx11 | whoosh duplo |
| fx12 | bipes de transmissão |
| fx13 | pop |
| fx14 | ding |
| fx15 | clique |
| fx16 | punch |
| fx17 | estalo |
| fx18 | BOOM cinematográfico |
