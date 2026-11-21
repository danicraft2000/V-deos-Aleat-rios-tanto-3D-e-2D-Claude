"""Monta o som do Trailer Oficial RVA 4 Anos.

Camadas:
  - trilha de trailer sintetizada aqui (drones, pulsos, golpes, subidas), em Ré# menor como as músicas da Previsão
  - efeitos sonoros sintetizados (fita VHS, TV de tubo, whooshes, impactos...)
  - locutor (material/audio/locutor.mp3), cortado em falas e posicionado pela timeline
  - Música 2 (montagem, com parada de fita), Música 1 (abafada, "de dentro da caixa") e Previsão 2004 (revelação e título)
  - áudio original da vinheta de 4 anos no final

Uso: python3 audio_mix.py   -> build/audio/mix.wav (48 kHz, estéreo, -14 LUFS)
"""
import json
import pathlib
import subprocess

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

AQUI = pathlib.Path(__file__).parent
RAIZ = AQUI.parent
MAT = RAIZ / "material"
BUILD = RAIZ / "build" / "audio"
BUILD.mkdir(parents=True, exist_ok=True)
TL = json.loads((AQUI / "timeline.json").read_text(encoding="utf-8"))
SR = 48000
DUR = TL["duracao"]
N = int(round(DUR * SR))
BEAT = TL["batida"]
ANCORA = 41.0  # a grade da trilha sintetizada encaixa na 1ª batida da Música 2
D = TL["deixas"]
rng = np.random.default_rng(2027)
METER = pyln.Meter(SR)


# ------------------------------------------------------------------ utilidades
def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    w = [fi / (SR / 2) for fi in f] if isinstance(f, (list, tuple)) else f / (SR / 2)
    return sosfilt(butter(order, w, btype=kind, output="sos"), x, axis=0)


def noise(d):
    return rng.standard_normal(int(d * SR))


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def stereo(x, pan=0.0):
    if x.ndim == 2:
        return x
    lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * lg * 1.414, x * rg * 1.414], axis=1)


def place(buf, x, t, gain=1.0, pan=0.0):
    x = stereo(x, pan)
    i = int(round(t * SR))
    if i >= len(buf) or i + len(x) <= 0:
        return
    a, b = max(0, i), min(len(buf), i + len(x))
    buf[a:b] += x[a - i:b - i] * gain


