"""Gera a narração com voz sintética (Kokoro, offline), uma frase por arquivo.

Uso: python tts.py <pasta_do_modelo> [voz]
  -> build/voz/<secao>_<n>.wav  +  build/voz/duracoes.json
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
SAIDA = AQUI / "build" / "voz"
modelo = pathlib.Path(sys.argv[1])
cfg = json.loads((AQUI / "narracao.json").read_text(encoding="utf-8"))
voz = sys.argv[2] if len(sys.argv) > 2 else cfg["voz"]
SAIDA.mkdir(parents=True, exist_ok=True)

k = Kokoro(str(modelo / "kokoro-v1.0.onnx"), str(modelo / "voices-v1.0.bin"))
duracoes = {}
for sec in cfg["secoes"]:
    for i, texto in enumerate(sec["falas"]):
        fid = f"{sec['id']}_{i + 1}"
        audio, sr = k.create(texto, voice=voz, speed=cfg["velocidade"], lang="pt-br")
        # corta o silêncio do começo e do fim (deixa um respiro curto)
        nz = np.nonzero(np.abs(audio) > 0.008)[0]
        if len(nz):
            audio = audio[max(0, nz[0] - 480): nz[-1] + 3600]
        sf.write(SAIDA / f"{fid}.wav", audio, sr)
        duracoes[fid] = round(len(audio) / sr, 3)
        print(f"{fid:<24} {duracoes[fid]:5.2f}s")
(SAIDA / "duracoes.json").write_text(json.dumps(duracoes, indent=2))
print("total", round(sum(duracoes.values()), 2), "s")
