"""Monta timeline.json a partir de narracao.json + build/voz/duracoes.json.

As cenas seguem a narração: cada cena começa um pouco antes da primeira fala dela
e termina quando a próxima começa. Vídeo e áudio leem o mesmo arquivo.
"""
import json
import pathlib

AQUI = pathlib.Path(__file__).parent
cfg = json.loads((AQUI / "narracao.json").read_text(encoding="utf-8"))
dur = json.loads((AQUI / "build" / "voz" / "duracoes.json").read_text())

INICIO = 2.2      # a abertura tem um respiro antes da primeira fala
ANTES = 0.55      # a cena entra este tanto antes da primeira fala dela
EXTRA = {"pai": 0.6, "regra": 0.3, "final": 0.2}  # respiro a mais na entrada de algumas cenas

falas, cenas = [], []
t = INICIO
for i, f in enumerate(cfg["falas"]):
    if i == 0 or f["cena"] != cfg["falas"][i - 1]["cena"]:
        t += EXTRA.get(f["cena"], 0.0)
        ini = 0.0 if i == 0 else round(t - ANTES, 3)
        if cenas:
            cenas[-1]["fim"] = ini
        cenas.append({"id": f["cena"], "ini": ini})
    d = dur[f["id"]]
    falas.append({"id": f["id"], "t": round(t, 3), "dur": d, "legenda": f["legenda"]})
    t += d + f["pausa"]
duracao = round(t, 2)
cenas[-1]["fim"] = duracao

tl = {
    "_obs": "Gerado por montar_timeline.py (não editar à mão). Segundos.",
    "fps": 30, "largura": 1920, "altura": 1080, "duracao": duracao, "bpm": 92,
    "cenas": cenas, "falas": falas,
}
(AQUI / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
for c in cenas:
    print(f"{c['id']:<10} {c['ini']:7.2f} → {c['fim']:7.2f}  ({c['fim'] - c['ini']:5.2f}s)")
print("duração", duracao, "s =", int(duracao * 30), "quadros a 30 fps")