def fades(x, fi=0.01, fo=0.01):
    x = x.copy()
    a, b = int(fi * SR), int(fo * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


def env_ad(t, a=0.005, d=0.3):
    return np.minimum(1, t / a) * np.exp(-np.maximum(0, t - a) / d)


def saw(f, t, phase=0.0):
    ph = np.cumsum(np.broadcast_to(f, t.shape)) / SR if np.ndim(f) else f * t
    return 2 * ((ph + phase) % 1.0) - 1


def supersaw(f, t, voices=5, det=0.14):
    out = np.zeros_like(t)
    for k in range(voices):
        d = (k - (voices - 1) / 2) / ((voices - 1) / 2) * det
        out += saw(f * 2 ** (d / 12), t, phase=rng.random())
    return out / voices


def grid(t0, t1, step=BEAT):
    """Tempos da grade (ancorada em 41,0 s) dentro de [t0, t1)."""
    k0 = int(np.ceil((t0 - ANCORA) / step - 1e-9))
    out, k = [], k0
    while ANCORA + k * step < t1 - 1e-9:
        out.append(ANCORA + k * step)
        k += 1
    return out


def load(nome, a=0.0, b=None):
    """Decodifica um trecho de um arquivo de material (qualquer formato) para float estéreo 48 kHz."""
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{a:.4f}"]
    if b is not None:
        cmd += ["-t", f"{b - a:.4f}"]
    cmd += ["-i", str(nome), "-vn", "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def lufs(x):
    x = stereo(x)
    if len(x) < SR * 0.5:
        x = np.concatenate([x, np.zeros((int(SR * 0.5), 2))])
    return METER.integrated_loudness(x)


def to_lufs(x, alvo):
    return x * 10 ** ((alvo - lufs(x)) / 20)


def nivelador(x, alvo, max_up=8.0, max_down=4.0, janela=0.4, suave=1.2):
    """Nivela a música (como um 'gain rider'): aproxima a loudness de curto prazo do alvo."""
    m = stereo(x).mean(axis=1)
    h = int(janela * SR)
    nb = len(m) // h + 1
    lv = np.array([10 * np.log10(np.mean(m[i * h:(i + 1) * h] ** 2) + 1e-12) for i in range(nb)])
    ganho = np.clip(alvo - lv, -max_down, max_up)
    ganho[lv < -60] = 0
    k = max(1, int(suave / janela))
    ganho = np.convolve(np.pad(ganho, k, mode="edge"), np.ones(2 * k + 1) / (2 * k + 1), mode="same")[k:-k]
    g = np.interp(np.arange(len(m)), np.arange(nb) * h + h / 2, ganho)
    return stereo(x) * (10 ** (g / 20))[:, None]


def reverb_ir(dur=2.4, bright=5000, seed=7):
    r = np.random.default_rng(seed)
    t = tt(dur)
    e = np.exp(-t * 6.9 / dur)
    ir = np.stack([r.standard_normal(len(t)), r.standard_normal(len(t))], axis=1) * e[:, None]
    ir = filt(ir, "lowpass", bright)
    ir[: int(0.012 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=0))


IR_SALA = reverb_ir(2.6, 6000)
IR_CURTA = reverb_ir(0.9, 4000, 11)


def reverb(x, wet=0.3, ir=IR_SALA):
    x = stereo(x)
    w = np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return x * (1 - wet) + w * wet


def with_tail(x, tail=2.0):
    x = stereo(x)
    return np.concatenate([x, np.zeros((int(tail * SR), 2))])


# ------------------------------------------------------------------ instrumentos (Ré# menor)
# acordes: i (D#m), VI (B), VII (C#), iv (G#m)
ACORDES = {"i": [51, 54, 58], "VI": [47, 51, 54], "VII": [49, 53, 56], "iv": [44, 47, 51]}
RAIZES = {"i": 39, "VI": 35, "VII": 37, "iv": 32}


def sub(n, d, drop=True):
    t = tt(d)
    f = midi(n) * (1 + (0.6 * np.exp(-t * 18) if drop else 0))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.3)


def pad(notes, d, cut=1100, att=0.8):
    t = tt(d)
    x = sum(supersaw(midi(n), t, det=0.2) for n in notes) / len(notes)
    x = filt(x, "lowpass", cut)
    e = np.minimum(1, t / att) * np.minimum(1, (d - t) / 0.6)
    return x * e * 0.5


def caixinha(n, d=1.6):
    """'Caixinha de música' com fita gasta (wow & flutter): a memória."""
    t = tt(d)
    wow = 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t) + 0.0015 * np.sin(2 * np.pi * 6.3 * t)
    f = midi(n) * wow
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 2.2) + 0.35 * np.sin(ph * 2.76) * np.exp(-t * 6) + 0.12 * np.sin(ph * 5.4) * np.exp(-t * 12)
    return x * np.minimum(1, t / 0.003) * 0.3


def baixo(n, d):
    t = tt(d)
    x = saw(midi(n), t) * 0.5 + np.sin(2 * np.pi * midi(n) * t) * 0.8
    return filt(x, "lowpass", 420) * env_ad(t, 0.004, d * 0.55) * 0.6


def tom(f0=90, d=0.6, big=False):
    t = tt(d)
    f = f0 * (1 + 0.8 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (4 if big else 7))
    x += filt(noise(d), "lowpass", 1800) * np.exp(-t * 30) * 0.4
    return np.tanh(x * (1.8 if big else 1.3)) * 0.8


def caixa():
    t = tt(0.35)
    n = filt(noise(0.35), "bandpass", [1500, 8000]) * np.exp(-t * 14)
    return (n * 0.8 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5) * 0.7


def tique(f=3200, d=0.025):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) * 0.5 + filt(noise(d), "highpass", 5000) * 0.5) * np.exp(-t * 220)


def prato(d=2.5):
    t = tt(d)
    return filt(noise(d), "highpass", 4000) * np.exp(-t * 1.8) * 0.4


def braam(root=27, d=3.2):
    t = tt(d)
    notes = [root, root + 12, root + 19, root + 24]
    x = sum(supersaw(midi(n), t, det=0.1) for n in notes) / len(notes)
    dark, bright = filt(x, "lowpass", 260), filt(x, "lowpass", 2600, 2)
    k = np.exp(-t * 3.0)
    y = dark * (1 - k) + bright * k
    e = np.minimum(1, t / 0.04) * np.exp(-t * 0.9)
    return np.tanh(y * 2.4 * e) * 0.8


