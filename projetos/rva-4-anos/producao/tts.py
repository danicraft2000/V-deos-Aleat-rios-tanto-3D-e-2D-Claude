"""Gera a narração com voz sintética (Kokoro, offline).

Uso: python tts.py <pasta_do_modelo> <pasta_de_saida> [voz]
A pasta do modelo precisa ter kokoro-v1.0.onnx e voices-v1.0.bin
(https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0).
"""
import json
import pathlib
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

AQUI = pathlib.Path(__file__).parent
modelo, saida = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
cfg = json.loads((AQUI / "narracao.json").read_text(encoding="utf-8"))
voz = sys.argv[3] if len(sys.argv) > 3 else cfg["voz"]
saida.mkdir(parents=True, exist_ok=True)

k = Kokoro(str(modelo / "kokoro-v1.0.onnx"), str(modelo / "voices-v1.0.bin"))
duracoes = {}
for fala in cfg["falas"]:
    audio, sr = k.create(fala["texto"], voice=voz, speed=cfg["velocidade"], lang="pt-br")
    # corta silêncio do começo e do fim
    nz = np.nonzero(np.abs(audio) > 0.01)[0]
    if len(nz):
        audio = audio[max(0, nz[0] - 240): nz[-1] + 2400]
    sf.write(saida / f"{fala['id']}.wav", audio, sr)
    duracoes[fala["id"]] = round(len(audio) / sr, 3)
    print(f"{fala['id']:<16} {duracoes[fala['id']]:5.2f}s")
(saida / "duracoes.json").write_text(json.dumps(duracoes, indent=2))
print("total", round(sum(duracoes.values()), 2), "s")
