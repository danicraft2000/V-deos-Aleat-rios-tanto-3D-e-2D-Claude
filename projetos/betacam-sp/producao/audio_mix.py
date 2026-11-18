"""Trilha do vídeo Betacam SP: música original sintetizada (livre de direitos), efeitos sonoros e narração.

Uso: python audio_mix.py    -> build/audio/mix.wav (48 kHz, estéreo)
Lê build/timeline.json (tempo de cada seção e fala), build/eventos.json (efeitos exportados pelas cenas)
e build/voz/*.wav (narração gerada pelo tts.py).
"""
import json
import pathlib

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve

AQUI = pathlib.Path(__file__).parent
BUILD = AQUI / "build"
TL = json.loads((BUILD / "timeline.json").read_text(encoding="utf-8"))
EV = json.loads((BUILD / "eventos.json").read_text(encoding="utf-8"))
SR = 48000
DUR = TL["duracao"]
N = int((DUR + 1.0) * SR)
rng = np.random.default_rng(1986)

BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4


# ------------------------------------------------------------------ utilidades
def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    w = [fi / (SR / 2) for fi in f] if isinstance(f, (list, tuple)) else f / (SR / 2)
    return sosfilt(butter(order, w, btype=kind, output="sos"), x)


def ruido(d):
    return rng.standard_normal(int(d * SR))


def place(buf, x, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if x.ndim == 1:
        lg, rg = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * lg * 1.414, x * rg * 1.414], axis=1)
    a, b = max(0, i), min(len(buf), i + len(x))
    if a < b:
        buf[a:b] += x[a - i:b - i] * gain


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def env(t, a, d_total, rel):
    e = np.minimum(1, t / max(a, 1e-4))
    return e * np.clip((d_total - t) / max(rel, 1e-4), 0, 1)


def decai(t, a, k):
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * k)


def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1.0) - 1


IR_CACHE = {}


def reverb(x, seg=2.2, mix=0.3, cor=4000):
    """reverb simples: convolução com ruído decaindo (estéreo descorrelacionado)"""
    k = (seg, cor)
    if k not in IR_CACHE:
        t = tt(seg)
        irs = []
        for _ in range(2):
            ir = rng.standard_normal(len(t)) * np.exp(-t * 6.9 / seg)
            ir = filt(ir, "lowpass", cor)
            ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
            irs.append(ir / np.sqrt(np.sum(ir ** 2)))
        IR_CACHE[k] = irs
    irs = IR_CACHE[k]
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    out = np.zeros((len(x) + len(irs[0]) - 1, 2))
    for c in range(2):
        out[:, c] = fftconvolve(x[:, c], irs[c])
    seco = np.zeros_like(out)
    seco[: len(x)] = x
    return seco * (1 - mix) + out * mix


# ------------------------------------------------------------------ efeitos sonoros (sintetizados)
def whoosh(d=0.7, f0=300, f1=4500, sobe=True):
    """ruído varrendo de f0 a f1: soma de bandas com envelopes gaussianos em sequência"""
    t = tt(d)
    n = ruido(d)
    out = np.zeros_like(n)
    K = 9
    for k in range(K):
        p = k / (K - 1)
        fc = f0 * (f1 / f0) ** (p if sobe else 1 - p)
        banda = filt(n, "bandpass", [max(40, fc * 0.7), min(20000, fc * 1.45)])
        w = np.exp(-((t / d - p) ** 2) / (2 * 0.13 ** 2))
        out += banda * w
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2
    return out * e * 0.6


def impacto(grande=False):
    d = 2.6 if grande else 1.2
    t = tt(d)
    f = (42 if grande else 60) + 90 * np.exp(-t * 18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (2.2 if grande else 5))
    n = filt(ruido(d), "lowpass", 2500) * np.exp(-t * 14) * 0.5
    x = np.tanh((sub + n) * 1.8) * 0.8
    return reverb(x, 2.4 if grande else 1.4, 0.25)


