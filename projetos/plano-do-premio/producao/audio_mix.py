"""Monta a trilha do vídeo: música lo-fi sintetizada (livre de direitos), efeitos, narração com "ducking".

Uso: python audio_mix.py   ->  build/audio/mix.wav (48 kHz, estéreo)
Lê timeline.json (a mesma linha do tempo do vídeo) e build/voz/*.wav.
Os efeitos usam os mesmos tempos das animações (início das falas + deslocamentos de scenes.js).
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
rng = np.random.default_rng(2026)
BEAT = 60 / TL["bpm"]
S16 = BEAT / 4
F = {f["id"]: f["t"] for f in TL["falas"]}
FE = {f["id"]: f["t"] + f["dur"] for f in TL["falas"]}
CENA = {c["id"]: c for c in TL["cenas"]}


# ------------------------------------------------------------------ utilidades
def tt(d):
    return np.arange(int(d * SR)) / SR


def filt(x, kind, f, order=2):
    w = [fi / (SR / 2) for fi in f] if isinstance(f, (list, tuple)) else f / (SR / 2)
    return sosfilt(butter(order, w, btype=kind, output="sos"), x)


def noise(d):
    return rng.standard_normal(int(d * SR))


def place(buf, x, t, gain=1.0, pan=0.0):
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


def env_ad(t, a=0.005, d=0.3):
    return np.minimum(1, t / a) * np.exp(-np.maximum(0, t - a) / d)


# ------------------------------------------------------------------ instrumentos (lo-fi)
def epiano(n, d, vel=1.0):
    """Piano elétrico: senoide + harmônicos com sino no ataque e trêmolo leve."""
    t = tt(d + 0.6)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t + 0.3) * np.exp(-t * 3)
    x += 0.18 * np.sin(2 * np.pi * 7.02 * f * t) * np.exp(-t * 14)  # "tine"
    e = np.minimum(1, t / 0.006) * np.exp(-t / 1.4) * np.minimum(1, np.maximum(0, (d + 0.6 - t) / 0.5))
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return x * e * trem * 0.22 * vel


def acorde(notas, d, vel=1.0):
    out = None
    for k, n in enumerate(notas):
        x = epiano(n, d, vel * (0.9 if k else 1.0))
        x = np.pad(x, (int(k * 0.012 * SR), 0))  # dedilhado sutil
        out = x if out is None else _soma(out, x)
    return out / max(1, len(notas) ** 0.5)


def _soma(a, b):
    n = max(len(a), len(b))
    return np.pad(a, (0, n - len(a))) + np.pad(b, (0, n - len(b)))


def baixo(n, d):
    t = tt(d)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return filt(x, "lowpass", 500) * env_ad(t, 0.01, d * 0.8) * 0.5


def bumbo():
    t = tt(0.4)
    f = 45 + 90 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 8)
    return np.tanh(x * 1.3) * 0.75


def caixa_lofi():
    t = tt(0.25)
    n = filt(noise(0.25), "bandpass", [900, 5000]) * np.exp(-t * 20)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)
    return (n * 0.55 + tone * 0.35) * 0.55


def chimbal(aberto=False):
    d = 0.18 if aberto else 0.05
    t = tt(d)
    return filt(noise(d), "highpass", 6500) * np.exp(-t * (16 if aberto else 80)) * 0.22


def pad(notas, d):
    t = tt(d)
    x = np.zeros_like(t)
    for n in notas:
        for det in (-0.08, 0.08):
            x += np.sin(2 * np.pi * midi(n) * 2 ** (det / 12) * t)
    x = filt(x, "lowpass", 1800)
    e = np.minimum(1, t / 1.0) * np.minimum(1, (d - t) / 0.8)
    return x * e * 0.05


def sino(n, d=0.6):
    t = tt(d)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 3.01 * t) * np.exp(-t * 6)
    return x * env_ad(t, 0.003, 0.25) * 0.16


# Cmaj7 – Am7 – Dm7 – G7 (um acorde por compasso)
PROG = [([60, 64, 67, 71], 36), ([57, 60, 64, 67], 33), ([62, 65, 69, 72], 38), ([55, 59, 62, 65], 31)]
BUMBO, CAIXA, CH, CHA = bumbo(), caixa_lofi(), chimbal(), chimbal(True)


def secao(mus, drums, t0, t1, modo):
    """Toca a progressão de t0 a t1. modo: 'cheio', 'leve', 'emocao', 'final'."""
    compasso = BEAT * 4
    k = 0
    tbar = t0
    while tbar < t1 - 0.05:
        notas, raiz = PROG[k % 4]
        d = min(compasso, t1 - tbar)
        voicing = notas if modo != "emocao" else [n + 12 for n in notas[:3]]
        place(mus, acorde(voicing, d * 0.95, 1.0 if modo != "leve" else 0.8), tbar, 1.0, pan=-0.1)
        if modo in ("cheio", "final", "leve"):
            place(mus, baixo(raiz, BEAT * 1.8), tbar, 1.0)
            place(mus, baixo(raiz + (7 if k % 2 else 12), BEAT * 1.6), tbar + BEAT * 2.5, 0.8)
        if modo == "emocao":
            place(mus, pad([n + 12 for n in notas], d), tbar, 1.2)
            place(mus, baixo(raiz, compasso * 0.9), tbar, 0.7)
        # bateria
        if modo in ("cheio", "final", "leve"):
            for s in range(16):
                ts = tbar + s * S16 + (0.018 if s % 2 else 0)  # swing
                if ts >= t1:
                    break
                if modo != "leve" and s in (0, 7, 10):
                    place(drums, BUMBO, ts, 0.9)
                elif modo == "leve" and s in (0, 10):
                    place(drums, BUMBO, ts, 0.6)
                if s in (4, 12):
                    place(drums, CAIXA, ts, 0.7 if modo != "leve" else 0.45)
                if s % 2 == 0:
                    place(drums, CH, ts, 0.8 if s % 4 else 0.5, pan=0.3)
                if s == 14:
                    place(drums, CHA, ts, 0.5, pan=-0.3)
        # melodia de sinos (só nas seções cheias)
        if modo in ("cheio", "final") and k % 2 == 1:
            mel = [notas[3] + 12, notas[2] + 12, notas[1] + 12, notas[2] + 12]
            for j, n in enumerate(mel):
                tj = tbar + j * BEAT * 0.75 + BEAT
                if tj < t1:
                    place(mus, sino(n), tj, 0.9, pan=0.3)
        k += 1
        tbar += compasso


def chiado_vinil(d):
    """Chiado + estalos de disco (o clima 'vintage' do RVA)."""
    x = filt(noise(d), "bandpass", [1500, 9000]) * 0.006
    n_estalos = int(d * 3)
    for _ in range(n_estalos):
        i = rng.integers(0, len(x) - 200)
        x[i:i + 40] += rng.uniform(0.05, 0.15) * np.exp(-np.arange(40) / 6) * rng.choice([-1, 1])
    return x


# ------------------------------------------------------------------ efeitos
def whoosh(d=0.55):
    t = tt(d)
    x = noise(d)
    lo = filt(x, "bandpass", [250, 900])
    hi = filt(x, "bandpass", [1500, 7000])
    w = np.sin(np.pi * t / d)
    return (lo * (1 - t / d) + hi * (t / d) * 0.8) * w ** 2 * 0.55


def moeda(f0=None):
    t = tt(0.35)
    f0 = f0 or rng.uniform(2600, 3400)
    x = sum(np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * dcy) for r, dcy in [(1, 18), (1.47, 24), (2.09, 30), (2.83, 40)])
    x += filt(noise(0.35), "highpass", 5000) * np.exp(-t * 120) * 0.5
    return x * 0.12


def tilintar(n=10, d=0.6):
    out = np.zeros(int((d + 0.4) * SR))
    for k in range(n):
        x = moeda()
        i = int(rng.uniform(0, d) * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.7
    return out


def registradora():
    out = np.zeros(int(1.4 * SR))
    # "tchac" da gaveta + sino
    t = tt(0.12)
    x = filt(noise(0.12), "bandpass", [800, 4000]) * np.exp(-t * 40) * 0.6
    out[: len(x)] += x
    t = tt(1.2)
    b = (np.sin(2 * np.pi * 2093 * t) + 0.5 * np.sin(2 * np.pi * 2637 * t) + 0.3 * np.sin(2 * np.pi * 4186 * t)) * np.exp(-t * 3.2) * 0.3
    i = int(0.1 * SR)
    out[i:i + len(b)] += b
    tl = tilintar(8, 0.4)
    out[: len(tl)] += tl * 0.8
    return out


def ding():
    t = tt(1.4)
    return (np.sin(2 * np.pi * 1318.5 * t) + 0.4 * np.sin(2 * np.pi * 2637 * t)) * np.exp(-t * 3) * 0.26


def pop():
    t = tt(0.09)
    f = 450 + 900 * t / 0.09
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35) * 0.45


def clique(f=2400):
    t = tt(0.03)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 180) * 0.5


def carimbo():
    t = tt(0.35)
    x = np.sin(2 * np.pi * 80 * t) * np.exp(-t * 14) + filt(noise(0.35), "bandpass", [300, 3000]) * np.exp(-t * 30) * 0.8
    return np.tanh(x * 1.5) * 0.7


def erro():
    t = tt(0.5)
    x = np.sign(np.sin(2 * np.pi * 140 * t)) + np.sign(np.sin(2 * np.pi * 148 * t))
    return np.tanh(filt(x, "lowpass", 2200) * 0.7) * np.minimum(1, (0.5 - t) / 0.05) * 0.3


def bip_erro():
    t = tt(0.24)
    x = np.sign(np.sin(2 * np.pi * np.where(t < 0.12, 660, 440) * t)) * 0.18
    return filt(x, "lowpass", 4000)


def brilho():
    out = np.zeros(int(1.3 * SR))
    for k, n in enumerate([84, 88, 91, 96]):
        t = tt(1.1)
        x = (np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(2 * np.pi * midi(n) * 2.76 * t)) * np.exp(-t * 4)
        i = int(k * 0.05 * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.11
    return out


def virar():
    return whoosh(0.32) * 0.8


def batida_coracao():
    t = tt(0.25)
    return np.sin(2 * np.pi * (55 + 30 * np.exp(-t * 20)) * t) * np.exp(-t * 16) * 0.9


def estatica(d=0.8):
    return filt(noise(d), "bandpass", [800, 6000]) * np.minimum(1, (d - tt(d)) / 0.3) * 0.12


def tique_contador(d=1.0, n=14):
    out = np.zeros(int((d + 0.1) * SR))
    for k in range(1, n):
        p = k / n
        tk = (1 - (1 - p) ** (1 / 3)) * d
        x = clique(2800 + 40 * k)
        i = int(tk * SR)
        out[i:i + len(x)] += x[: len(out) - i] * 0.5
    return out


def impacto():
    d = 1.4
    t = tt(d)
    f = 65 * np.exp(-t * 1.5) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
    x += filt(noise(d), "highpass", 4000) * np.exp(-t * 2.5) * 0.3
    return np.tanh(x * 1.3) * 0.8


def eventos():
    ev = []  # (tempo, som, ganho)
    add = lambda t, s, g=1.0: ev.append((t, s, g))
    # transições
    for c in TL["cenas"][1:]:
        add(c["ini"] - 0.3, "whoosh", 0.9)
    # abertura
    add(0.8, "brilho", 1.0)
    add(1.0, "pop")
    add(F["n01a"] + 0.4, "pop")
    for dt in (1.6, 4.6, 5.8):
        add(F["n01b"] + dt, "pop", 0.7)
    # prêmio
    a, b, c, d = F["n02a"], F["n02b"], F["n02c"], F["n02d"]
    for i in range(35):
        add(a + 0.2 + i * 0.045 + 0.3, "moeda", 0.5)
    for i in range(20):
        add(b + 0.15 + i * 0.05 + 0.3, "moeda", 0.5)
    add(a + 0.3, "contador_lento")
    add(b + 0.3, "contador")
    add(b + 2.0, "ding")
    add(c + 0.1, "whoosh", 0.8)
    add(c + 0.4, "tilintar")
    for k, dt in enumerate([1.25, 1.85, 2.4, 2.9]):
        add(c + dt, "pop", 0.8)
    add(d, "registradora", 1.0)
    # avisos
    for id_ in ("n03b", "n03c", "n03d"):
        add(F[id_] - 0.25, "virar")
    add(F["n03a"] - 0.2, "pop")
    # lista
    for dt in (F["n04b"], F["n04c"], F["n04d"], F["n04d"] + 2.0):
        add(dt, "pop")
        add(dt + 0.3, "clique", 0.6)
    add(F["n04e"] + 1.0, "carimbo")
    add(F["n04e"] + 1.0, "erro", 0.8)
    add(F["n04e"] + 2.4, "bip_erro")
    # presente do pai
    add(F["n05a"] - 0.1, "brilho", 0.8)
    for id_ in ("n05b", "n05c", "n05d", "n05e", "n05f"):
        add(F[id_] - 0.35, "whoosh", 0.5)
        add(F[id_] - 0.1, "brilho", 0.9)
    add(F["n05g"] + 1.8, "ding")
    # dicas
    add(F["n06a"] - 0.4, "whoosh", 0.6)
    for id_ in ("n06b", "n06c", "n06d"):
        add(F[id_] - 0.1, "pop", 0.8)
    add(F["n06e"] - 0.1, "bip_erro")
    # vale a pena (batidas do coração seguem a mesma fórmula do vídeo: período 0.95 s)
    cv = CENA["vale"]
    tb = np.ceil(cv["ini"] / 0.95) * 0.95
    while tb < cv["fim"] - 0.2:
        add(tb + 0.05 * 0.95 - 0.03, "coracao", 0.8)
        add(tb + 0.25 * 0.95 - 0.03, "coracao", 0.5)
        tb += 0.95
    add(F["n07a"] + 1.0, "carimbo")
    for i in range(3):
        add(F["n07b"] + 3.0 + i * 0.55, "pop", 0.8)
    add(F["n07c"] + 0.3, "whoosh", 0.9)
    add(F["n07c"] + 1.6, "brilho")
    # regra
    add(F["n08a"] - 0.2, "brilho", 0.7)
    for id_ in ("n08b", "n08c", "n08d"):
        add(F[id_] - 0.1, "pop")
        add(F[id_] + 0.05, "whoosh", 0.4)
    # caixa
    tb, tc, td, te = F["n09b"], F["n09c"], F["n09d"], F["n09e"]
    add(tb + 0.2, "whoosh", 0.5)
    add(tc + 0.2, "whoosh", 0.5)
    add(td + 1.2, "contador")
    add(td + 2.2, "contador")
    for k in range(6):
        add(td + 2.6 + k * 0.09 + 0.35, "moeda", 0.45)
    for k in range(10):
        add(td + 3.6 + k * 0.09 + 0.35, "moeda", 0.45)
    add(te + 0.35, "carimbo", 0.6)
    add(te + 0.75, "clique", 1.0)
    add(te + 0.8, "ding", 0.8)
    # trilhas
    add(F["n10a"] - 0.3, "estatica")
    add(F["n10b"] + 1.2, "bip_erro")
    add(F["n10b"] + 4.0, "ding", 0.8)
    add(F["n10c"] + 1.2, "pop", 0.7)
    add(F["n10c"] + 3.2, "pop", 0.7)
    add(F["n10c"] + 5.0, "contador")
    add(F["n10c"] + 8.0, "ding", 0.8)
    for dt in (0.2, 1.6, 4.4):
        add(F["n10d"] + dt, "pop", 0.8)
    # flipaclip
    add(F["n11a"] + 0.8, "contador")
    add(F["n11a"] + 2.2, "pop")
    add(F["n11a"] + 5.6, "carimbo")
    # tablet
    add(F["n12a"] + 1.2, "pop", 0.8)
    add(F["n12a"] + 3.8, "pop", 0.8)
    add(F["n12b"] - 0.1, "virar")
    add(F["n12c"] - 0.1, "virar")
    add(F["n12d"], "ding")
    # cenários
    a = F["n13a"]
    for dt in (-0.2, 2.4, 4.9):
        add(a + dt, "whoosh", 0.5)
        add(a + dt + 0.4, "pop", 0.8)
    for dt in (3.2, 4.3, 5.6):
        add(F["n13b"] + dt, "clique", 0.8)
    # final
    for i in range(3):
        add(F["n14a"] + 0.2 + i * 1.1, "pop")
    add(F["n14b"], "brilho")
    add(F["n14b"] + 0.35, "impacto")
    for i in range(4):
        add(F["n14b"] + 1.8 + i * 0.35, "pop", 0.7)
    add(F["n14b"] + 0.4, "tilintar", 0.8)
    return ev


SONS = {
    "whoosh": whoosh, "moeda": moeda, "tilintar": lambda: tilintar(14, 1.0), "registradora": registradora,
    "ding": ding, "pop": pop, "clique": clique, "carimbo": carimbo, "erro": erro, "bip_erro": bip_erro,
    "brilho": brilho, "virar": virar, "coracao": batida_coracao, "estatica": estatica,
    "contador": lambda: tique_contador(1.0, 14), "contador_lento": lambda: tique_contador(1.6, 20), "impacto": impacto,
}


# ------------------------------------------------------------------ montagem
MODOS = {
    "abertura": "cheio", "premio": "cheio", "avisos": "leve", "lista": "cheio", "pai": "cheio", "dicas": "leve",
    "vale": "emocao", "regra": "cheio", "caixa": "leve", "trilhas": "cheio", "flipaclip": "leve", "tablet": "cheio",
    "cenarios": "leve", "final": "final",
}


def main():
    mus = np.zeros((N, 2))
    drums = np.zeros((N, 2))
    # seções musicais alinhadas aos compassos a partir do início de cada cena
    for c in TL["cenas"]:
        parte_m, parte_d = np.zeros((N, 2)), np.zeros((N, 2))
        fim = c["fim"] if c["id"] != "final" else DUR - 2.4
        secao(parte_m, parte_d, c["ini"], fim, MODOS[c["id"]])
        a, b = int(c["ini"] * SR), int(min(c["fim"] + 0.8, DUR) * SR)
        g = np.zeros(N)
        g[a:b] = 1
        r = int(0.05 * SR)
        g[a:a + r] = np.linspace(0, 1, r)
        g[b - int(0.8 * SR):b] *= np.linspace(1, 0, int(0.8 * SR))
        mus += parte_m * g[:, None]
        drums += parte_d * g[:, None]
    # acorde final
    place(mus, acorde([48, 60, 64, 67, 71, 74], 2.6, 1.3), DUR - 2.5, 1.0)
    place(mus, brilho(), DUR - 2.5, 0.8)
    musica = mus * 0.9 + drums * 0.75
    musica = filt(musica.T, "lowpass", 9000).T  # mais "quentinho"
    vin = chiado_vinil(DUR + 1)[:N]
    musica[: len(vin)] += vin[:, None]

    # narração
    voz = np.zeros((N, 2))
    for f in TL["falas"]:
        x, sr = sf.read(BUILD / "voz" / f"{f['id']}.wav")
        if sr != SR:
            x = resample_poly(x, SR, sr)
        x = filt(x, "highpass", 85)
        place(voz, x * 1.15, f["t"])
    # ducking: música abaixa quando a voz fala
    env = np.abs(voz[:, 0])
    win = int(0.05 * SR)
    env = np.convolve(env, np.ones(win) / win, mode="same")
    env = np.minimum(1, env / 0.04)
    blocos = env[::64].copy()
    rel = np.exp(-1 / (0.3 * SR / 64))
    for i in range(1, len(blocos)):
        blocos[i] = max(blocos[i], blocos[i - 1] * rel)
    sm = np.repeat(blocos, 64)[:N]
    musica *= (1 - 0.68 * sm)[:, None]

    fx = np.zeros((N, 2))
    for t, nome, g in eventos():
        place(fx, SONS[nome](), t, g * 0.8, pan=float(rng.uniform(-0.3, 0.3)))

    mix = musica * 0.42 + voz * 1.0 + fx * 0.6
    mix = mix[: int(DUR * SR)]
    end = int(1.0 * SR)
    mix[-end:] *= np.linspace(1, 0, end)[:, None] ** 2
    mix = np.tanh(mix * 1.05) / np.tanh(1.05)
    mix /= max(1e-6, np.max(np.abs(mix))) / 0.95
    (BUILD / "audio").mkdir(parents=True, exist_ok=True)
    sf.write(BUILD / "audio" / "mix.wav", mix.astype(np.float32), SR, subtype="FLOAT")
    # trilhas separadas para conferência
    n = int(DUR * SR)
    sf.write(BUILD / "audio" / "musica.wav", (musica[:n] * 0.42).astype(np.float32), SR, subtype="FLOAT")
    sf.write(BUILD / "audio" / "voz.wav", voz[:n].astype(np.float32), SR, subtype="FLOAT")
    sf.write(BUILD / "audio" / "efeitos.wav", (fx[:n] * 0.6).astype(np.float32), SR, subtype="FLOAT")
    print("mix pronto:", BUILD / "audio" / "mix.wav", f"{DUR:.1f}s")


if __name__ == "__main__":
    main()
