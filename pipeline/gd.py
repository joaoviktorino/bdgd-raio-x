"""GD × capacidade: geração distribuída comparada com a potência dos transformadores.

Lê do .gdb só as colunas necessárias e grava dados/processados/gd.json com:
  - totais de GD em baixa tensão (UGBT_tab) e média tensão (UGMT_tab): unidades e
    potência instalada (POT_INST, kW);
  - capacidade de cada transformador: soma da potência nominal dos equipamentos
    (EQTRMT.POT_NOM, código do domínio TPOTAPRT traduzido pela coluna "pot", em kVA),
    conferida com UNTRMT.POT_NOM;
  - por alimentador: geradores de BT, potência, capacidade dos transformadores e a
    razão GD / capacidade;
  - por transformador, só os que têm 3 ou mais geradores: a distribuição da razão
    em faixas e os de maior razão.

Privacidade: grupos com 1 ou 2 geradores ficam "menos de 3", sem potência. Se o
total menos as partes visíveis revelasse um grupo pequeno (ou somasse menos de 3
unidades escondidas), a menor parte visível também fica "oculto". Transformadores
com 1 ou 2 geradores não aparecem um a um, nem nas faixas.

Uso:  .venv\\Scripts\\python.exe pipeline\\gd.py
"""
import json
import sys
from pathlib import Path

import pyogrio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checar_privacidade import MASCARA, MINIMO_UNIDADES, OCULTO  # noqa: E402
from raio_x import partes_deduziveis  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
CONFIGURACAO = RAIZ / "pipeline" / "distribuidora.json"
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

# Faixas da razão GD / capacidade, em % (de, até; None = sem limite).
FAIXAS_RAZAO = [(0, 10), (10, 25), (25, 50), (50, 75), (75, 100), (100, None)]
MAIORES = 15  # transformadores na lista dos de maior razão


def falhar(mensagem):
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def caminho_do_gdb():
    config = json.loads(CONFIGURACAO.read_text(encoding="utf-8"))
    gdb = RAIZ / "dados" / "brutos" / config["pasta_brutos"] / config["arquivo_zip"].removesuffix(".zip")
    if not gdb.exists():
        falhar(f"não achei {gdb}. Extraia o zip da distribuidora nessa pasta.")
    return str(gdb)


def ler(gdb, camada, colunas):
    return pyogrio.read_dataframe(gdb, layer=camada, columns=colunas, read_geometry=False)


def potencias_tpotaprt(dicionario):
    """Código TPOTAPRT -> kVA (coluna "pot" do domínio, Manual, Anexo II)."""
    for d in dicionario["dominios"]:
        if d["sigla"] == "TPOTAPRT":
            return {str(v["codigo"]): float(str(v["pot"]).replace(",", ".")) for v in d["valores"]}, d.get("pagina")
    falhar("domínio TPOTAPRT não está no dicionario.json")


def capacidade_por_transformador(gdb, dicionario):
    kva_de, pagina = potencias_tpotaprt(dicionario)
    eq = ler(gdb, "EQTRMT", ["UNI_TR_MT", "POT_NOM"])
    sem_codigo = sorted(set(eq.POT_NOM.astype(str)) - set(kva_de))
    if sem_codigo:
        falhar(f"EQTRMT.POT_NOM com códigos fora do TPOTAPRT: {sem_codigo}")
    eq["kva"] = eq.POT_NOM.astype(str).map(kva_de)
    return eq.groupby("UNI_TR_MT").kva.sum(), len(eq), pagina


def razao(kw, kva):
    return round(100 * kw / kva, 1) if kva else None


def grupo(qtd, kw):
    """Contagem de geradores com a máscara; potência só para grupos de 3 ou mais."""
    qtd = int(qtd)
    if 0 < qtd < MINIMO_UNIDADES:
        return {"qtd_ug": MASCARA, "ug_potencia_kw": None}
    return {"qtd_ug": qtd, "ug_potencia_kw": round(float(kw), 1)}


def faixa(valor):
    if valor == MASCARA:
        return 1, MINIMO_UNIDADES - 1
    if valor == OCULTO:
        return MINIMO_UNIDADES, float("inf")
    return valor, valor


