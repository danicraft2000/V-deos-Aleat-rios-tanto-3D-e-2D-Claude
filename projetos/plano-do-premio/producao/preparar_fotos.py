"""Prepara as fotos (enviadas pelo Daniel) para os cartões 3D: limpa o fundo, corta as bordas brancas
e monta console + controle num quadro branco de 1000x700 (mistura "multiply", então o branco some).

Uso: python preparar_fotos.py  ->  build/fotos/*.png
"""
import pathlib

import numpy as np
from PIL import Image
from scipy import ndimage

AQUI = pathlib.Path(__file__).parent
FOTOS = AQUI.parent / "referencias" / "fotos"
OUT = AQUI / "build" / "fotos"
OUT.mkdir(parents=True, exist_ok=True)
CW, CH = 1000, 700


def carregar(nome):
    im = Image.open(FOTOS / nome).convert("RGBA")
    fundo = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return np.array(Image.alpha_composite(fundo, im).convert("RGB")).astype(np.float32)


def limpar_fundo(a, limiar=200):
    """Pinta de branco o fundo claro ligado às bordas (flood fill)."""
    claro = a.mean(-1) > limiar
    rot, _ = ndimage.label(claro)
    bordas = set(np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))) - {0}
    fundo = np.isin(rot, list(bordas))
    fundo = ndimage.binary_dilation(fundo, iterations=1)
    a = a.copy()
    a[fundo] = 255
    return a


def aparar(a, limiar=245, margem=6):
    m = a.min(-1) < limiar
    ys, xs = np.nonzero(m)
    y0, y1 = max(0, ys.min() - margem), min(a.shape[0], ys.max() + margem)
    x0, x1 = max(0, xs.min() - margem), min(a.shape[1], xs.max() + margem)
    return a[y0:y1, x0:x1]


def encaixar(card, a, caixa):
    """Redimensiona a (mantendo proporção) para caber na caixa e multiplica no cartão (centralizado)."""
    x0, y0, x1, y1 = caixa
    h, w = a.shape[:2]
    s = min((x1 - x0) / w, (y1 - y0) / h)
    nw, nh = max(1, int(w * s)), max(1, int(h * s))
    im = np.array(Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)).astype(np.float32)
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    px, py = cx - nw // 2, cy - nh // 2
    reg = card[py:py + nh, px:px + nw]
    card[py:py + nh, px:px + nw] = reg * im / 255.0


def clarear(a, ponto=242.0):
    """Leva o quase-branco do fundo das fotos para branco puro."""
    return np.minimum(255.0, a * 255.0 / ponto)


def recorte(nome, foto, limiar=236):
    """PNG com fundo transparente (para usar sobre o fundo escuro do vídeo)."""
    a = aparar(carregar(foto))
    claro = a.min(-1) > limiar
    rot, _ = ndimage.label(claro)
    bordas = set(np.unique(np.concatenate([rot[0], rot[-1], rot[:, 0], rot[:, -1]]))) - {0}
    fundo = np.isin(rot, list(bordas))
    alfa = ndimage.binary_fill_holes(~fundo).astype(np.float32)
    alfa = ndimage.binary_erosion(alfa > 0.5, iterations=1).astype(np.float32)
    alfa = ndimage.gaussian_filter(alfa, 1.0)
    rgba = np.dstack([a, alfa * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / f"{nome}.png")
    print("ok", OUT / f"{nome}.png")


def cartao(nome, console, controle=None, ps2=False):
    card = np.full((CH, CW, 3), 255.0, np.float32)
    a = carregar(console)
    if ps2:
        a = limpar_fundo(a, 200)
    a = aparar(a)
    larga = a.shape[1] / a.shape[0] > 1.3
    if controle is None:
        encaixar(card, a, (50, 40, 950, 660))
    elif larga:
        encaixar(card, a, (60, 30, 940, 455))
        encaixar(card, aparar(carregar(controle)), (330, 430, 690, 680))
    else:
        encaixar(card, a, (40, 30, 560, 670))
        encaixar(card, aparar(carregar(controle)), (520, 250, 970, 640))
    card = clarear(card)
    Image.fromarray(card.clip(0, 255).astype(np.uint8)).save(OUT / f"{nome}.png")
    print("ok", OUT / f"{nome}.png")


cartao("ps1", "ps1-console.webp", "ps1-controle.jpg")
cartao("ps2", "ps2-console.webp", "ps2-controle.jpg", ps2=True)
cartao("ps3", "ps3-console.jpg", "ps3-controle.jpg")
cartao("ps4", "ps4-console.jpg", "ps4-controle.jpg")
cartao("ps5", "ps5-console-controle.jpg")
cartao("tablet", "tab-s11-ultra.jpg")
recorte("ps1-controle-recorte", "ps1-controle.jpg", 240)
recorte("ps4-controle-recorte", "ps4-controle.jpg", 125)