def brilho():
    d = 2.2
    t = tt(d)
    x = np.zeros_like(t)
    for i, n in enumerate([88, 93, 95, 100, 105]):
        st = i * 0.045
        tt2 = np.clip(t - st, 0, None)
        x += np.sin(2 * np.pi * midi(n) * tt2) * decai(tt2, 0.003, 3.2) * (t > st)
    return reverb(x * 0.18, 2.8, 0.45, 7000)


def clique(f=2400, d=0.06, forca=1.0):
    t = tt(d)
    x = filt(ruido(d), "bandpass", [f * 0.5, f * 1.8]) * np.exp(-t * 90) * 0.9
    x += np.sin(2 * np.pi * f * 0.7 * t) * np.exp(-t * 120) * 0.4
    return x * forca


def clunk(d=0.35, f=140):
    t = tt(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 22) * 0.8
    x += filt(ruido(d), "bandpass", [300, 2500]) * np.exp(-t * 40) * 0.6
    return np.tanh(x * 1.5) * 0.7


def motor(d=1.4, f0=90, f1=160, vol=0.4):
    t = tt(d)
    f = np.linspace(f0, f1, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) * 0.5 + np.sin(2 * ph) * 0.3 + np.sign(np.sin(3 * ph)) * 0.08)
    x += filt(ruido(d), "bandpass", [800, 3000]) * 0.15
    x *= env(t, 0.08, d, 0.15)
    return filt(x, "lowpass", 3500) * vol


def bip(f=1000, d=0.12, vol=0.25):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * env(t, 0.005, d, 0.02) * vol


def ticks(n=12, intervalo=0.05, f=3200):
    out = np.zeros(int((n * intervalo + 0.1) * SR))
    for i in range(n):
        c = clique(f, 0.03, 0.5)
        a = int(i * intervalo * SR)
        out[a:a + len(c)] += c
    return out


def ding():
    t = tt(1.8)
    x = sum(np.sin(2 * np.pi * midi(84) * k * t) * np.exp(-t * (2.5 + k)) / k for k in (1, 2.76, 5.4))
    return reverb(x * 0.25, 1.8, 0.3)


def estatica(d=1.6):
    t = tt(d)
    return filt(ruido(d), "highpass", 1500) * env(t, 0.02, d, 0.4) * 0.25


def drone(d=20):
    t = tt(d)
    x = sum(saw(midi(n) * (1 + 0.002 * k), t, rng.random()) for k, n in enumerate([38, 45, 50, 57]))
    x = filt(x, "lowpass", 500) * env(t, 3, d, 4) * 0.15
    return reverb(x, 3.5, 0.4, 2500)


def ambiente_tv(d=17):
    t = tt(d)
    hum = np.sin(2 * np.pi * 60 * t) * 0.03 + np.sin(2 * np.pi * 120 * t) * 0.015
    sala = filt(ruido(d), "lowpass", 900) * 0.05
    return (hum + sala) * env(t, 1.5, d, 2.5)


def fita_corre(d=3.5):
    t = tt(d)
    x = filt(ruido(d), "bandpass", [2000, 7000]) * 0.08 + motor(d, 55, 55, 0.25)[: len(t)]
    return x * env(t, 0.3, d, 0.6)


def tambor():
    d = 3.2
    t = tt(d)
    f = 180 + 520 * (1 - np.exp(-t * 1.4))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * 0.18 + np.sin(2 * ph) * 0.06 + filt(ruido(d), "bandpass", [3000, 9000]) * 0.04
    return x * env(t, 0.3, d, 0.8)


def desliga():
    d = 1.2
    t = tt(d)
    f = 120 * np.exp(-t * 2.2) + 20
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 2.5) * 0.35


def liga_painel():
    d = 0.9
    t = tt(d)
    hum = (np.sin(2 * np.pi * 60 * t) * 0.2 + np.sin(2 * np.pi * 180 * t) * 0.06) * env(t, 0.3, d, 0.4)
    out = hum.copy()
    c = clique(1600, 0.05, 0.8)
    out[: len(c)] += c
    return out


def limpeza(d=4.0):
    t = tt(d)
    mod = 0.5 + 0.5 * np.sin(2 * np.pi * 2.4 / 2 * t) ** 2
    return filt(ruido(d), "bandpass", [1500, 6000]) * mod * env(t, 0.3, d, 0.5) * 0.1