def vaza(total, partes):
    """True se o total menos as partes visíveis revela uma parte escondida, ou se as
    escondidas somam menos de 3 unidades (a potência delas sairia por subtração)."""
    valores = [p["qtd_ug"] for p in partes]
    escondidas = [v for v in valores if v in (MASCARA, OCULTO)]
    if not escondidas:
        return False
    sobra = total["qtd_ug"] - sum(v for v in valores if v not in (MASCARA, OCULTO))
    return bool(partes_deduziveis(total["qtd_ug"], valores)) or sobra < MINIMO_UNIDADES


def proteger(total, partes):
    """Supressão complementar: esconde a menor parte visível até nada vazar."""
    while vaza(total, partes):
        visiveis = [p for p in partes if p["qtd_ug"] not in (MASCARA, OCULTO) and p["qtd_ug"] > 0]
        if not visiveis:
            falhar("não há parte visível para esconder")
        menor = min(visiveis, key=lambda p: p["qtd_ug"])
        menor.update(qtd_ug=OCULTO, ug_potencia_kw=None, ug_razao_pct=None)


def montar(gdb, dicionario, raio_x):
    capacidade, n_equipamentos, pagina_tpotaprt = capacidade_por_transformador(gdb, dicionario)
    un = ler(gdb, "UNTRMT", ["COD_ID", "CTMT", "POT_NOM"]).set_index("COD_ID")
    un["capacidade_kva"] = capacidade.reindex(un.index)
    if un.capacidade_kva.isna().any():
        falhar(f"{int(un.capacidade_kva.isna().sum())} transformadores sem equipamento na EQTRMT")
    divergentes = int((abs(un.capacidade_kva - un.POT_NOM) >= 0.01).sum())

    ugbt = ler(gdb, "UGBT_tab", ["UNI_TR_MT", "CTMT", "POT_INST"])
    ugmt = ler(gdb, "UGMT_tab", ["CTMT", "POT_INST"])

    # Por transformador (só para calcular; um a um, só os de 3 ou mais geradores).
    por_tr = ugbt.groupby("UNI_TR_MT").agg(qtd=("POT_INST", "size"), kw=("POT_INST", "sum"))
    por_tr = por_tr.join(un[["CTMT", "capacidade_kva"]])
    if por_tr.capacidade_kva.isna().any():
        falhar("há geradores ligados a transformador que não está na UNTRMT")
    por_tr["razao"] = 100 * por_tr.kw / por_tr.capacidade_kva
    grandes = por_tr[por_tr.qtd >= MINIMO_UNIDADES]

    faixas = []
    for de, ate in FAIXAS_RAZAO:
        dentro = (grandes.razao >= de) & ((grandes.razao < ate) if ate is not None else True)
        faixas.append({"de": de, "ate": ate, "transformadores": int(dentro.sum())})

    # Por alimentador.
    ug_alim = ugbt.groupby("CTMT").agg(qtd=("POT_INST", "size"), kw=("POT_INST", "sum"))
    alimentadores = []
    for a in raio_x["alimentadores"]:
        c = a["alimentador"]
        qtd, kw = (ug_alim.loc[c, "qtd"], ug_alim.loc[c, "kw"]) if c in ug_alim.index else (0, 0.0)
        cap = float(un.capacidade_kva[un.CTMT == c].sum())
        g = grupo(qtd, kw)
        alimentadores.append({
            "alimentador": c,
            "nome": a["nome"],
            "subestacao": a["subestacao"],
            "capacidade_kva": round(cap, 1),
            "geradores_bt": {**g, "ug_razao_pct": razao(g["ug_potencia_kw"], cap) if g["ug_potencia_kw"] is not None else None},
        })

    totais = {
        "geradores_bt": {"qtd_ug": len(ugbt), "ug_potencia_kw": round(float(ugbt.POT_INST.sum()), 1)},
        "geradores_mt": {"qtd_ug": len(ugmt), "ug_potencia_kw": round(float(ugmt.POT_INST.sum()), 1)},
        "capacidade_kva": round(float(un.capacidade_kva.sum()), 1),
        "transformadores": len(un),
        "transformadores_com_gd": len(por_tr),
        "transformadores_com_3_ou_mais": len(grandes),
        "equipamentos_eqtrmt": n_equipamentos,
        "capacidade_diferente_da_untrmt": divergentes,
    }
    totais["geradores_bt"]["ug_razao_pct"] = razao(totais["geradores_bt"]["ug_potencia_kw"], totais["capacidade_kva"])
    proteger(totais["geradores_bt"], [a["geradores_bt"] for a in alimentadores])

    # Maiores razões: só transformadores de alimentadores visíveis, e sem deixar no
    # alimentador uma sobra de 1 ou 2 geradores fora da lista.
    visivel = {a["alimentador"]: a["geradores_bt"] for a in alimentadores
               if isinstance(a["geradores_bt"]["qtd_ug"], int)}
    candidatos = grandes[grandes.CTMT.isin(visivel)].sort_values("razao", ascending=False)
    maiores, na_lista = [], {}
    for codigo, t in candidatos.iterrows():
        if len(maiores) == MAIORES:
            break
        sobra = visivel[t.CTMT]["qtd_ug"] - na_lista.get(t.CTMT, 0) - int(t.qtd)
        if 0 < sobra < MINIMO_UNIDADES:
            continue
        na_lista[t.CTMT] = na_lista.get(t.CTMT, 0) + int(t.qtd)
        maiores.append({
            "transformador": codigo,
            "alimentador": t.CTMT,
            "capacidade_kva": round(float(t.capacidade_kva), 1),
            "qtd_ug": int(t.qtd),
            "ug_potencia_kw": round(float(t.kw), 1),
            "ug_razao_pct": round(float(t.razao), 1),
        })

    return {
        "fonte": "ANEEL, BDGD (licença ODbL). Cálculo: pipeline/gd.py",
        "paginas_manual": {"TPOTAPRT": pagina_tpotaprt},
        "totais": totais,
        "alimentadores": alimentadores,
        "faixas_razao_transformadores": faixas,
        "maiores_razoes": maiores,
    }, ugbt


