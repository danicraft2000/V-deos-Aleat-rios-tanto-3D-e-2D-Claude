"""Monta a trilha do Shorts: música sintetizada (livre de direitos), efeitos, narração e o áudio original do Agenda.

Uso: python audio_mix.py            -> build/audio/mix.wav (48 kHz, estéreo)
Lê timeline.json (mesma linha do tempo do vídeo), build/voz/*.wav e build/audio/agenda_original.wav.
"""
import json
import pathlib

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

AQUI = pathlib.Path(__file__).parent
BUILD = AQUI / "build"
TL = json.loads((AQUI / "timeline.json").read_text(encoding="utf-8"))
SR = 48000
DUR = TL["duracao"]
N = int(DUR * SR) + SR
rng = np.random.default_rng(2027)

BEAT = 60 / TL["bpm"]
S16 = BEAT / 4


# ------------------------------------------------------------------ utilidades
def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    if isinstance(f, (list, tuple)):
        sos = butter(order, [fi / (SR / 2) for fi in f], btype=kind, output="sos")
    else:
        sos = butter(order, f / (SR / 2), btype=kind, output="sos")
    return sosfilt(sos, x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def place(buf, x, t, gain=1.0, pan=0.0):
    """Coloca o sinal mono/estéreo x em buf no tempo t (segundos)."""
    i = int(t * SR)
    if i >= len(buf) or i + len(x) <= 0:
        return
    if x.ndim == 1:
        lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * lg * 1.414, x * rg * 1.414], axis=1)
    a, b = max(0, i), min(len(buf), i + len(x))
    buf[a:b] += x[a - i:b - i] * gain


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def saw(f, t, phase=0.0):
    return 2 * ((f * t + phase) % 1.0) - 1


def supersaw(f, t, voices=5, det=0.12):
    out = np.zeros_like(t)
    for k in range(voices):
        d = (k - (voices - 1) / 2) / ((voices - 1) / 2) * det
        out += saw(f * 2 ** (d / 12), t, phase=rng.random())
    return out / voices


def env_ad(t, a=0.005, d=0.3):
    return np.minimum(1, t / a) * np.exp(-np.maximum(0, t - a) / d)


# ------------------------------------------------------------------ instrumentos
def kick():
    t = tt(0.45)
    f = 48 + 120 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 6.5)
    x[: int(0.003 * SR)] += noise(0.003) * 0.6
    return np.tanh(x * 1.6) * 0.9


def snare():
    t = tt(0.3)
    n = filt(noise(0.3), "bandpass", [1200, 7000]) * np.exp(-t * 16)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 22)
    return (n * 0.7 + tone * 0.5) * 0.8


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    t = tt(d)
    return filt(noise(d), "highpass", 7000) * np.exp(-t * (14 if open_ else 70)) * 0.35


def crash():
    t = tt(2.0)
    return filt(noise(2.0), "highpass", 4500) * np.exp(-t * 2.2) * 0.45


def bass_note(n, d):
    t = tt(d)
    x = saw(midi(n), t) * 0.6 + np.sin(2 * np.pi * midi(n) * t) * 0.6
    x = filt(x, "lowpass", 700)
    return x * env_ad(t, 0.004, d * 0.7) * 0.55


def stab(notes, d):
    t = tt(d)
    x = sum(supersaw(midi(n), t) for n in notes) / len(notes)
    x = filt(x, "lowpass", 3200)
    return x * env_ad(t, 0.005, 0.12) * 0.5


def pad(notes, d):
    t = tt(d)
    x = sum(supersaw(midi(n), t, det=0.18) for n in notes) / len(notes)
    x = filt(x, "lowpass", 1400)
    e = np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.4)
    return x * e * 0.35


def pluck(n, d=0.25):
    t = tt(d)
    f = midi(n)
    x = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * 2 * t) * 0.3
    x = filt(x, "lowpass", 4500)
    return x * env_ad(t, 0.002, 0.09) * 0.32


# progressão I–V–vi–IV (Dó maior), um acorde por compasso
CHORDS = [([60, 64, 67], 36), ([55, 59, 62], 43), ([57, 60, 64], 45), ([53, 57, 60], 41)]
KICK, SNARE, HC, HO, CRASH = kick(), snare(), hat(), hat(True), crash()


