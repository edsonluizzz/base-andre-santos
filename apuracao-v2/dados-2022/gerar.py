#!/usr/bin/env python3
"""Gera apuracao/dados-2022/pr-2022.json.gz a partir dos Dados Abertos do TSE (1º turno de 2022).

Uso: python3 apuracao/dados-2022/gerar.py <pasta com os CSV>
Os CSV vêm de https://cdn.tse.jus.br/estatistica/sead/odsele/ :
  votacao_candidato_munzona_2022.zip  -> ..._PR.csv e ..._BR.csv
  votacao_partido_munzona_2022.zip    -> ..._PR.csv
  detalhe_votacao_munzona_2022.zip    -> ..._PR.csv e ..._BR.csv
"""
import csv, gzip, json, sys
from collections import defaultdict

pasta = sys.argv[1]
CARGOS = {"1": "presPr", "3": "governador", "5": "senador", "6": "federal", "7": "estadual"}
VAGAS = {"presPr": 1, "governador": 1, "senador": 1, "federal": 30, "estadual": 54, "presBr": 1}


def ler(nome):
    with open(f"{pasta}/{nome}", encoding="latin-1", newline="") as f:
        for linha in csv.DictReader(f, delimiter=";"):
            if linha["NR_TURNO"] == "1":
                yield linha


def situacao(ds):
    ds = ds.strip()
    if ds.startswith("#"):
        return "", "n"
    texto = {"ELEITO POR QP": "Eleito por QP", "ELEITO POR MÉDIA": "Eleito por média"}.get(ds, ds.capitalize())
    return texto, "s" if ds.startswith("ELEITO") or "TURNO" in ds else "n"


def montar(linhas_cand, linhas_det, linhas_part, chave_local, nome_local, cargos):
    locais = {}  # cd -> {nome, secoes, aptos, comparecimento}
    validos = defaultdict(lambda: defaultdict(int))  # cargo -> cd -> válidos
    for l in linhas_det:
        cargo = cargos.get(l["CD_CARGO"])
        if not cargo:
            continue
        cd = l[chave_local]
        validos[cargo][cd] += int(l["QT_TOTAL_VOTOS_VALIDOS"])
        if cargo == next(iter(cargos.values())):  # seções/eleitores contados uma vez
            loc = locais.setdefault(cd, {"cd": cd, "nome": l[nome_local], "secoes": 0, "aptos": 0, "comparecimento": 0})
            loc["secoes"] += int(l["QT_TOTAL_SECOES"])
            loc["aptos"] += int(l["QT_APTOS"])
            loc["comparecimento"] += int(l["QT_COMPARECIMENTO"])
    ordem = sorted(locais)
    pos = {cd: i for i, cd in enumerate(ordem)}

    cands = defaultdict(dict)  # cargo -> numero -> info
    votos = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))  # cargo -> cd -> numero -> votos
    for l in linhas_cand:
        cargo = cargos.get(l["CD_CARGO"])
        if not cargo or l[chave_local] not in pos:
            continue
        n = l["NR_CANDIDATO"]
        st, e = situacao(l["DS_SIT_TOT_TURNO"])
        fed = l.get("SG_FEDERACAO", "#NULO#")
        cands[cargo].setdefault(n, {"n": n, "nome": l["NM_URNA_CANDIDATO"], "partido": l["SG_PARTIDO"], "st": st, "e": e,
                                    **({"federacao": fed} if fed and not fed.startswith("#") else {})})
        votos[cargo][l[chave_local]][n] += int(l["QT_VOTOS_NOMINAIS_VALIDOS"])

    legenda = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))  # cargo -> cd -> partido -> votos
    for l in linhas_part:
        cargo = cargos.get(l["CD_CARGO"])
        if cargo and l[chave_local] in pos:
            legenda[cargo][l[chave_local]][l["SG_PARTIDO"]] += int(l["QT_TOTAL_VOTOS_LEG_VALIDOS"])

    saida = {}
    for cargo in cargos.values():
        lista = sorted(cands[cargo].values(), key=lambda c: c["n"])
        idx = {c["n"]: i for i, c in enumerate(lista)}
        partidos = sorted({c["partido"] for c in lista} | {p for cd in legenda[cargo] for p in legenda[cargo][cd]})
        pidx = {p: i for i, p in enumerate(partidos)}
        saida[cargo] = {
            "vagas": VAGAS[cargo],
            "candidatos": lista,
            "partidos": partidos,
            "validos": [validos[cargo][cd] for cd in ordem],
            "votos": [[x for n, v in sorted(votos[cargo][cd].items()) if v for x in (idx[n], v)] for cd in ordem],
            "legenda": [[x for p, v in sorted(legenda[cargo][cd].items()) if v for x in (pidx[p], v)] for cd in ordem],
        }
    return [locais[cd] for cd in ordem], saida


municipios, cargos_pr = montar(
    ler("votacao_candidato_munzona_2022_PR.csv"), ler("detalhe_votacao_munzona_2022_PR.csv"),
    ler("votacao_partido_munzona_2022_PR.csv"), "CD_MUNICIPIO", "NM_MUNICIPIO",
    {"7": "estadual", "6": "federal", "5": "senador", "3": "governador"})
# Presidente no PR: mesmas linhas do arquivo nacional, filtradas pelo estado.
_, pres_pr = montar(
    (l for l in ler("votacao_candidato_munzona_2022_BR.csv") if l["SG_UF"] == "PR"),
    (l for l in ler("detalhe_votacao_munzona_2022_BR.csv") if l["SG_UF"] == "PR"),
    [], "CD_MUNICIPIO", "NM_MUNICIPIO", {"1": "presPr"})
ufs, pres_br = montar(
    ler("votacao_candidato_munzona_2022_BR.csv"), ler("detalhe_votacao_munzona_2022_BR.csv"),
    [], "SG_UF", "SG_UF", {"1": "presBr"})

dados = {
    "ano": 2022, "turno": 1,
    "fonte": "TSE, Portal de Dados Abertos: votacao_candidato_munzona, votacao_partido_munzona e detalhe_votacao_munzona de 2022",
    "municipios": municipios, "cargos": {**cargos_pr, **pres_pr},
    "ufs": ufs, "presBr": pres_br["presBr"],
}
destino = __file__.rsplit("/", 1)[0] + "/pr-2022.json.gz"
with gzip.open(destino, "wt", encoding="utf-8") as f:
    json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))
print(destino, len(municipios), "municípios,", len(ufs), "UFs")
for c, d in dados["cargos"].items():
    print(" ", c, len(d["candidatos"]), "candidatos, válidos", sum(d["validos"]))
print("  presBr", len(pres_br["presBr"]["candidatos"]), "candidatos, válidos", sum(pres_br["presBr"]["validos"]))
