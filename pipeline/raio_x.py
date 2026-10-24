"""Gera o raio-x da rede da distribuidora: resumos agregados por subestação e alimentador.

Lê do .gdb só as colunas necessárias (nunca colunas que identificam unidade) e
grava dados/processados/raio_x.json com:
  - totais da rede (subestações, alimentadores, transformadores, km, consumidores);
  - km de rede AT, MT e BT de dois jeitos: somando COMP (metros) e medindo o
    desenho no elipsoide do SIRGAS 2000;
  - cada subestação e cada alimentador (km MT e BT, transformadores, potência em
    kVA e unidades consumidoras, mascaradas abaixo de 3; quando o total menos as
    partes visíveis revelaria uma parte mascarada, a menor parte visível também
    fica "oculto");
  - distribuições: potência dos transformadores e unidades consumidoras de BT por
    transformador (em faixas, contando transformadores).

Antes de gravar, confere que as somas por alimentador batem com os totais das
camadas e com o catálogo. Termina com erro se algo não bater.

Uso:  .venv\\Scripts\\python.exe pipeline\\raio_x.py
"""
import json
import sys
from pathlib import Path

import pyogrio
from pyproj import Geod

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checar_privacidade import MASCARA, MINIMO_UNIDADES, OCULTO  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
CONFIGURACAO = RAIZ / "pipeline" / "distribuidora.json"
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

# SIRGAS 2000 usa o elipsoide GRS80 (Módulo 10, item 45: EPSG:4674).
GEOD = Geod(ellps="GRS80")

# Faixas de unidades consumidoras de BT por transformador (de, até; None = sem limite).
FAIXAS_UC = [(0, 0), (1, 9), (10, 24), (25, 49), (50, 99), (100, None)]

REDES = [("SSDAT", "AT"), ("SSDMT", "MT"), ("SSDBT", "BT")]


def falhar(mensagem):
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def caminho_do_gdb():
    config = json.loads(CONFIGURACAO.read_text(encoding="utf-8"))
    pasta = RAIZ / "dados" / "brutos" / config["pasta_brutos"]
    gdb = pasta / config["arquivo_zip"].removesuffix(".zip")
    if not gdb.exists():
        falhar(f"não achei {gdb}. Extraia o zip da distribuidora nessa pasta.")
    return gdb


def ler(gdb, camada, colunas, geometria=False):
    return pyogrio.read_dataframe(gdb, layer=camada, columns=colunas, read_geometry=geometria)


def contagem(n):
    """Contagem de unidades com a máscara da trava de privacidade."""
    n = int(n)
    return MASCARA if 0 < n < MINIMO_UNIDADES else n


def km(metros):
    return round(float(metros) / 1000, 2)


def sem_codigo(serie):
    return serie.isna() | (serie.astype(str).str.strip() == "")


def dominio(dicionario, sigla):
    for d in dicionario["dominios"]:
        if d["sigla"] == sigla:
            return {str(v["codigo"]): v["descricao"] for v in d["valores"]}, d.get("pagina")
    falhar(f"domínio {sigla} não está no dicionario.json")


