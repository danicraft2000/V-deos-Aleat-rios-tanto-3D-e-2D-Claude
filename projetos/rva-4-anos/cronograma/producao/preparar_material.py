#!/usr/bin/env python3
"""Prepara o material enviado (locuções, músicas, pack de efeitos, vinheta e logos) para o render e a mixagem.

Uso:  python3 preparar_material.py <pasta_com_os_arquivos_enviados>

Procura os arquivos pelo nome (Narração1..5, Música1/4/5, Pack de Efeitos, lv_0_*.mp4 e as imagens dos logos)
e gera, dentro de ../material e ../build:
  material/narracao/N1..N5.wav      locuções (48 kHz)
  material/musica/mus1|mus4|mus5.wav trilhas (só o áudio dos arquivos .mp3 que na verdade são vídeos)
  material/sfx/fx01..fx18.wav       cada efeito do pack, recortado pelos silêncios
  material/vinheta/vinheta4anos.wav áudio da vinheta RVA 4 Anos
  build/frames/vinheta/0001.jpg...  quadros da vinheta (1920x1080, 30 fps)
  material/imagens/*.png            logos da Vanguarda viram máscara branca com transparência
"""
import glob
import json
import os
import subprocess
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)  # cronograma/
MAT = os.path.join(RAIZ, 'material')
BUILD = os.path.join(RAIZ, 'build')

# Cortes do "Pack de Efeitos Sonoros para Editar" (segundos), achados pelos silêncios e conferidos no espectrograma.
SFX = {
    'fx01': (0.00, 3.45, 'varredura descendo (whoosh agudo longo)'),
    'fx02': (3.45, 6.42, 'tique-taque subindo (riser de pulsos)'),
    'fx03': (7.15, 8.11, 'swish duplo curto'),
    'fx04': (8.22, 10.35, 'impacto grave (boom)'),
    'fx05': (10.43, 12.25, 'riser de ruído (whoosh subindo)'),
    'fx06': (12.34, 14.19, 'whoosh + batida'),
    'fx07': (14.29, 16.59, 'relógio tique-taque'),
    'fx08': (16.74, 17.13, 'batida curta'),
    'fx09': (17.67, 19.37, 'braam grave (tom cinematográfico)'),
    'fx10': (20.07, 20.49, 'glitch digital descendo'),
    'fx11': (21.56, 22.64, 'whoosh duplo com batida'),
    'fx12': (23.26, 26.60, 'bipes de transmissão (pulsos agudos)'),
    'fx13': (27.17, 27.55, 'pop/bloop'),
    'fx14': (28.08, 29.39, 'ding de sino'),
    'fx15': (29.77, 29.85, 'clique'),
    'fx16': (30.43, 30.85, 'batida/punch'),
    'fx17': (31.58, 31.85, 'estalo'),
    'fx18': (32.47, 37.07, 'BOOM cinematográfico longo'),
}


def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def achar(pasta, padrao):
    achados = sorted(glob.glob(os.path.join(pasta, padrao)))
    if not achados:
        sys.exit(f'não achei {padrao} em {pasta}')
    return achados[0]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    for d in ('narracao', 'musica', 'sfx', 'vinheta', 'imagens'):
        os.makedirs(os.path.join(MAT, d), exist_ok=True)

    for i in range(1, 6):
        ff('-i', achar(src, f'*Narra*o{i}.mp3'), '-ar', '48000', '-ac', '1', os.path.join(MAT, 'narracao', f'N{i}.wav'))
    for n in (1, 4, 5):
        ff('-i', achar(src, f'*M*sica{n}.mp3'), '-vn', '-ar', '48000', '-ac', '2', os.path.join(MAT, 'musica', f'mus{n}.wav'))

    pack = os.path.join(MAT, 'sfx', 'pack.wav')
    ff('-i', achar(src, '*Pack*Efeitos*'), '-ar', '48000', '-ac', '2', pack)
    for nome, (a, b, _desc) in SFX.items():
        # fade curtinho nas pontas para não estalar
        ff('-ss', f'{a}', '-to', f'{b}', '-i', pack, '-af', 'afade=t=in:d=0.004,areverse,afade=t=in:d=0.02,areverse',
           os.path.join(MAT, 'sfx', f'{nome}.wav'))
    with open(os.path.join(MAT, 'sfx', 'catalogo.json'), 'w') as f:
        json.dump({k: {'ini': v[0], 'fim': v[1], 'descricao': v[2]} for k, v in SFX.items()}, f, ensure_ascii=False, indent=1)

    vin = achar(src, '*lv_0_*.mp4')
    ff('-i', vin, '-vn', '-ar', '48000', '-ac', '2', os.path.join(MAT, 'vinheta', 'vinheta4anos.wav'))
    qd = os.path.join(BUILD, 'frames', 'vinheta')
    os.makedirs(qd, exist_ok=True)
    ff('-i', vin, '-vf', 'fps=30,scale=1920:1080', '-q:v', '2', os.path.join(qd, '%04d.jpg'))
    n = len(glob.glob(os.path.join(qd, '*.jpg')))
    with open(os.path.join(BUILD, 'frames', 'contagem.json'), 'w') as f:
        json.dump({'vinheta': n}, f)

    # logos da Vanguarda (preto no branco) -> branco com alfa (o preto vira opaco)
    imgs = sorted(glob.glob(os.path.join(src, '*image*.jpg')) + glob.glob(os.path.join(src, '*.png')))
    for p in imgs:
        info = subprocess.run(['identify', '-format', '%w %h', p], capture_output=True, text=True).stdout.split()
        w, h = int(info[0]), int(info[1])
        nome = None
        if w > 1800:
            nome = 'lives_ref.jpg'  # captura do logo "LIVES" (só referência)
            subprocess.run(['cp', p, os.path.join(MAT, 'imagens', nome)], check=True)
            continue
        nome = 'vanguarda_wordmark.png' if w / h > 3 else 'vanguarda_empilhado.png'
        subprocess.run(['convert', p, '-colorspace', 'gray', '-negate', '-level', '20%,80%', '-alpha', 'copy',
                        '-fill', 'white', '-colorize', '100', '-trim', '+repage', 'PNG32:' + os.path.join(MAT, 'imagens', nome)], check=True)
    print('material pronto em', MAT)


if __name__ == '__main__':
    main()