def groove(mus, t0, t1, inten=0.8, lead=False):
    drums = np.zeros((N, 2))
    sidechain_hits = []
    step = 0
    t = t0
    while t < t1 - 1e-6:
        bar = step // 16
        s = step % 16
        chord, root = CHORDS[bar % 4]
        if s % 4 == 0:
            place(drums, KICK, t, 0.95)
            sidechain_hits.append(t)
        if s in (4, 12):
            place(drums, SNARE, t, 0.55 * inten + 0.15)
        if s % 2 == 0:
            place(drums, HC, t, 0.5, pan=0.3)
        if s % 4 == 2:
            place(drums, HO, t, 0.35, pan=-0.3)
            place(mus, stab([n + 12 for n in chord], 0.2), t, 0.55 * inten, pan=0.15)
        if s % 2 == 0:
            place(mus, bass_note(root + (12 if s % 8 == 6 else 0), S16 * 1.8), t, 0.9)
        if lead:
            arp = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24]
            place(mus, pluck(arp[s % 4] + (12 if s >= 8 else 0)), t, 0.55, pan=-0.2 if s % 2 else 0.2)
        step += 1
        t = t0 + step * S16
    if inten > 0.75:
        place(drums, CRASH, t0, 0.5)
    return drums, sidechain_hits


def sidechain(mus, hits, t0, t1, depth=0.55):
    g = np.ones(N)
    tv = np.arange(N) / SR
    for h in hits:
        i = int(h * SR)
        k = np.arange(min(N - i, int(0.3 * SR)))
        g[i:i + len(k)] = np.minimum(g[i:i + len(k)], 1 - depth * np.exp(-k / SR * 14))
    a, b = int(t0 * SR), int(t1 * SR)
    mus[a:b] *= g[a:b, None]
    _ = tv


# ------------------------------------------------------------------ efeitos
def whoosh(d=0.6, f0=300, f1=4000):
    t = tt(d)
    x = noise(d)
    low = filt(x, "bandpass", [f0, f0 * 3])
    high = filt(x, "bandpass", [f1 / 3, min(f1, 20000)])
    w = np.sin(np.pi * t / d)
    e = np.sin(np.pi * t / d) ** 2
    return (low * (1 - w) + high * w * 0.7) * e * 0.7


def impacto(big=False):
    d = 1.8 if big else 1.2
    t = tt(d)
    f = 70 * np.exp(-t * 1.5) + 32
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.2 if big else 3.2))
    x += filt(noise(d), "lowpass", 900) * np.exp(-t * 9) * 0.6
    if big:
        x += np.pad(crash(), (0, max(0, len(x) - len(CRASH))))[: len(x)] * 0.9
    return np.tanh(x * 1.4) * 0.9


def brilho():
    out = np.zeros(int(1.4 * SR))
    for k, n in enumerate([84, 88, 91, 96, 100]):
        t = tt(1.2)
        x = (np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(2 * np.pi * midi(n) * 2.76 * t)) * np.exp(-t * 4)
        i = int(k * 0.045 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.16
    return out


def clique(f=2200, d=0.03):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * 0.7


def pop():
    t = tt(0.1)
    f = 500 + 700 * t / 0.1
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.6


def carimbo():
    t = tt(0.35)
    x = np.sin(2 * np.pi * 85 * t) * np.exp(-t * 14) + filt(noise(0.35), "bandpass", [300, 3000]) * np.exp(-t * 30) * 0.8
    return np.tanh(x * 1.5) * 0.85


def foto():
    out = np.zeros(int(0.25 * SR))
    for k, dt in enumerate([0.0, 0.07]):
        x = filt(noise(0.05), "highpass", 2500) * np.exp(-tt(0.05) * 90)
        i = int(dt * SR)
        out[i:i + len(x)] += x * (0.6 if k else 0.8)
    return out


def erro_bip():
    t = tt(0.22)
    x = np.sign(np.sin(2 * np.pi * np.where(t < 0.11, 880, 660) * t)) * 0.25
    return filt(x, "lowpass", 5000) * (t < 0.21)


def erro_buzz():
    t = tt(0.7)
    x = np.sign(np.sin(2 * np.pi * 110 * t)) + np.sign(np.sin(2 * np.pi * 117 * t))
    return np.tanh(filt(x, "lowpass", 2500) * 0.8) * np.minimum(1, (0.7 - t) / 0.05) * 0.45


def clack():
    t = tt(0.4)
    x = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * dcy) for f, dcy in [(930, 14), (1480, 18), (2290, 22), (3610, 30), (5200, 40)])
    x += filt(noise(0.4), "highpass", 3000) * np.exp(-t * 80)
    return x * 0.22