def alerta():
    out = np.zeros(int(1.0 * SR))
    for i, f in enumerate([660, 440, 660, 440]):
        b = bip(f, 0.16, 0.22)
        a = int(i * 0.2 * SR)
        out[a:a + len(b)] += b
    return out


def sfx(nome):
    m = {
        "whoosh": lambda: whoosh(0.7), "whoosh_longo": lambda: whoosh(1.5, 200, 6000), "whoosh_curto": lambda: whoosh(0.35, 600, 5000),
        "virar": lambda: whoosh(0.5, 400, 3000, False), "transicao": lambda: whoosh(0.9, 250, 5000) * 0.6,
        "impacto_suave": lambda: impacto(False), "impacto_grande": lambda: impacto(True),
        "titulo": lambda: impacto(False) * 0.7, "brilho": brilho, "pop": lambda: clique(1800, 0.05, 0.55),
        "clique": lambda: clique(2600, 0.06, 0.9), "tique": lambda: clique(3500, 0.03, 0.6),
        "mecanico": lambda: np.concatenate([motor(0.5, 110, 140, 0.35), clunk(0.3, 120)]),
        "carrega": lambda: motor(1.5, 80, 150, 0.45), "porta": lambda: clunk(0.25, 260) * 0.6,
        "porta_fecha": lambda: clunk(0.25, 220) * 0.5, "plastico": lambda: filt(ruido(0.5), "bandpass", [1500, 5000]) * env(tt(0.5), 0.05, 0.5, 0.2) * 0.25,
        "tampa_abre": lambda: clique(1400, 0.08, 0.7), "tampa_fecha": lambda: clique(1100, 0.08, 0.8),
        "power": lambda: clunk(0.4, 90), "liga_painel": liga_painel, "desliga": desliga, "rele": lambda: clique(900, 0.08, 1.0),
        "bip": lambda: bip(1000, 0.15), "chave": lambda: clique(2000, 0.05, 0.8), "knob": lambda: ticks(10, 0.05, 2800),
        "contador": lambda: ticks(24, 0.045, 4200) * 0.6, "ding": ding, "raiox": lambda: whoosh(1.0, 2000, 9000) * 0.5,
        "carretel": lambda: motor(2.0, 60, 60, 0.15), "estatica": estatica, "limpeza": limpeza, "tambor": tambor,
        "rolo": lambda: clunk(0.3, 180) * 0.6, "fita_corre": fita_corre, "motor_para": lambda: motor(0.8, 150, 60, 0.3),
        "ejeta": lambda: np.concatenate([motor(0.9, 150, 90, 0.4), clunk(0.3, 160)]), "alerta": alerta,
        "ambiente_tv": ambiente_tv, "drone": drone, "bnc": lambda: clique(4200, 0.05, 0.9), "bnc_trava": lambda: clique(3200, 0.07, 1.0),
        "xlr": lambda: clique(2200, 0.07, 1.0) + 0, "plugue": lambda: clunk(0.2, 200) * 0.7,
        "luz_liga": lambda: np.concatenate([clunk(0.4, 70), np.sin(2 * np.pi * 60 * tt(1.2)) * env(tt(1.2), 0.1, 1.2, 0.8) * 0.08]),
    }
    return m.get(nome, lambda: clique(2000, 0.05, 0.5))()


GANHO_SFX = {"whoosh": 0.5, "whoosh_longo": 0.45, "whoosh_curto": 0.4, "transicao": 0.45, "titulo": 0.5, "impacto_grande": 0.75,
             "impacto_suave": 0.55, "brilho": 0.7, "pop": 0.45, "ambiente_tv": 0.8, "drone": 0.45, "contador": 0.6}


# ------------------------------------------------------------------ música
ACORDES = {  # (notas do pad, baixo)
    "Am": ([57, 60, 64, 69], 33), "F": ([53, 57, 60, 65], 29), "C": ([55, 60, 64, 67], 36), "G": ([55, 59, 62, 67], 31),
    "Dm": ([57, 62, 65, 69], 38), "E": ([56, 59, 64, 68], 28),
}
PROG = ["Am", "F", "C", "G"]
PROG_TRISTE = ["Dm", "Am", "F", "E"]


