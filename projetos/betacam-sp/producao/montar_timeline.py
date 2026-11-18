"""Monta a linha do tempo do vídeo a partir das durações reais da narração.

Uso: python montar_timeline.py   -> build/timeline.json
Cada seção: título 3D no começo, narração a partir de INICIO_FALA, frases separadas por PAUSA
(+ pausas extras onde a animação precisa de tempo), e uma "cauda" no fim.
"""
import json
import pathlib

AQUI = pathlib.Path(__file__).parent
FPS = 24
PAUSA = 0.45
INICIO_FALA = 2.1
# ajustes de ritmo por seção: pausas extras depois da frase N (1 = primeira) e cauda final
RITMO = {
    "s01_introducao": {"inicio": 5.6, "pausas": {"2": 0.6}, "cauda": 1.6},
    "s02_origem": {"pausas": {"1": 0.4, "2": 0.3, "3": 0.5}},
    "s03_preco": {"pausas": {"1": 0.5, "2": 0.4}, "cauda": 1.8},
    "s04_fita_s": {"pausas": {"2": 0.4}},
    "s05_fita_l": {"pausas": {"1": 0.6, "2": 0.4}},
    "s06_videocassete": {"inicio": 2.4, "pausas": {"1": 0.6, "2": 0.5}, "cauda": 1.6},
    "s07_conexoes": {"pausas": {"1": 0.6, "2": 0.9, "3": 0.9}, "cauda": 1.6},
    "s08_inserindo": {"pausas": {"1": 1.0, "2": 0.4, "3": 2.2}, "cauda": 2.4},
    "s09_duracao": {"pausas": {"1": 0.3, "2": 0.8, "3": 0.8}, "cauda": 1.6},
    "s10_gravar": {"pausas": {"1": 0.7, "2": 0.6, "3": 0.9}, "cauda": 1.8},
    "s11_frames": {"pausas": {"1": 0.8, "2": 0.4}, "cauda": 1.6},
    "s12_manutencao": {"pausas": {"1": 0.4, "2": 0.6, "3": 0.5}, "cauda": 1.4},
    "s13_mecanismo": {"inicio": 2.4, "pausas": {"1": 1.0, "2": 0.8, "3": 0.6, "4": 0.6}, "cauda": 1.8},
    "s14_ejetando": {"pausas": {"1": 1.0, "2": 1.2}, "cauda": 1.4},
    "s15_emissoras": {"pausas": {"1": 0.4, "2": 0.6}, "cauda": 1.6},
    "s16_desligar": {"pausas": {"1": 0.8, "2": 0.8, "3": 0.4}, "cauda": 2.0},
    "s17_fim": {"pausas": {"1": 0.6, "2": 0.6}, "cauda": 2.0},
    "s18_encerramento": {"pausas": {"1": 0.5, "2": 0.5}, "cauda": 6.0},
}

cfg = json.loads((AQUI / "narracao.json").read_text(encoding="utf-8"))
dur = json.loads((AQUI / "build" / "voz" / "duracoes.json").read_text())
q = lambda x: round(round(x * FPS) / FPS, 4)

t = 0.0
secoes = []
for sec in cfg["secoes"]:
    r = RITMO.get(sec["id"], {})
    ini = t
    tt = ini + r.get("inicio", INICIO_FALA)
    falas = []
    for j in range(len(sec["falas"])):
        fid = f"{sec['id']}_{j + 1}"
        d = dur[fid]
        falas.append({"id": fid, "t": round(tt - ini, 3), "dur": d})
        tt += d + PAUSA + r.get("pausas", {}).get(str(j + 1), 0.0)
    fim = q(tt - PAUSA + r.get("cauda", 1.3))
    secoes.append({"id": sec["id"], "numero": sec["numero"], "titulo": sec["titulo"], "ini": q(ini), "fim": fim, "falas": falas})
    t = fim

tl = {"fps": FPS, "largura": 1920, "altura": 1080, "duracao": q(t), "secoes": secoes}
(AQUI / "build" / "timeline.json").write_text(json.dumps(tl, indent=1, ensure_ascii=False), encoding="utf-8")
for s in secoes:
    print(f"{s['id']:<20} {s['ini']:7.2f} -> {s['fim']:7.2f}  ({s['fim'] - s['ini']:5.2f}s)")
print(f"duração total: {t:.2f}s = {int(t // 60)}:{t % 60:05.2f}  ({round(t * FPS)} quadros)")
