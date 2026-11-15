"""Extrai os trechos de clips.json como sequências de JPG (30 fps) e o áudio da vinheta do Agenda.

Uso: python preparar_material.py   (lê ../material, escreve em build/)
"""
import json
import pathlib
import subprocess

AQUI = pathlib.Path(__file__).parent
MATERIAL = AQUI.parent / "material"
BUILD = AQUI / "build"
clips = {k: v for k, v in json.loads((AQUI / "clips.json").read_text()).items() if not k.startswith("_")}
contagem = {}
for cid, (arquivo, ini, dur, *extra) in clips.items():
    pasta = BUILD / "frames" / cid
    pasta.mkdir(parents=True, exist_ok=True)
    for f in pasta.glob("*.jpg"):
        f.unlink()
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-ss", str(ini), "-t", str(dur), "-i", str(MATERIAL / arquivo),
        "-vf", ",".join(extra + ["fps=30", "scale='min(960,iw)':-2:flags=lanczos"]), "-q:v", "3", str(pasta / "%04d.jpg"),
    ], check=True)
    contagem[cid] = len(list(pasta.glob("*.jpg")))
    print(f"{cid:<10} {contagem[cid]:4d} quadros")
(BUILD / "frames" / "contagem.json").write_text(json.dumps(contagem, indent=2))

# áudio original da vinheta do Agenda Vanguarda 2011-2019 (cena "ACHARAM!")
(BUILD / "audio").mkdir(parents=True, exist_ok=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(MATERIAL / "02_agenda-vanguarda-2011-2019.mp4"),
                "-vn", "-ac", "2", "-ar", "48000", str(BUILD / "audio" / "agenda_original.wav")], check=True)
print("áudio do Agenda extraído")