def montar(gdb, dicionario, catalogo):
    tten, pagina_tten = dominio(dicionario, "TTEN")
    tsitati, pagina_tsitati = dominio(dicionario, "TSITATI")

    sub = ler(gdb, "SUB", ["COD_ID", "NOME"])
    ctmt = ler(gdb, "CTMT", ["COD_ID", "NOME", "SUB", "TEN_NOM"])
    trafos = ler(gdb, "UNTRMT", ["COD_ID", "CTMT", "POT_NOM"])
    ucbt = ler(gdb, "UCBT_tab", ["CTMT", "UNI_TR_MT", "SIT_ATIV"])
    ucmt = ler(gdb, "UCMT_tab", ["CTMT"])
    # Alta tensão dentro de cada subestação: transformadores (POT_NOM em MVA, p. 99)
    # e unidades seccionadoras (chaves), ambas com a coluna SUB.
    trafos_at = ler(gdb, "UNTRAT", ["SUB", "POT_NOM"])
    secc_at = ler(gdb, "UNSEAT", ["SUB"])

    # Comprimentos: COMP somado e desenho medido no elipsoide.
    comprimentos, km_por_alimentador = [], {}
    for camada, rede in REDES:
        colunas = ["COMP"] + (["CTMT"] if rede != "AT" else [])
        trechos = ler(gdb, camada, colunas, geometria=True)
        medido = sum(GEOD.geometry_length(g) for g in trechos.geometry if g is not None)
        comprimentos.append({
            "camada": camada,
            "rede": rede,
            "trechos": len(trechos),
            "km_comp": km(trechos.COMP.sum()),
            "km_medido": km(medido),
        })
        if rede != "AT":
            km_por_alimentador[rede] = trechos.groupby("CTMT").COMP.sum()

    # Unidades consumidoras: só contagens.
    uc_bt = ucbt.groupby("CTMT").size()
    uc_mt = ucmt.groupby("CTMT").size()
    tr_qtd = trafos.groupby("CTMT").size()
    tr_kva = trafos.groupby("CTMT").POT_NOM.sum()

    alimentadores = []
    for linha in ctmt.sort_values("COD_ID").itertuples():
        c = linha.COD_ID
        alimentadores.append({
            "alimentador": c,
            "nome": str(linha.NOME).strip(),
            "subestacao": linha.SUB,
            "tensao": tten.get(str(linha.TEN_NOM), str(linha.TEN_NOM)),
            "km_mt": km(km_por_alimentador["MT"].get(c, 0)),
            "km_bt": km(km_por_alimentador["BT"].get(c, 0)),
            "transformadores": int(tr_qtd.get(c, 0)),
            "potencia_kva": round(float(tr_kva.get(c, 0)), 1),
            "consumidores_bt": {"qtd_uc": contagem(uc_bt.get(c, 0))},
            "consumidores_mt": {"qtd_uc": contagem(uc_mt.get(c, 0))},
        })

    sub_de = dict(zip(ctmt.COD_ID, ctmt.SUB))
    subestacoes = []
    for linha in sub.sort_values("COD_ID").itertuples():
        s = linha.COD_ID
        meus = [c for c, dono in sub_de.items() if dono == s]
        subestacoes.append({
            "subestacao": s,
            "nome": str(linha.NOME).strip(),
            "alimentadores": len(meus),
            "transformadores_at": int((trafos_at.SUB == s).sum()),
            "potencia_at_mva": round(float(trafos_at.POT_NOM[trafos_at.SUB == s].sum()), 1),
            "seccionadoras_at": int((secc_at.SUB == s).sum()),
            "km_mt": km(km_por_alimentador["MT"][km_por_alimentador["MT"].index.isin(meus)].sum()),
            "km_bt": km(km_por_alimentador["BT"][km_por_alimentador["BT"].index.isin(meus)].sum()),
            "transformadores": int(tr_qtd[tr_qtd.index.isin(meus)].sum()),
            "potencia_kva": round(float(tr_kva[tr_kva.index.isin(meus)].sum()), 1),
            "consumidores_bt": {"qtd_uc": contagem(uc_bt[uc_bt.index.isin(meus)].sum())},
            "consumidores_mt": {"qtd_uc": contagem(uc_mt[uc_mt.index.isin(meus)].sum())},
        })

    # Distribuições (contam transformadores, não consumidores).
    potencias = [
        {"kva": float(kva), "transformadores": int(n)}
        for kva, n in trafos.POT_NOM.value_counts().sort_index().items()
    ]
    por_trafo = ucbt.groupby("UNI_TR_MT").size().reindex(trafos.COD_ID, fill_value=0)
    faixas = []
    for de, ate in FAIXAS_UC:
        dentro = (por_trafo >= de) & ((por_trafo <= ate) if ate is not None else True)
        faixas.append({"de": de, "ate": ate, "transformadores": int(dentro.sum())})

    situacao = [
        {"codigo": str(cod), "descricao": tsitati.get(str(cod), str(cod)), "qtd_uc": contagem(n)}
        for cod, n in ucbt.SIT_ATIV.value_counts().items()
    ]

    tensoes = [
        {"codigo": str(cod), "descricao": tten.get(str(cod), str(cod)), "alimentadores": int(n)}
        for cod, n in ctmt.TEN_NOM.value_counts().items()
    ]

    totais = {
        "subestacoes": len(sub),
        "alimentadores": len(ctmt),
        "transformadores": len(trafos),
        "potencia_kva": round(float(trafos.POT_NOM.sum()), 1),
        "consumidores_bt": {"qtd_uc": contagem(len(ucbt))},
        "consumidores_mt": {"qtd_uc": contagem(len(ucmt))},
        "mediana_uc_bt_por_transformador": float(por_trafo.median()),
    }

    raio_x = {
        "fonte": "ANEEL, BDGD (licença ODbL). Cálculo: pipeline/raio_x.py",
        "paginas_manual": {"TTEN": pagina_tten, "TSITATI": pagina_tsitati},
        "totais": totais,
        "comprimentos": comprimentos,
        "tensoes": tensoes,
        "situacao_uc_bt": situacao,
        "subestacoes": subestacoes,
        "alimentadores": alimentadores,
        "potencias_transformadores": potencias,
        "faixas_uc_bt_por_transformador": faixas,
    }
    proteger_por_subtracao(raio_x)
    conferir(raio_x, catalogo, trafos, ucbt, ucmt, ctmt)
    return raio_x


