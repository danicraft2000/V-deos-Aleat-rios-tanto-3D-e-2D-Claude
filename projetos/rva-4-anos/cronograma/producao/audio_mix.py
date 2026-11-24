#!/usr/bin/env python3
"""Mixagem do vídeo do cronograma (o papel do "Premiere" no áudio).

Lê timeline.json e monta, em 48 kHz estéreo:
  - as 5 locuções (nivelamento automático por loudness);
  - as trilhas enviadas (cortes, fades e "ducking": a música abaixa sozinha quando a locução fala);
  - os efeitos do pack (alinhados pelo início, pelo pico ou pelo fim de cada efeito).
Saída: ../build/audio/mix.wav  (o volume final em -14 LUFS é feito no finalizar.sh)

Uso:  python3 audio_mix.py
"""
import json
import os
import re
import subprocess
import wave

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
MAT = os.path.join(RAIZ, 'material')
OUT = os.path.join(RAIZ, 'build', 'audio')
SR = 48000

ALVO_VOZ = -16.0     # LUFS de cada locução
ALVO_MUSICA = -16.0  # LUFS das trilhas antes do ganho de cada trecho
ABAFAR_EFEITOS_NA_VOZ = -4.0  # dB: efeitos abaixam um pouco quando a locução fala


def carregar(path, ss=None, dur=None, mono=False):
    cmd = ['ffmpeg', '-v', 'error']
    if ss is not None:
        cmd += ['-ss', f'{ss}']
    if dur is not None:
        cmd += ['-t', f'{dur}']
    cmd += ['-i', path, '-ac', '1' if mono else '2', '-ar', str(SR), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    return a if mono else a.reshape(-1, 2)


def lufs(path):
    err = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    m = re.findall(r'I:\s*(-?[0-9.]+) LUFS', err)
    return float(m[-1]) if m else -23.0


def db(x):
    return 10 ** (x / 20)


def fades(a, fi, fo):
    n = len(a)
    if fi > 0:
        k = min(n, int(fi * SR))
        a[:k] *= np.linspace(0, 1, k)[:, None]
    if fo > 0:
        k = min(n, int(fo * SR))
        a[n - k:] *= np.linspace(1, 0, k)[:, None]
    return a


def colocar(bus, a, t):
    i = int(round(t * SR))
    if i < 0:
        a, i = a[-i:], 0
    j = min(len(bus), i + len(a))
    if j > i:
        bus[i:j] += a[: j - i]


def suavizar(env, ataque, soltura, hop):
    """Seguidor de envelope (ataque/soltura em segundos) num sinal amostrado a cada `hop` segundos."""
    out = np.zeros_like(env)
    ka, ks = np.exp(-hop / ataque), np.exp(-hop / soltura)
    v = 0.0
    for i, x in enumerate(env):
        k = ka if x > v else ks
        v = k * v + (1 - k) * x
        out[i] = v
    return out


def limitador(x, teto, look=0.005, soltura=0.12):
    """Limitador de picos com antecipação: calcula o ganho por blocos de 1 ms e suaviza a soltura."""
    b = int(SR * 0.001)
    nb = len(x) // b + 1
    pad = np.zeros((nb * b, 2), np.float32)
    pad[: len(x)] = x
    pk = np.abs(pad).max(1).reshape(nb, b).max(1)
    req = np.minimum(1.0, teto / np.maximum(pk, 1e-9))
    la = int(look / 0.001)
    req = np.array([req[max(0, i - la): i + la + 1].min() for i in range(nb)])  # antecipa o pico
    g = np.empty(nb)
    v = 1.0
    kr = np.exp(-0.001 / soltura)
    for i in range(nb):
        v = req[i] if req[i] < v else kr * v + (1 - kr) * req[i]
        g[i] = v
    gs = np.interp(np.arange(len(x)), np.arange(nb) * b + b / 2, g).astype(np.float32)
    return x * gs[:, None]


def main():
    tl = json.load(open(os.path.join(AQUI, 'timeline.json')))
    n = int(tl['duracao'] * SR) + SR
    voz = np.zeros((n, 2), np.float32)
    mus = np.zeros((n, 2), np.float32)
    fx = np.zeros((n, 2), np.float32)

    # ---------------------------------------------------------------- locuções
    for nar in tl['narracao']:
        p = os.path.join(MAT, 'narracao', nar['arquivo'])
        g = db(ALVO_VOZ - lufs(p))
        a = carregar(p, mono=True) * g
        colocar(voz, np.stack([a, a], 1), nar['t'])
        print(f"voz {nar['id']} em {nar['t']:.2f}s  ganho {20*np.log10(g):+.1f} dB")

    # ---------------------------------------------------------------- trilhas
    cache_lufs = {}
    for m in tl['musica']:
        p = os.path.join(MAT, m['arquivo'])
        a = carregar(p, m['ini'], m['dur'])
        g = 0.0
        if m.get('normalizar', True):
            if p not in cache_lufs:
                cache_lufs[p] = lufs(p)
            g = ALVO_MUSICA - cache_lufs[p]
        g += m.get('ganho', 0)
        a = fades(a * db(g), m.get('fade_in', 0), m.get('fade_out', 0))
        colocar(mus, a, m['t'])
        print(f"música {m['arquivo']} [{m['ini']:.1f}+{m['dur']:.1f}] em {m['t']:.2f}s  ganho {g:+.1f} dB")

    # ducking: envelope da voz controla o volume da música
    hop = 0.01
    h = int(hop * SR)
    nv = len(voz) // h
    rms = np.sqrt((voz[: nv * h, 0].reshape(nv, h) ** 2).mean(1) + 1e-12)
    ativo = (20 * np.log10(rms) > -42).astype(np.float32)
    env = suavizar(ativo, 0.06, 0.45, hop)
    ganho = db(tl.get('abafar_musica_na_voz_dB', -11) * env)
    gs = np.interp(np.arange(len(mus)), np.arange(nv) * h + h / 2, ganho).astype(np.float32)
    mus *= gs[:, None]

    # ---------------------------------------------------------------- efeitos
    sfx = {}
    for item in tl['sfx']:
        nome, t, gdb = item[0], item[1], item[2]
        modo = item[3] if len(item) > 3 else 'ini'
        if nome not in sfx:
            a = carregar(os.path.join(MAT, 'sfx', f'{nome}.wav'))
            envl = np.convolve(np.abs(a).mean(1), np.ones(480) / 480, mode='same')
            sfx[nome] = (a, int(np.argmax(envl)) / SR, len(a) / SR)
        a, pico, dur = sfx[nome]
        t0 = t - pico if modo == 'pico' else t - dur if modo == 'fim' else t
        colocar(fx, a * db(gdb), t0)
    print(f'{len(tl["sfx"])} efeitos colocados ({len(sfx)} tipos do pack)')

    fx *= (db(ABAFAR_EFEITOS_NA_VOZ * env)[np.minimum(np.arange(len(fx)) // h, nv - 1)])[:, None].astype(np.float32)
    mix = voz + mus + fx * 0.9
    mix = mix[: int(tl['duracao'] * SR)]
    pk = np.abs(mix).max()
    mix = limitador(mix, db(-1.5))
    os.makedirs(OUT, exist_ok=True)
    for nome, bus in (('mix', mix), ('so_voz', voz[: len(mix)]), ('so_musica', mus[: len(mix)]), ('so_efeitos', fx[: len(mix)])):
        pcm = (np.clip(bus, -1, 1) * 32767).astype('<i2')
        with wave.open(os.path.join(OUT, f'{nome}.wav'), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
    print('pronto:', os.path.join(OUT, 'mix.wav'), f'(pico antes do ajuste {20*np.log10(pk):.1f} dBFS)')


if __name__ == '__main__':
    main()