def conferir(gd, ugbt, catalogo):
    erros = []
    registros = {c["nome"]: c["registros"] for c in catalogo["camadas"]}
    t = gd["totais"]
    for camada, chave in (("UGBT_tab", "geradores_bt"), ("UGMT_tab", "geradores_mt")):
        if registros.get(camada) != t[chave]["qtd_ug"]:
            erros.append(f"{camada}: {t[chave]['qtd_ug']} lidos, catálogo diz {registros.get(camada)}")
    if sum(f["transformadores"] for f in gd["faixas_razao_transformadores"]) != t["transformadores_com_3_ou_mais"]:
        erros.append("faixas não somam os transformadores com 3 ou mais geradores")
    if (ugbt.CTMT.isna() | (ugbt.CTMT.astype(str).str.strip() == "")).any():
        erros.append("há geradores de BT sem alimentador")
    if abs(sum(a["capacidade_kva"] for a in gd["alimentadores"]) - t["capacidade_kva"]) > 1:
        erros.append("capacidade por alimentador não soma o total")
    if vaza(t["geradores_bt"], [a["geradores_bt"] for a in gd["alimentadores"]]):
        erros.append("um grupo mascarado ainda pode ser deduzido por subtração")
    if erros:
        falhar("conferência da GD falhou:\n  " + "\n  ".join(erros))


def main():
    gdb = caminho_do_gdb()
    ler_json = lambda nome: json.loads((PASTA_PROCESSADOS / nome).read_text(encoding="utf-8"))  # noqa: E731
    gd, ugbt = montar(gdb, ler_json("dicionario.json"), ler_json("raio_x.json"))
    conferir(gd, ugbt, ler_json("catalogo.json"))
    destino = PASTA_PROCESSADOS / "gd.json"
    destino.write_text(json.dumps(gd, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    t = gd["totais"]
    print(f"gd.json: {t['geradores_bt']['qtd_ug']} geradores BT, {t['transformadores_com_gd']} transformadores com GD "
          f"({destino.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