def subida(d=3.5, f0=200, f1=9000, pitch=True):
    """Riser: ruído com filtro subindo + serra subindo + 'tom de Shepard'."""
    t = tt(d)
    p = t / d
    nz = noise(d)
    bands = []
    for k in range(6):
        lo = f0 * (f1 / f0) ** (k / 6)
        bands.append(filt(nz, "bandpass", [lo, min(lo * 2.2, 20000)]))
    pos = p * 5.0
    y = np.zeros_like(t)
    for k, b in enumerate(bands):
        y += b * np.clip(1 - np.abs(pos - k), 0, 1)
    y *= p ** 1.6
    if pitch:
        f = midi(39) * 2 ** (p * 3)  # sobe 3 oitavas
        y += supersaw(f, t, 3, 0.15) * 0.18 * p ** 2
        for o in range(5):  # Shepard
            fo = midi(51) * 2 ** ((o + p * 2) % 5 - 2)
            amp = np.exp(-(((o + p * 2) % 5 - 2.5) ** 2) / 1.2)
            y += np.sin(2 * np.pi * np.cumsum(fo) / SR) * amp * 0.06 * p
    return y * 0.9


def prato_rev(d=1.6):
    return prato(d)[::-1] * 0.9


# ------------------------------------------------------------------ efeitos
def whoosh(d=0.6, f0=300, f1=4000):
    t = tt(d)
    x = noise(d)
    w = np.sin(np.pi * t / d)
    return (filt(x, "bandpass", [f0, f0 * 3]) * (1 - w) + filt(x, "bandpass", [f1 / 3, min(f1, 20000)]) * w * 0.7) * w ** 2 * 0.7


def whoosh_rev(d=0.7):
    t = tt(d)
    x = filt(noise(d), "bandpass", [400, 6000]) * (t / d) ** 3
    return x * 0.8


def impacto(big=False, grave=False):
    d = 2.6 if big else 1.4
    t = tt(d)
    f0 = 52 if grave else 70
    f = f0 * np.exp(-t * 1.4) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (1.6 if big else 3.0))
    x += filt(noise(d), "lowpass", 1100) * np.exp(-t * 10) * 0.7
    if big:
        x += np.pad(prato(2.5), (0, max(0, len(x) - int(2.5 * SR))))[: len(x)] * 0.7
    return reverb(np.tanh(x * 1.6) * 0.95, 0.25)


def boom():
    t = tt(3.0)
    f = 90 * np.exp(-t * 3) + 34
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    x += filt(noise(3.0), "lowpass", 500) * np.exp(-t * 6) * 0.5
    return reverb(np.tanh(x * 2.0), 0.35)


def brilho():
    out = np.zeros(int(1.6 * SR))
    for k, n in enumerate([75, 82, 87, 91, 94, 99]):
        t = tt(1.3)
        x = (np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(2 * np.pi * midi(n) * 2.76 * t)) * np.exp(-t * 3.5)
        i = int(k * 0.05 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.13
    return reverb(out, 0.35)


def clique(f=2200, d=0.03):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * 0.7


def pop():
    t = tt(0.12)
    f = 400 + 900 * t / 0.12
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.6


def clack():
    t = tt(0.25)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) for f, dcy in [(1850, 40), (3120, 55), (4730, 70), (920, 30)])
    x += filt(noise(0.25), "highpass", 3000) * np.exp(-t * 90)
    return np.tanh(x * 0.8) * 0.5