def conferir(raio_x, catalogo, trafos, ucbt, ucmt, ctmt):
    """Somas por alimentador = totais das camadas = registros do catálogo."""
    erros = []
    registros = {c["nome"]: c["registros"] for c in catalogo["camadas"]}
    for camada, n in [("UNTRMT", len(trafos)), ("UCBT_tab", len(ucbt)), ("UCMT_tab", len(ucmt)), ("CTMT", len(ctmt))]:
        if registros.get(camada) != n:
            erros.append(f"{camada}: {n} lidos, catálogo diz {registros.get(camada)}")
    for nome, df in [("UNTRMT", trafos), ("UCBT_tab", ucbt), ("UCMT_tab", ucmt)]:
        fora = (~df.CTMT.isin(ctmt.COD_ID) | sem_codigo(df.CTMT)).sum()
        if fora:
            erros.append(f"{nome}: {fora} registros sem alimentador conhecido (o raio-x não os contaria)")
    alim = raio_x["alimentadores"]
    if sum(a["transformadores"] for a in alim) != len(trafos):
        erros.append("soma de transformadores por alimentador diferente do total")
    for rede in ("MT", "BT"):
        total = next(c["km_comp"] for c in raio_x["comprimentos"] if c["rede"] == rede)
        soma = sum(a[f"km_{rede.lower()}"] for a in alim)
        if abs(soma - total) > 0.05 * len(alim):
            erros.append(f"km {rede}: soma por alimentador {soma:.2f} ≠ total {total:.2f}")
    if sum(f["transformadores"] for f in raio_x["faixas_uc_bt_por_transformador"]) != len(trafos):
        erros.append("faixas de UC por transformador não somam o total de transformadores")
    for nome, total, partes in particoes(raio_x):
        if partes_deduziveis(total["qtd_uc"], [p["qtd_uc"] for p in partes]):
            erros.append(f"{nome}: dá para deduzir um valor mascarado por subtração")
    if erros:
        falhar("conferência do raio-x falhou:\n  " + "\n  ".join(erros))


def particoes(raio_x):
    """Cada total de unidades e as partes que o somam (subtraindo, revelam as mascaradas)."""
    alim, subs = raio_x["alimentadores"], raio_x["subestacoes"]
    for chave in ("consumidores_bt", "consumidores_mt"):
        yield f"{chave} total por alimentador", raio_x["totais"][chave], [a[chave] for a in alim]
        yield f"{chave} total por subestação", raio_x["totais"][chave], [s[chave] for s in subs]
        for s in subs:
            meus = [a[chave] for a in alim if a["subestacao"] == s["subestacao"]]
            yield f"{chave} de {s['subestacao']}", s[chave], meus


def faixa(valor):
    """Valores que uma contagem publicada pode ter: exata, 1 a 2 ou 3 em diante."""
    if valor == MASCARA:
        return 1, MINIMO_UNIDADES - 1
    if valor == OCULTO:
        return MINIMO_UNIDADES, float("inf")
    return valor, valor


def partes_deduziveis(total, partes):
    """Índices das partes escondidas cujo valor exato sai do total menos as visíveis.

    Cada parte escondida tem uma faixa (1 a 2, ou 3 em diante). Dado o que sobra do
    total, a parte i só pode valer entre max(mín_i, sobra − soma dos máx das outras)
    e min(máx_i, sobra − soma dos mín das outras); se isso der um único número, vazou.
    """
    if total in (MASCARA, OCULTO):
        return []
    escondidas = [i for i, p in enumerate(partes) if p in (MASCARA, OCULTO)]
    sobra = total - sum(p for p in partes if p not in (MASCARA, OCULTO))
    faixas = {i: faixa(partes[i]) for i in escondidas}
    deduziveis = []
    for i in escondidas:
        outras = [faixas[j] for j in escondidas if j != i]
        menor = max(faixas[i][0], sobra - sum(f[1] for f in outras))
        maior = min(faixas[i][1], sobra - sum(f[0] for f in outras))
        if menor == maior:
            deduziveis.append(i)
    return deduziveis


def proteger_por_subtracao(raio_x):
    """Supressão complementar: enquanto um valor mascarado puder ser deduzido por
    subtração, esconde também a menor contagem visível da mesma partição."""
    while True:
        for _, total, partes in particoes(raio_x):
            if partes_deduziveis(total["qtd_uc"], [p["qtd_uc"] for p in partes]):
                visiveis = [p for p in partes if p["qtd_uc"] not in (MASCARA, OCULTO) and p["qtd_uc"] > 0]
                if not visiveis:
                    falhar("não há contagem visível para esconder; revise as partições")
                min(visiveis, key=lambda p: p["qtd_uc"])["qtd_uc"] = OCULTO
                break
        else:
            return


def main():
    gdb = caminho_do_gdb()
    dicionario = json.loads((PASTA_PROCESSADOS / "dicionario.json").read_text(encoding="utf-8"))
    catalogo = json.loads((PASTA_PROCESSADOS / "catalogo.json").read_text(encoding="utf-8"))
    raio_x = montar(str(gdb), dicionario, catalogo)
    destino = PASTA_PROCESSADOS / "raio_x.json"
    destino.write_text(json.dumps(raio_x, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    t = raio_x["totais"]
    print(f"raio_x.json: {t['subestacoes']} subestações, {t['alimentadores']} alimentadores, "
          f"{t['transformadores']} transformadores ({destino.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