def ding():
    t = tt(1.6)
    return (np.sin(2 * np.pi * 1318.5 * t) + 0.4 * np.sin(2 * np.pi * 2637 * t) + 0.2 * np.sin(2 * np.pi * 3955 * t)) * np.exp(-t * 2.6) * 0.3


def subida(d=3.2):
    t = tt(d)
    f = 180 * (8 ** (t / d))
    x = filt(noise(d), "highpass", 1500) * (t / d) ** 2 * 0.5
    x += np.sin(2 * np.pi * np.cumsum(f) / SR) * (t / d) ** 1.5 * 0.25
    return x


def estatica(d=0.6):
    return filt(noise(d), "bandpass", [800, 6000]) * np.minimum(1, (d - tt(d)) / 0.2) * 0.18


def glitch_sfx():
    out = np.zeros(int(0.18 * SR))
    for k in range(6):
        f = rng.choice([220, 440, 1320, 2600, 90])
        seg = int(0.03 * SR)
        tseg = np.arange(seg) / SR
        out[k * seg:(k + 1) * seg] = np.sign(np.sin(2 * np.pi * f * tseg)) * 0.25
    return out


def tv_liga():
    t = tt(0.6)
    x = np.sin(2 * np.pi * 7800 * t) * 0.05 * np.exp(-t * 2) + np.sin(2 * np.pi * 60 * t) * np.exp(-t * 12) * 0.6
    x += filt(noise(0.6), "bandpass", [1000, 6000]) * np.exp(-t * 6) * 0.2
    return x


def virar():
    return whoosh(0.3, 800, 6000) * 0.7