def ding(notes=(87, 94)):
    out = np.zeros(int(2.0 * SR))
    for k, n in enumerate(notes):
        t = tt(1.8)
        x = (np.sin(2 * np.pi * midi(n) * t) + 0.25 * np.sin(2 * np.pi * midi(n) * 3.01 * t) * np.exp(-t * 4)) * np.exp(-t * 2.5)
        i = int(k * 0.12 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.25
    return reverb(out, 0.3)


def clunk():
    t = tt(0.5)
    x = np.sin(2 * np.pi * 75 * t) * np.exp(-t * 22) + filt(noise(0.5), "bandpass", [600, 3500]) * np.exp(-t * 45) * 0.9
    x2 = np.zeros_like(x)
    k = int(0.09 * SR)
    x2[k:] = (filt(noise(0.5), "bandpass", [1500, 6000]) * np.exp(-t * 70))[: len(x) - k] * 0.6
    return np.tanh((x + x2) * 1.4) * 0.7


def motor(d=1.0):
    t = tt(d)
    x = np.sin(2 * np.pi * 118 * t) * 0.4 + np.sin(2 * np.pi * 236 * t) * 0.2 + filt(noise(d), "bandpass", [200, 900]) * 0.4
    return x * np.minimum(1, t / 0.1) * np.minimum(1, (d - t) / 0.3) * 0.35


def estatica(d=0.7):
    t = tt(d)
    x = filt(noise(d), "bandpass", [800, 9000]) * np.exp(-t * 3)
    crack = (rng.random(len(t)) < 0.002) * rng.standard_normal(len(t)) * 3
    return (x + crack) * 0.35


def chiado_fita(d):
    x = filt(noise(d), "bandpass", [2000, 12000])
    return fades(x * 0.03, 0.4, 0.4)


def projetor(d):
    t = tt(d)
    x = filt(noise(d), "bandpass", [80, 400]) * 0.15
    clk = np.zeros_like(t)
    for c in np.arange(0, d, 1 / 24):
        i = int(c * SR)
        k = clique(1400, 0.01)
        clk[i:i + len(k)] += k[: len(clk) - i] * 0.05
    return fades(x + clk, 0.5, 0.5) * 0.6


def tv_liga():
    t = tt(1.2)
    whine = np.sin(2 * np.pi * 7800 * t) * 0.05 * np.exp(-t * 2)
    thump = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 18)
    zz = filt(noise(1.2), "bandpass", [1000, 6000]) * np.exp(-t * 5) * 0.4
    return (whine + thump + zz) * 0.8


def desliga_tv():
    t = tt(0.6)
    f = 1800 * np.exp(-t * 7) + 60
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.5


def rebobinar(d=0.95, f0=1400, f1=3600, rate=14):
    t = tt(d)
    p = t / d
    base = f0 + (f1 - f0) * p
    ch = (t * rate) % 1.0
    f = base * (1 + 0.6 * ch)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.35
    x += filt(noise(d), "bandpass", [300, 2500]) * 0.3
    return x * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.08) * 0.6


def tique_contador(d=0.8, desc=False):
    out = np.zeros(int(d * SR))
    n = int(d * 18)
    for k in range(n):
        f = 2400 + (k / n) * 1600 * (-1 if desc else 1)
        x = tique(f, 0.02)
        i = int(k / 18 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * (0.6 if k < n - 1 else 1.0)
    return out


def faixas():
    out = np.zeros(int(1.5 * SR))
    for k in range(10):
        x = whoosh(0.18, 600 + k * 120, 5000) * 0.6
        x[: int(0.03 * SR)] += tique(1600 + k * 180, 0.03) * 0.8
        i = int(k * 0.13 * SR)
        out[i:i + len(x)] += x[: len(out) - i]
    return out


def pulso_mapa():
    t = tt(1.8)
    ping = np.sin(2 * np.pi * 1250 * t) * np.exp(-t * 3) * 0.3
    thump = np.sin(2 * np.pi * 55 * t) * np.exp(-t * 10)
    return reverb(ping + thump, 0.4)


def tvs():
    out = np.zeros(int(1.3 * SR))
    pent = [63, 66, 68, 70, 73, 75, 78, 80, 82, 85]
    for k in range(53):
        t = tt(0.06)
        n = pent[int(rng.integers(0, len(pent)))]
        x = np.sign(np.sin(2 * np.pi * midi(n) * t)) * np.exp(-t * 60) * 0.12
        i = int((k / 53) * 0.95 * SR)
        out[i:i + len(x)] += x[: len(out) - i]
    return filt(out, "lowpass", 6000)


def sync_tvs():
    t = tt(1.6)
    x = sum(np.sin(2 * np.pi * midi(n) * t) for n in [51, 58, 63, 70]) * 0.15 * np.exp(-t * 1.5)
    x[: int(0.05 * SR)] += clique(1200, 0.05)
    return reverb(x, 0.35)


def suga(d=0.45):
    t = tt(d)
    x = filt(noise(d), "bandpass", [300, 7000]) * (t / d) ** 4
    return x * 0.9


def coracao():
    out = np.zeros(int(0.8 * SR))
    for k, dt in enumerate([0.0, 0.22]):
        t = tt(0.4)
        x = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 30)) * t) * np.exp(-t * 11) * (1.0 if k == 0 else 0.7)
        i = int(dt * SR)
        out[i:i + len(x)] += x
    return np.tanh(out * 1.8) * 0.9