def pad(notas, d):
    t = tt(d)
    x = np.zeros_like(t)
    for n in notas:
        for det in (-0.07, 0.07):
            x += saw(midi(n) * 2 ** (det / 12), t, rng.random())
    x /= len(notas) * 2
    lfo = 900 + 500 * np.sin(2 * np.pi * 0.07 * t + rng.random() * 6)
    # filtro passa-baixa variável (aprox. por blocos)
    out = np.zeros_like(x)
    L = SR // 4
    for i in range(0, len(x), L):
        seg = x[max(0, i - 512):i + L]
        y = filt(seg, "lowpass", float(lfo[min(i, len(lfo) - 1)]))
        out[i:i + L] = y[(i - max(0, i - 512)):][: len(out[i:i + L])]
    return out * env(t, 1.6, d, 1.8) * 0.5


def pluck(n, d=0.5):
    t = tt(d)
    f = midi(n)
    x = (2 * np.abs(saw(f, t)) - 1) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4
    return filt(x, "lowpass", 2600) * decai(t, 0.003, 7) * 0.3


def baixo(n, d):
    t = tt(d)
    x = np.sin(2 * np.pi * midi(n) * t) + 0.25 * np.sin(4 * np.pi * midi(n) * t)
    return np.tanh(x * 1.2) * env(t, 0.05, d, 0.4) * 0.35


def kick():
    t = tt(0.5)
    f = 45 + 95 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 0.8


def hat():
    t = tt(0.07)
    return filt(ruido(0.07), "highpass", 8000) * np.exp(-t * 60) * 0.18


def sino(n, d=2.5):
    t = tt(d)
    x = sum(np.sin(2 * np.pi * midi(n) * k * t) * np.exp(-t * (1.6 + k * 0.8)) / k for k in (1, 2, 3.01))
    return x * 0.22


# intensidade da música por seção (0..1), e estilo
ESTILO = {
    "s01_introducao": (0.85, "epico"), "s02_origem": (0.55, "base"), "s03_preco": (0.55, "base"), "s04_fita_s": (0.5, "base"),
    "s05_fita_l": (0.5, "base"), "s06_videocassete": (0.6, "base"), "s07_conexoes": (0.5, "tec"), "s08_inserindo": (0.5, "tec"),
    "s09_duracao": (0.5, "base"), "s10_gravar": (0.5, "tec"), "s11_frames": (0.45, "tec"), "s12_manutencao": (0.45, "base"),
    "s13_mecanismo": (0.6, "tec"), "s14_ejetando": (0.5, "tec"), "s15_emissoras": (0.65, "base"), "s16_desligar": (0.45, "base"),
    "s17_fim": (0.35, "triste"), "s18_encerramento": (0.85, "epico"),
}


