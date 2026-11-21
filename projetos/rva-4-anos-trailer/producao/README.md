# Produção do Trailer Oficial "RVA 4 Anos"

Tudo é gerado por código, como um projeto de After Effects escrito à mão: **Canvas 2D** (camadas, textos, efeitos),
**Three.js** (3D), **Chromium headless** (render quadro a quadro), **Python** (trilha, efeitos e mixagem) e **FFmpeg** (montagem).

## Passo a passo

```bash
# 0) material (não vai para o git): locutor, músicas, vinheta, fontes e o TXT dos caracteres especiais
./preparar_material.sh <pasta_com_os_arquivos_enviados>
#    o trailer também usa os logos e a foto dos 20 anos de ../rva-4-anos (mesmo repositório)

# 1) som: trilha sintetizada + efeitos + locutor + Música 1/2 + Previsão 2004 + vinheta, em -14 LUFS
pip install numpy scipy soundfile pyloudnorm
python3 audio_mix.py                 # -> build/audio/mix.wav

# 2) imagem (1920x1080, 30 fps), de 0 até a entrada da vinheta
cd render && npm install && node render.mjs && cd ..
#    conferir quadros soltos: node render.mjs --stills 6.4,27.4,73.9

# 3) junta tudo
./finalizar.sh                       # -> build/RVA_4_Anos_Trailer_Oficial.mp4

# 4) thumbnail do YouTube (opção A: disco do 4 + ???; opção B: caixas lacradas)
cd render && node render.mjs --thumb A,B   # -> build/thumbnail/ (JPG 1280x720 e PNG 1920x1080)
```

## Onde mexer (o "painel de composições")

| O quê | Arquivo |
|-------|---------|
| Tempos das cenas, falas do locutor, deixas de cada palavra, músicas, efeitos e cartões da montagem | `timeline.json` |
| Cenas 1–8 (0–41 s): aviso, PLAY, túnel de fitas, o fã, 2012, logo + mapa, parede de TVs, subida | `render/src/cenas_a.js` |
| Cenas 9–13 (41–102,8 s): montagem, segredo, ???, em breve, título | `render/src/cenas_b.js` |
| Tipografia Avant Garde + caracteres especiais (V e A), estilos prata/ouro/arco-íris, animação por letra | `render/src/tipo.js` |
| Efeitos (VHS, glitch, flash, bokeh, letterbox, desligar TV…) | `render/src/fx.js` |
| Peças 3D (fitas, parede de TVs, caixas lacradas) | `render/src/tres.js` |
| Trilha sintetizada, efeitos e mixagem | `audio_mix.py` |
| Thumbnail do YouTube (opções A e B) | `render/src/thumb.js` |

## Caracteres especiais

`render/src/tipo.js` lê `material/caracteres_especiais.txt` ("Para letra V use esse caractere …") e troca as letras
na hora de desenhar: **V → U+E04F (V.alt02)** e **A → U+E000 (A.alt01)**. Á, À, Â e Ã usam os A alternativos da mesma
família (U+E001, U+E002, U+E003, U+E005), que também existem na fonte.