def drone_segredo(d):
    t = tt(d)
    x = np.sin(2 * np.pi * midi(27) * t) * 0.5 + np.sin(2 * np.pi * midi(28) * t) * 0.35  # Ré# + Mi: batimento
    x += filt(supersaw(midi(39), t, 5, 0.3), "lowpass", 320) * 0.35
    vento = filt(noise(d), "bandpass", [250, 1200]) * (0.25 + 0.15 * np.sin(2 * np.pi * 0.13 * t))
    agudo = np.sin(2 * np.pi * midi(82) * t) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 5 * t))
    e = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 0.4) * (0.6 + 0.4 * t / d)
    return reverb((x + vento + agudo) * e, 0.3)


def chocalho(d):
    out = np.zeros(int(d * SR))
    c = 0.0
    while c < d - 0.1:
        x = filt(noise(0.05), "bandpass", [200, 1500]) * np.exp(-tt(0.05) * 70) * rng.uniform(0.2, 0.6)
        i = int(c * SR)
        out[i:i + len(x)] += x[: len(out) - i]
        c += rng.uniform(0.08, 0.5)
    return out * 0.6


def corrente():
    out = np.zeros(int(1.0 * SR))
    for k in range(7):
        t = tt(0.4)
        fs = rng.uniform(1100, 1500) * np.array([1, 2.41, 3.93, 5.6])
        x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (25 + 10 * j)) for j, f in enumerate(fs)) * 0.25
        i = int(rng.uniform(0, 0.55) * SR)
        out[i:i + len(x)] += x
    return reverb(out, 0.3)


def scanner(d=1.3):
    t = tt(d)
    f = 380 * 2 ** (2.2 * t / d)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + np.sign(np.sin(2 * np.pi * 60 * t)) * 0.05
    return x * np.minimum(1, t / 0.05) * np.minimum(1, (d - t) / 0.05)


def erro_bip():
    t = tt(0.22)
    x = np.sign(np.sin(2 * np.pi * np.where(t < 0.11, 880, 620) * t)) * 0.22
    return filt(x, "lowpass", 5000) * (t < 0.21)


def acesso_negado():
    t = tt(0.6)
    x = np.sign(np.sin(2 * np.pi * 98 * t)) + np.sign(np.sin(2 * np.pi * 104 * t))
    return np.tanh(filt(x, "lowpass", 2200) * 0.8) * np.minimum(1, (0.6 - t) / 0.05) * 0.4


def glitch_sfx():
    d = 0.32
    out = np.zeros(int(d * SR))
    c = 0.0
    while c < d - 0.03:
        L = rng.uniform(0.015, 0.05)
        t = tt(L)
        kind = rng.integers(0, 3)
        if kind == 0:
            x = np.sign(np.sin(2 * np.pi * rng.uniform(300, 2500) * t)) * 0.2
        elif kind == 1:
            x = noise(L) * 0.25
        else:
            x = np.round(np.sin(2 * np.pi * rng.uniform(80, 400) * t) * 3) / 3 * 0.3
        i = int(c * SR)
        out[i:i + len(x)] += x[: len(out) - i]
        c += L + rng.uniform(0, 0.02)
    return filt(out, "highpass", 150)


def whoosh_arcos():
    a = whoosh(1.1, 120, 2500) * 1.2
    return reverb(a, 0.2)


def sino():
    return ding((82, 89)) + ding((94,)) * 0.5