def musica():
    mus = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    for S in TL["secoes"]:
        inten, est = ESTILO[S["id"]]
        t0, t1 = S["ini"], S["fim"]
        prog = PROG_TRISTE if est == "triste" else PROG
        # alinhado à grade global de compassos
        b0 = int(np.floor(t0 / BAR))
        b = b0
        while b * BAR < t1:
            tb = b * BAR
            ac = prog[(b // 2) % 4]
            notas, raiz = ACORDES[ac]
            # pad a cada 2 compassos
            if b % 2 == 0 or b == b0:
                ini = max(tb, t0)
                d = min((b + 2 - (b % 2)) * BAR, t1 + 1.5) - ini
                place(mus, pad(notas, d + 1.0), ini, 0.55 * (0.6 + inten * 0.6), 0)
                place(mus, baixo(raiz, d), ini, 0.6 * inten if est != "triste" else 0.4, 0)
            # arpejo
            if est in ("base", "tec", "epico"):
                padrao = [0, 2, 1, 3, 2, 1, 3, 2] if est != "tec" else [0, 3, 2, 3, 1, 3, 2, 3]
                for i in range(8):
                    ts = tb + i * BEAT / 2
                    if t0 <= ts < t1 - 0.3:
                        n = notas[padrao[i] % len(notas)] + (12 if est == "tec" and i % 2 else 0)
                        place(mus, pluck(n, 0.5), ts, 0.45 * (0.5 + inten * 0.5), -0.4 if i % 2 else 0.4)
            # bateria leve
            if est in ("tec", "epico") or (est == "base" and inten >= 0.55):
                for i in range(4):
                    ts = tb + i * BEAT
                    if t0 + 1.0 <= ts < t1 - 0.4:
                        if i in (0, 2) or est == "epico":
                            place(drums, kick(), ts, 0.5 * inten)
                        place(drums, hat(), ts + BEAT / 2, 0.5 * inten, 0.3)
            if est == "triste" and b % 2 == 0:
                place(mus, sino(notas[-1] + 12, 3.0), tb + BEAT, 0.5)
            b += 1
        # sinos nos momentos-chave
        if est == "epico":
            for k, n in enumerate([81, 76, 79, 84]):
                place(mus, sino(n), t0 + 2.4 + k * BEAT, 0.6)
    mus = reverb(mus, 3.0, 0.35, 5000)[:N]
    return mus + drums


# ------------------------------------------------------------------ narração
def narracao():
    voz = np.zeros((N, 2))
    env_voz = np.zeros(N)
    for S in TL["secoes"]:
        for f in S["falas"]:
            x, sr = sf.read(BUILD / "voz" / f"{f['id']}.wav", dtype="float64")
            if x.ndim > 1:
                x = x.mean(axis=1)
            if sr != SR:
                x = resample_poly(x, SR, sr)
            # presença e corpo (EQ leve)
            x = x + filt(x, "bandpass", [2500, 5000]) * 0.25
            x = filt(x, "highpass", 80)
            t = S["ini"] + f["t"]
            place(voz, x, t, 1.0, 0.0)
            i = int(t * SR)
            env_voz[i:i + len(x)] = 1.0
    # envelope suave para o "ducking"
    k = int(0.25 * SR)
    cs = np.concatenate([[0.0], np.cumsum(env_voz)])
    i0 = np.clip(np.arange(N) - k // 2, 0, N)
    i1 = np.clip(np.arange(N) + k // 2, 0, N)
    env_voz = (cs[i1] - cs[i0]) / k  # média móvel (rápida)
    env_voz = np.clip(env_voz * 1.5, 0, 1)
    return voz, env_voz


def main():
    (BUILD / "audio").mkdir(parents=True, exist_ok=True)
    print("música...")
    mus = musica()
    print("narração...")
    voz, ev = narracao()
    print("efeitos...")
    fx = np.zeros((N, 2))
    cache = {}
    for nome, t, *resto in EV:
        vol = resto[0] if resto else 1.0
        if nome not in cache:
            cache[nome] = sfx(nome)
        x = cache[nome]
        g = GANHO_SFX.get(nome, 0.7) * vol
        pan = float(np.clip(np.sin(t * 1.7) * 0.25, -0.3, 0.3))
        place(fx, x if x.ndim == 2 else x, t, g, pan)
    fx = fx * 0.85 + reverb(fx, 0.9, 0.18, 6000)[:N] * 0.15
    # mixagem: música abaixa sob a voz
    duck = 1 - 0.62 * ev
    mix = mus[:N] * 0.42 * duck[:, None] + fx * 0.75 + voz * 1.0
    # fade no começo e no fim
    fade_in = np.clip(np.arange(N) / (1.2 * SR), 0, 1)
    fim = int(DUR * SR)
    fade_out = np.clip((fim - np.arange(N)) / (2.5 * SR), 0, 1)
    mix *= (fade_in * fade_out)[:, None]
    pico = np.max(np.abs(mix))
    mix = mix / max(pico, 1e-6) * 0.89
    sf.write(BUILD / "audio" / "mix.wav", mix[: int(DUR * SR)].astype(np.float32), SR)
    print("pronto: build/audio/mix.wav", f"{DUR:.2f}s")


if __name__ == "__main__":
    main()