def contador():
    out = np.zeros(int(1.8 * SR))
    # ticks seguindo a mesma curva (easeOutCubic) do número na tela
    for k in range(1, 22):
        p = k / 22
        tk = (1 - (1 - p) ** (1 / 3)) * 1.6
        x = clique(3200 + 40 * k, 0.025)
        i = int(tk * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.5
    return out


SFX = {
    "whoosh": lambda: whoosh(0.6),
    "whoosh_arcos": lambda: whoosh(0.76, 200, 6000) * 1.2 + np.pad(brilho(), (0, 0))[: int(0.76 * SR)] * 0.5,
    "impacto": impacto,
    "impacto_grande": lambda: impacto(True),
    "brilho": brilho,
    "clique": clique,
    "pop": pop,
    "carimbo": carimbo,
    "foto": foto,
    "erro_bip": erro_bip,
    "erro_buzz": erro_buzz,
    "clack": clack,
    "ding": ding,
    "subida": lambda: subida(3.2),
    "subida_curta": lambda: subida(0.8) * 1.2,
    "estatica": estatica,
    "glitch": glitch_sfx,
    "tv_liga": tv_liga,
    "virar": virar,
    "contador": contador,
    "tique_faixas": lambda: np.concatenate([np.pad(clique(1600 + 120 * k, 0.03), (0, int(0.06 * SR) - int(0.03 * SR))) for k in range(10)]),
}
SFX_GAIN = {"whoosh": 0.55, "whoosh_arcos": 0.7, "impacto": 0.9, "impacto_grande": 1.0, "brilho": 0.8, "carimbo": 0.8,
            "erro_buzz": 0.7, "subida": 0.9, "clack": 1.0, "contador": 0.8, "estatica": 0.8}


# ------------------------------------------------------------------ montagem
def main():
    mus = np.zeros((N, 2))
    drums_all = np.zeros((N, 2))
    hits_all = []
    for sec in TL["musica"]:
        t0, t1, tipo = sec["ini"], sec["fim"], sec["tipo"]
        part = np.zeros((N, 2))
        if tipo == "groove":
            d, hits = groove(part, t0, t1, sec.get("intensidade", 0.8), sec.get("lead", False))
            sidechain(part, hits, t0, t1)
            drums_all += d
            hits_all += hits
        elif tipo == "suspense":
            dd = t1 - t0
            place(part, pad([45, 52, 57], dd) * 0.9, t0, 0.8)
            place(part, filt(np.sin(2 * np.pi * 55 * tt(dd)), "lowpass", 200) * 0.25, t0)
            k = 0
            while t0 + k * BEAT < t1 - 0.1:
                place(part, clique(2600, 0.02), t0 + k * BEAT, 0.35, pan=0.4 if k % 2 else -0.4)
                if k % 2 == 0:
                    place(part, KICK * 0.5, t0 + k * BEAT, 0.6)
                k += 1
        elif tipo == "drone":
            dd = t1 - t0
            x = filt(supersaw(41.2, tt(dd), det=0.5) + supersaw(43.65, tt(dd), det=0.5), "lowpass", 500)
            place(part, x * np.minimum(1, (dd - tt(dd)) / 0.3) * 0.5, t0 + 0.25)
        elif tipo == "subida":
            dd = t1 - t0
            place(part, pad([60, 64, 67, 72], dd) * np.linspace(0.3, 1.2, int(dd * SR)), t0)
            k = 0
            while True:
                tk = t0 + 1.0 + k * S16 * (2 if k < 8 else 1)
                if tk > t1 - 0.05:
                    break
                place(drums_all, SNARE, tk, 0.25 + 0.5 * (tk - t0) / dd)
                k += 1
        elif tipo == "final":
            place(part, stab([60, 64, 67, 72, 76], 0.9) * 2.2, t0, 0.8)
            place(drums_all, KICK, t0, 1.0)
            place(drums_all, CRASH, t0, 0.7)
        # recorte da seção (com rampas curtas)
        a, b = int(t0 * SR), int(min(t1 + (2.0 if tipo == "final" else 0.0), DUR) * SR)
        g = np.zeros(N)
        g[a:b] = 1
        r = int(0.01 * SR)
        g[a:a + r] = np.linspace(0, 1, r)
        g[b - r:b] = np.linspace(1, 0, r)
        mus += part * g[:, None]
    musica = (mus * 0.55 + drums_all * 0.6) * 0.4

    # narração
    voz = np.zeros((N, 2))
    for n in TL["narracao"]:
        x, sr = sf.read(BUILD / "voz" / f"{n['id']}.wav")
        if sr != SR:
            x = resample_poly(x, SR, sr)
        x = filt(x, "highpass", 90)
        place(voz, x * 1.1, n["t"])
    # ducking: a música abaixa quando a voz fala
    env = np.abs(voz[:, 0])
    win = int(0.05 * SR)
    env = np.convolve(env, np.ones(win) / win, mode="same")
    env = np.minimum(1, env / 0.05)
    # suaviza (ataque rápido, soltura lenta)
    sm = np.copy(env)
    rel = np.exp(-1 / (0.25 * SR / 64))
    blocks = sm[::64]
    for i in range(1, len(blocks)):
        blocks[i] = max(blocks[i], blocks[i - 1] * rel)
    sm = np.repeat(blocks, 64)[:N]
    duck = 1 - 0.68 * sm
    musica *= duck[:, None]

    # áudio original do Agenda Vanguarda (cena ACHARAM!)
    ao = TL["audio_original"]
    x, sr = sf.read(BUILD / "audio" / ao["arquivo"])
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    if sr != SR:
        x = resample_poly(x, SR, sr, axis=0)
    x = x[int(ao["ini"] * SR):int((ao["ini"] + ao["dur"]) * SR)]
    fade = int(0.35 * SR)
    x[-fade:] *= np.linspace(1, 0, fade)[:, None]
    x[:int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]
    pk = np.max(np.abs(x)) or 1
    original = np.zeros((N, 2))
    place(original, x / pk * 0.85 * ao["volume"], ao["t"])

    # efeitos
    fx = np.zeros((N, 2))
    for nome, t in TL["sfx"]:
        place(fx, SFX[nome](), t, SFX_GAIN.get(nome, 0.7), pan=float(rng.uniform(-0.25, 0.25)))

    mix = musica * 0.8 + voz * 1.0 + original * 0.95 + fx * 0.75
    mix = mix[: int(DUR * SR)]
    # fim suave
    end = int(0.5 * SR)
    mix[-end:] *= np.linspace(1, 0, end)[:, None] ** 2
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)
    mix /= max(1e-6, np.max(np.abs(mix))) / 0.95
    (BUILD / "audio").mkdir(parents=True, exist_ok=True)
    sf.write(BUILD / "audio" / "mix.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    # stems para conferência
    sf.write(BUILD / "audio" / "musica.wav", (musica[: int(DUR * SR)] * 0.8).astype(np.float32), SR, subtype="FLOAT")
    print("mix pronto:", BUILD / "audio" / "mix.wav", f"{DUR:.1f}s")


if __name__ == "__main__":
    main()