SFX = {
    "clunk": clunk, "motor": lambda: motor(1.0), "estatica": estatica, "clique": lambda: clique(),
    "boom": boom, "whoosh": lambda: whoosh(0.6), "whoosh_rev": whoosh_rev, "brilho": brilho,
    "impacto": lambda: impacto(), "impacto_grande": lambda: impacto(True), "impacto_grave": lambda: impacto(False, True),
    "tique_contador": lambda: tique_contador(0.8), "tique_contador_rev": lambda: tique_contador(0.35, True),
    "tv_liga": tv_liga, "rebobinar": lambda: rebobinar(0.95), "avancar": lambda: rebobinar(1.6, 2200, 4200, 20),
    "faixas": faixas, "braam": lambda: braam(27, 3.4), "pulso_mapa": pulso_mapa, "tvs": tvs, "sync_tvs": sync_tvs,
    "subida": lambda: subida(3.25), "whoosh_arcos": whoosh_arcos, "suga": suga, "whoosh_curto": lambda: whoosh(0.28, 500, 6000),
    "ding": lambda: ding(), "coracao": coracao, "corrente": corrente, "scanner": scanner, "erro_bip": erro_bip,
    "acesso_negado": acesso_negado, "subida_segredo": lambda: subida(3.75, 150, 8000), "glitch": glitch_sfx,
    "pop": pop, "clack": clack, "sino": sino, "subida_final": lambda: subida(1.5, 400, 12000) + prato_rev(1.5),
    "desliga_tv": desliga_tv,
}
SFX_DUR = {"chiado_fita": chiado_fita, "projetor": projetor, "drone_segredo": drone_segredo, "chocalho": chocalho}
GANHO_SFX = {
    "whoosh": 0.55, "whoosh_curto": 0.5, "whoosh_rev": 0.5, "brilho": 0.7, "impacto": 0.8, "impacto_grande": 0.95,
    "boom": 1.0, "braam": 0.75, "estatica": 0.6, "glitch": 0.55, "tvs": 0.7, "clack": 0.8, "coracao": 0.9,
    "drone_segredo": 0.55, "chocalho": 0.5, "subida": 0.6, "subida_segredo": 0.55, "subida_final": 0.6, "ding": 0.6,
}


