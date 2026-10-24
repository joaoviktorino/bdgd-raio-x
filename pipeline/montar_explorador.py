"""Monta os dados do explorador de camadas do site.

Junta o que há no arquivo (catalogo.json) com o que o Manual diz (dicionario.json)
e grava dados/processados/explorador.json: cada camada com grupo, descrição,
registros, colunas (com significado e se existem no arquivo) e ligações.

Uso:  .venv\\Scripts\\python.exe pipeline\\montar_explorador.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROCESSADOS = RAIZ / "dados" / "processados"
CONFIGURACAO = RAIZ / "pipeline" / "distribuidora.json"
SAIDA = PROCESSADOS / "explorador.json"

# Ordem de leitura dos grupos (do território às fichas). Nomes como na Seção 2 do Manual.
ORDEM_GRUPOS = ["Áreas de Interesse", "Rede", "Equipamento", "Usuário", "Energia", "Metadado BDGD"]

# Colunas que o File Geodatabase cria sozinho (não são campos da BDGD).
COLUNAS_DO_GDB = {"Shape_Length", "Shape_Area"}


def falhar(mensagem):
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def carregar(caminho):
    return json.loads(caminho.read_text(encoding="utf-8"))


def main():
    catalogo = carregar(PROCESSADOS / "catalogo.json")
    dicionario = carregar(PROCESSADOS / "dicionario.json")
    cfg = carregar(CONFIGURACAO)

    entidades = {e["sigla"]: e for e in dicionario["entidades"]}
    sigla_da_camada = {c["nome"]: c["nome"].removesuffix("_tab") for c in catalogo["camadas"]}
    camada_da_sigla = {s: n for n, s in sigla_da_camada.items()}
    vazias_em_todas = set(cfg.get("vazias_em_todas_as_comparadas", []))

    def alvos(campo):
        """Entidades para onde um campo "Vinculado" aponta (pode ser mais de uma)."""
        return campo.get("entidades_vinculadas") or ([campo["entidade_vinculada"]] if campo.get("entidade_vinculada") else [])

    # Ligações: campo "Vinculado" de uma entidade aponta para outra(s) entidade(s).
    ligada_por = {s: [] for s in entidades}
    for e in entidades.values():
        for c in e["campos"]:
            for alvo in alvos(c):
                if alvo in ligada_por and alvo != e["sigla"]:
                    ligada_por[alvo].append({"camada": camada_da_sigla.get(e["sigla"], e["sigla"]), "campo": c["campo"]})

    camadas = []
    for c in catalogo["camadas"]:
        sigla = sigla_da_camada[c["nome"]]
        e = entidades.get(sigla)
        if not e:
            falhar(f"camada {c['nome']} sem entidade no dicionário")
        no_arquivo = {col["nome"] for col in c["colunas"]}
        colunas = []
        for campo in e["campos"]:
            item = {
                "campo": campo["campo"],
                "tipo": campo["tipo"],
                "descricao": campo["descricao"],
                "pagina": campo["pagina"],
                "obrigatorio": campo["obrigatorio"],
                "no_arquivo": campo["campo"] in no_arquivo,
            }
            if campo.get("dominio"):
                item["dominio"] = campo["dominio"]
            if alvos(campo):
                item["liga_a"] = [camada_da_sigla.get(a, a) for a in alvos(campo)]
            colunas.append(item)
        campos_manual = {x["campo"] for x in e["campos"]}
        camadas.append({
            "nome": c["nome"],
            "sigla": sigla,
            "nome_oficial": e["nome"],
            "grupo": e["grupo"],
            "conjunto": e["conjunto"],
            "tipo": e["tipo"],
            "feicao": e["feicao"],
            "geometria": c["geometria"],
            "registros": c["registros"],
            "vazia": c["registros"] == 0,
            "vazia_em_todas_as_comparadas": sigla in vazias_em_todas,
            "descricao": e["descricao_curta"],
            "pagina_lista": e["pagina_lista"],
            "pagina_entidade": e["pagina"],
            "liga_a": sorted({a for x in colunas for a in x.get("liga_a", []) if a != c["nome"]}),
            "ligada_por": sorted(ligada_por[sigla], key=lambda x: (x["camada"], x["campo"])),
            "colunas": colunas,
            "colunas_so_no_arquivo": sorted(no_arquivo - campos_manual - COLUNAS_DO_GDB),
        })

    grupos = [{"nome": g, "camadas": [c["nome"] for c in camadas if c["grupo"] == g]} for g in ORDEM_GRUPOS]
    sem_grupo = [c["nome"] for c in camadas if c["grupo"] not in ORDEM_GRUPOS]
    if sem_grupo:
        falhar(f"camadas com grupo fora da ordem conhecida: {sem_grupo}")

    explorador = {
        "distribuidora": cfg["nome"],
        "distribuidoras_comparadas": cfg.get("distribuidoras_comparadas"),
        "grupos": grupos,
        "camadas": camadas,
        "fonte": "ANEEL - BDGD e Manual de Instruções da BDGD, Revisão 5",
    }
    SAIDA.write_text(json.dumps(explorador, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"Gravado: {SAIDA.relative_to(RAIZ)} ({len(camadas)} camadas em {len(grupos)} grupos, "
          f"{SAIDA.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