# ------------------------------------------------------------------ trilha sintetizada (0 – 41 s)
def trilha():
    mus = np.zeros((N, 2))
    # drone de abertura (5,4 – 14)
    d = 14.2 - 5.4
    t = tt(d)
    dr = np.sin(2 * np.pi * midi(27) * t) * 0.55 + filt(supersaw(midi(39), t, 5, 0.25), "lowpass", 380) * 0.35
    dr += pad([51, 58], d, 700, 2.0) * 0.6
    dr *= np.minimum(1, t / 1.2) * np.minimum(1, (d - t) / 0.5)
    place(mus, reverb(dr, 0.35), 5.4, 0.55)

    # caixinha de música (memórias): arpejo lento em colcheias de 2 batidas
    arpejo = {"i": [63, 66, 70, 75, 70, 66], "VI": [59, 63, 66, 71, 66, 63], "VII": [61, 65, 68, 73, 68, 65], "iv": [56, 59, 63, 68, 63, 59]}
    prog_mem = ["i", "i", "VI", "VII"]
    for k, tb in enumerate(grid(8.0, 13.4, BEAT / 2)):
        bar = int((tb - ANCORA) // (BEAT * 4)) % 4
        notas = arpejo[prog_mem[bar]]
        place(mus, caixinha(notas[k % len(notas)], 1.6), tb, 0.5, pan=0.25 if k % 2 else -0.25)

    # 'o fã' (14 – 19,6): pulso de baixo + acordes + caixinha + tique de relógio
    prog_fa = ["i", "VI", "VII", "i"]
    for tb in grid(13.9, 19.55, BEAT / 2):
        bar = int(np.floor((tb - ANCORA) / (BEAT * 4))) % 4
        ac = prog_fa[bar]
        place(mus, baixo(RAIZES[ac], BEAT / 2 * 0.9), tb, 0.55)
    for k, tb in enumerate(grid(13.9, 19.55, BEAT)):
        place(mus, tique(3600, 0.02), tb, 0.35, pan=0.4)
        bar = int(np.floor((tb - ANCORA) / (BEAT * 4))) % 4
        notas = arpejo[prog_fa[bar]]
        place(mus, caixinha(notas[k % 6] + 12, 1.2), tb + BEAT / 2, 0.35, pan=-0.3)
    for tb in grid(13.9, 19.55, BEAT * 4):
        bar = int(np.floor((tb - ANCORA) / (BEAT * 4))) % 4
        place(mus, reverb(pad(ACORDES[prog_fa[bar]], BEAT * 4 + 0.4, 1400, 0.4), 0.3), tb, 0.45)

    # rebobinar: a trilha 'volta' (19,6 – 20,5)
    rev = mus[int(17.6 * SR):int(19.6 * SR)][::-1].copy()
    rs = np.interp(np.linspace(0, len(rev) - 1, int(0.9 * SR)), np.arange(len(rev)), rev[:, 0])
    place(mus, fades(rs, 0.05, 0.1) * 0.7, 19.6)
    # 2012: drone sustenta (20,5 – 24)
    d = 24.4 - 20.4
    t = tt(d)
    dr = (np.sin(2 * np.pi * midi(27) * t) * 0.5 + pad([47, 54, 59], d, 900, 0.3)) * np.minimum(1, (d - t) / 0.4)
    place(mus, reverb(dr, 0.35), 20.4, 0.5)

    # 'o canal' (24 – 33): percussão de trailer + baixo + pads
    prog_canal = ["i", "VI", "VII", "i"]
    for k, tb in enumerate(grid(24.0, 40.85, BEAT / 2)):
        bar = int(np.floor((tb - ANCORA) / (BEAT * 4))) % 4
        ac = prog_canal[bar]
        inten = 0.45 + 0.55 * (tb - 24.0) / 16.85
        place(mus, baixo(RAIZES[ac] + (12 if k % 4 == 3 else 0), BEAT / 2 * 0.9), tb, 0.5 * inten + 0.2)
    for k, tb in enumerate(grid(24.0, 40.85, BEAT)):
        pos = k % 4
        if pos in (0, 2):
            place(mus, tom(58, 0.9, True), tb, 0.7)
        if pos == 3:
            place(mus, tom(85, 0.5), tb + BEAT / 2, 0.45, pan=-0.3)
        if tb >= 33.0 and pos in (1, 3):
            place(mus, caixa(), tb, 0.45)
        place(mus, tique(3300, 0.02), tb + BEAT / 2, 0.25, pan=0.5)
    for tb in grid(24.0, 40.85, BEAT * 4):
        bar = int(np.floor((tb - ANCORA) / (BEAT * 4))) % 4
        place(mus, reverb(pad(ACORDES[prog_canal[bar]], BEAT * 4 + 0.3, 1800, 0.3), 0.3), tb, 0.5)
    # rufar de tons acelerando na subida (37,3 – 40,85)
    c = 37.3
    while c < 40.8:
        p = (c - 37.3) / 3.5
        place(mus, tom(70 + 40 * p, 0.35), c, 0.25 + 0.5 * p, pan=(rng.random() - 0.5) * 0.6)
        place(mus, tique(3000 + 2000 * p, 0.02), c, 0.2 + 0.3 * p)
        c += BEAT / (2 + 6 * p)
    # silêncio súbito antes do golpe (40,85 – 41,0)
    a, b = int(40.85 * SR), int(41.0 * SR)
    mus[a:b] *= np.linspace(1, 0, b - a)[:, None] ** 4
    mus[b:] = 0
    return mus


# ------------------------------------------------------------------ montagem
def main():
    voz = np.zeros((N, 2))
    musica = np.zeros((N, 2))
    sfx = np.zeros((N, 2))
    vinheta = np.zeros((N, 2))
    A = MAT / "audio"

    # locutor
    loc = load(A / "locutor.mp3")
    loc_m = filt(loc.mean(axis=1), "highpass", 85)
    for f in TL["locutor"]:
        a, b = f["src"]
        x = loc_m[int(a * SR):int(b * SR)]
        x = fades(x, 0.01, 0.06)
        x = reverb(with_tail(x, 0.8), 0.12, IR_CURTA)
        place(voz, x, f["t"])
    voz = to_lufs(voz, -16.5)

    # trilha sintetizada
    tri = trilha()
    tri = to_lufs(tri[: int(41 * SR)], -18.5)
    musica[: len(tri)] += tri

    # músicas enviadas
    for m in TL["musicas"]:
        a, b = m["src"]
        if m["id"] == "musica2":
            stop = m["parada_de_fita"]
            x = load(A / m["arquivo"], a, b + 0.6)
            n_norm = int((b - a) * SR)
            # parada de fita: a velocidade cai de 1 a 0 em `stop` segundos
            n_out = int(stop * SR)
            vel = np.linspace(1, 0, n_out) ** 1.3
            pos = n_norm + np.cumsum(vel)
            parada = np.stack([np.interp(pos, np.arange(len(x)), x[:, c]) for c in range(2)], axis=1)
            parada = filt(parada, "lowpass", 3000) * np.linspace(1, 0, n_out)[:, None] ** 0.5
            corpo = x[:n_norm]
            ref = 10 * np.log10(np.mean(corpo[: int(7 * SR)].mean(axis=1) ** 2))
            corpo = nivelador(corpo, ref - 1.5, max_up=7, max_down=1)
            x = np.concatenate([corpo, parada * 10 ** (5 / 20)])
            x = x * 10 ** ((-15.0 - lufs(x[:n_norm])) / 20)
            place(musica, x, m["t"])
        elif m["id"] == "musica1":
            x = load(A / m["arquivo"], a, b)
            x = filt(x, "lowpass", 480, 4)
            x = filt(x, "highpass", 70)
            x = reverb(with_tail(x, 1.0), 0.45, IR_CURTA)
            x = to_lufs(x, -27.0)
            x = fades(x, 1.0, 1.6)
            place(musica, x, m["t"])
        else:
            x = load(A / m["arquivo"], a, b)
            ref = 10 * np.log10(np.mean(x[int(3.8 * SR):int(11 * SR)].mean(axis=1) ** 2))
            x = np.concatenate([x[: int(3.8 * SR)], nivelador(x[int(3.8 * SR):], ref - 3, max_up=4, max_down=0)])
            x = x * 10 ** ((-14.5 - lufs(x[int(3.8 * SR):])) / 20)
            x = fades(x, 0.01, 0.35)
            place(musica, x, m["t"])

    # efeitos
    for item in TL["sfx"]:
        nome, t0 = item[0], item[1]
        g = GANHO_SFX.get(nome, 0.6)
        if nome in SFX_DUR:
            x = SFX_DUR[nome](item[2] - t0)
        else:
            x = SFX[nome]()
        place(sfx, x, t0, g * 0.5)

    # vinheta (áudio original)
    vt = TL["vinheta_t"]
    vin = load(MAT / "video" / "vinheta_4_anos.mp4")
    vin = to_lufs(vin, -15.5)
    place(vinheta, vin, vt)

    # ducking: a música abaixa quando o locutor fala
    gdk = np.ones(N)
    for f in TL["locutor"]:
        a = int((f["t"] - 0.12) * SR)
        b = int((f["t"] + f["src"][1] - f["src"][0] + 0.15) * SR)
        gdk[max(0, a):b] = 10 ** (-7 / 20)
    k = int(0.18 * SR)
    ker = np.hanning(2 * k)
    ker /= ker.sum()
    gdk = np.convolve(gdk, ker, mode="same")
    musica *= gdk[:, None]

    mix = voz + musica + sfx + vinheta
    # corta o fim da música no golpe da vinheta (já tem fade no trecho)
    # normaliza para -14 LUFS e limita picos em -1,2 dBTP (aprox.)
    mix = to_lufs(mix, -14.0)
    mix = limitador(mix, 10 ** (-1.2 / 20))
    print(f"loudness final: {lufs(mix):.2f} LUFS · pico {20 * np.log10(np.abs(mix).max()):.2f} dBFS")
    sf.write(BUILD / "mix.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    for nome, s in [("voz", voz), ("musica", musica), ("sfx", sfx)]:
        sf.write(BUILD / f"stem_{nome}.wav", s.astype(np.float32), SR, subtype="FLOAT")
    print("pronto:", BUILD / "mix.wav")


def limitador(x, teto, look=0.005, rel=0.12, bloco=32):
    """Limitador de picos com antecipação (lookahead), calculado em blocos de 32 amostras."""
    from scipy.ndimage import maximum_filter1d
    pk = np.abs(x).max(axis=1)
    L = int(look * SR)
    m = maximum_filter1d(pk, size=2 * L + 1)
    alvo = np.minimum(1.0, teto / np.maximum(m, 1e-9))
    nb = int(np.ceil(len(alvo) / bloco))
    ab = np.pad(alvo, (0, nb * bloco - len(alvo)), constant_values=1.0).reshape(nb, bloco).min(axis=1)
    a = np.exp(-bloco / (rel * SR))
    g = np.empty(nb)
    cur = 1.0
    for i in range(nb):
        v = ab[i]
        cur = v if v < cur else v + (cur - v) * a
        g[i] = cur
    g = np.repeat(g, bloco)[: len(alvo)]
    y = x * np.minimum(g, alvo)[:, None]
    return np.clip(y, -teto, teto)


if __name__ == "__main__":
    main()
