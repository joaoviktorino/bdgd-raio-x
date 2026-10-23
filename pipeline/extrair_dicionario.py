"""Gera o dicionário das camadas e campos da BDGD a partir do Manual de Instruções.

Lê o PDF do Manual (Revisão 5) em dados/brutos/referencias/ e grava
dados/processados/dicionario.json com:
  - entidades (Anexo I): nome, sigla, feição, entidades relacionadas e campos,
    cada um com tipo, tamanho, obrigatório, chave, padrão, descrição e página;
  - domínios do DDA (Anexo II): cada tabela de códigos com seus valores;
  - comparação com o arquivo publicado (dados/processados/catalogo.json).

Uso:  .venv\\Scripts\\python.exe pipeline\\extrair_dicionario.py
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pdfplumber

RAIZ = Path(__file__).resolve().parent.parent
MANUAL = RAIZ / "dados" / "brutos" / "referencias" / "Manual_Instrucoes_BDGD_Rev5.pdf"
CATALOGO = RAIZ / "dados" / "processados" / "catalogo.json"
SAIDA = RAIZ / "dados" / "processados" / "dicionario.json"

# Cópia local do Manual usada para gerar o dicionário. Se o PDF em disco for
# outro (ex.: nova revisão), o script para: o dicionário cita páginas desta.
SHA256_MANUAL = "93D22D64D41865452CA4A95D4F6124E2029E09D2367670694F04A350C4A13459"
FONTE = {
    "documento": "Manual de Instruções da Base de Dados Geográfica da Distribuidora - BDGD",
    "revisao": 5,
    "vigencia": "2026-03-01",
    "url": "https://www.gov.br/aneel/pt-br/centrais-de-conteudos/manuais-modelos-e-instrucoes/distribuicao",
    "sha256_pdf": SHA256_MANUAL,
}
ENTIDADES_ESPERADAS = 43  # 23 geográficas + 20 não geográficas (Manual, Seção 2, item 2.4)

# Inconsistências do próprio Manual, corrigidas de forma explícita e registradas
# no dicionário. Chave: sigla como aparece no título do Anexo II; valor: sigla
# usada pelos campos do Anexo I e pela lista de domínios da Seção 3.
CORRECOES_SIGLA_DOMINIO = {
    "TCABOGTCEOM": "TCABOGEOM",  # Anexo II, item 2.13: erro de digitação no título
}

# Colunas que o File Geodatabase cria sozinho e que não são campos da BDGD.
COLUNAS_DO_GDB = {"Shape_Length", "Shape_Area"}

# Tipo de feição do Manual -> tipos de geometria aceitos no arquivo.
FEICOES = {
    "Ponto": {"Point", "MultiPoint"},
    "Linha": {"LineString", "MultiLineString"},
    "Polígono": {"Polygon", "MultiPolygon"},
}

RE_ANEXO = re.compile(r"^ANEXO (I{1,3}) [–-]")
RE_NAO_GEOGRAFICAS = re.compile(r"^\d+\s+ENTIDADES NÃO GEOGRÁFICAS")
RE_ENTIDADE = re.compile(r"^(?:[\d.]+\s+)?Designação da Entidade:\s*(.+)$")
RE_SIGLA = re.compile(r"^(?:[\d.]+\s+)?Designação da Modelagem:\s*(\S+)")
RE_FEICAO = re.compile(r"^(?:[\d.]+\s+)?Tipo de Feição Geográfica:\s*(.+)$")
RE_RELACIONADAS = re.compile(r"^(?:[\d.]+\s+)?Entidades relacionad[ao]s:\s*(.*)$")
RE_CONTINUA_LISTA = re.compile(r"^[A-Z0-9_]+(\s*;\s*[A-Z0-9_]+)*\s*;?$")
RE_DOMINIO = re.compile(r"^(?:[\d.]+\s+)?(.+?)\s*\((T[A-Z0-9_]+)\)\s*$")
RE_REFERENCIA = re.compile(r"^(\w+)\s*\(COD_ID\)")


def falhar(mensagem):
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def limpar(celula):
    return re.sub(r"\s+", " ", celula or "").strip()


def sha256(caminho):
    return hashlib.sha256(caminho.read_bytes()).hexdigest().upper()


def eventos_da_pagina(pagina):
    """Linhas de texto fora das tabelas e as próprias tabelas, de cima para baixo."""
    tabelas = pagina.find_tables()
    caixas = [t.bbox for t in tabelas]

    def dentro_de_tabela(linha):
        meio = (linha["top"] + linha["bottom"]) / 2
        return any(x0 - 1 <= linha["x0"] <= x1 and top - 1 <= meio <= bottom + 1 for x0, top, x1, bottom in caixas)

    eventos = [("texto", l["top"], limpar(l["text"])) for l in pagina.extract_text_lines() if not dentro_de_tabela(l)]
    eventos += [("tabela", t.bbox[1], [[limpar(c) for c in linha] for linha in t.extract()]) for t in tabelas]
    return sorted(eventos, key=lambda e: e[1])


def eh_cabecalho_de_pagina(linhas):
    return bool(linhas) and linhas[0] and linhas[0][0].startswith(("Seção", "Assunto"))


def ler_lista_de_entidades(linhas, pagina, lista, grupo_anterior):
    """Seção 2, item 2.4: tabela 'Tipo/ Nome do Conjunto de Informações | Nome | Sigla | … | Descrição'.
    Quando várias entidades são do mesmo conjunto, a primeira célula vem vazia e vale a de cima."""
    for linha in linhas[1:]:
        if len(linha) != 5 or not linha[2]:
            continue
        tipo_conjunto = linha[0] or grupo_anterior
        grupo_anterior = tipo_conjunto
        grupo, _, conjunto = tipo_conjunto.partition("/")
        lista[linha[2]] = {
            "grupo": limpar(grupo),
            "conjunto": limpar(conjunto) or limpar(grupo),
            "descricao_curta": linha[4],
            "pagina_lista": pagina,
        }
    return grupo_anterior


def ler_manual(pdf):
    entidades, dominios = [], []
    lista, grupo_anterior = {}, ""
    anexo = None
    tipo_entidade = "geografica"
    entidade = dominio = None
    ultima_lista = None  # lista de "Entidades relacionadas" que pode continuar na linha seguinte
    colunas_dominio = None

    for numero, pagina in enumerate(pdf.pages, start=1):
        for tipo, _, conteudo in eventos_da_pagina(pagina):
            if tipo == "texto":
                linha = conteudo
                if m := RE_ANEXO.match(linha):
                    anexo = m.group(1)
                    entidade = dominio = ultima_lista = None
                    continue
                if anexo == "I" and RE_NAO_GEOGRAFICAS.match(linha):
                    tipo_entidade = "nao_geografica"
                    continue
                if ultima_lista is not None and RE_CONTINUA_LISTA.match(linha):
                    ultima_lista += [s.strip() for s in linha.split(";") if s.strip()]
                    continue
                ultima_lista = None

                if anexo == "I":
                    if m := RE_ENTIDADE.match(linha):
                        entidade = {"nome": m.group(1).strip(), "sigla": None, "tipo": tipo_entidade,
                                    "feicao": None, "relacionadas": [], "pagina": numero, "campos": []}
                        entidades.append(entidade)
                    elif entidade and (m := RE_SIGLA.match(linha)):
                        entidade["sigla"] = m.group(1)
                    elif entidade and (m := RE_FEICAO.match(linha)):
                        entidade["feicao"] = m.group(1).strip()
                    elif entidade and (m := RE_RELACIONADAS.match(linha)):
                        entidade["relacionadas"] = [s.strip() for s in m.group(1).split(";") if s.strip()]
                        ultima_lista = entidade["relacionadas"]
                elif anexo == "II":
                    if m := RE_DOMINIO.match(linha):
                        sigla = m.group(2)
                        dominio = {"nome": m.group(1).strip(), "sigla": CORRECOES_SIGLA_DOMINIO.get(sigla, sigla),
                                   "pagina": numero, "relacionadas": [], "valores": []}
                        if sigla in CORRECOES_SIGLA_DOMINIO:
                            dominio["sigla_no_manual"] = sigla
                        dominios.append(dominio)
                        colunas_dominio = None
                    elif dominio and (m := RE_RELACIONADAS.match(linha)):
                        dominio["relacionadas"] = [s.strip() for s in m.group(1).split(";") if s.strip()]
                        ultima_lista = dominio["relacionadas"]
                continue

            linhas = conteudo
            if eh_cabecalho_de_pagina(linhas) or not linhas:
                continue
            # A lista da Seção 2 se reconhece pelo cabeçalho (o sumário já cita "ANEXO I", então não dá
            # para depender do anexo atual aqui).
            if linhas[0] and (linhas[0][0] or "").startswith("Tipo/"):
                grupo_anterior = ler_lista_de_entidades(linhas, numero, lista, grupo_anterior)
            elif anexo == "I" and entidade:
                ler_campos(entidade, linhas, numero)
            elif anexo == "II" and dominio:
                colunas_dominio = ler_dominio(dominio, linhas, colunas_dominio)
    for e in entidades:
        e.update(lista.get(e["sigla"], {}))
    return entidades, dominios


def ler_campos(entidade, linhas, pagina):
    for linha in linhas:
        if len(linha) != 8 or linha[1] == "CAMPO":
            continue
        numero, campo, tipo, tamanho, obrigatorio, chave, padrao, descricao = linha
        if not numero and entidade["campos"]:
            # pedaço de um campo que quebrou de página: junta ao anterior
            anterior = entidade["campos"][-1]
            anterior["padrao"] = limpar(f"{anterior['padrao']} {padrao}")
            anterior["descricao"] = limpar(f"{anterior['descricao']} {descricao}")
            continue
        if not numero.isdigit() or not campo:
            continue
        item = {
            "numero": int(numero),
            "campo": campo,
            "tipo": tipo,
            "tamanho": int(tamanho) if tamanho.isdigit() else None,
            "obrigatorio": obrigatorio == "Sim",
            "chave": chave == "Sim",
            "padrao": padrao,
            "descricao": descricao,
            "pagina": pagina,
        }
        if (m := RE_REFERENCIA.match(padrao)) and tipo.lower().startswith("código dda"):
            item["dominio"] = m.group(1)
        elif m and tipo.lower() == "vinculado":
            item["entidade_vinculada"] = m.group(1)
        entidade["campos"].append(item)


def ler_dominio(dominio, linhas, colunas):
    """Lê a tabela 'Domínio' (COD_ID, DESCRIÇÃO e eventuais colunas extras)."""
    cabecalho = linhas[0]
    if cabecalho and cabecalho[0] == "#":
        return colunas  # tabela "Modelo": descreve a estrutura, não os valores
    if cabecalho and cabecalho[0] == "COD_ID":
        colunas = [normalizar_coluna(c) for c in cabecalho]
        linhas = linhas[1:]
    if not colunas:
        return colunas
    for linha in linhas:
        if len(linha) != len(colunas) or not any(linha):
            continue
        dominio["valores"].append(dict(zip(colunas, linha)))
    return colunas


def normalizar_coluna(nome):
    nome = limpar(nome)
    if nome == "COD_ID":
        return "codigo"
    if nome.upper().startswith("DESCR"):
        return "descricao"
    return re.sub(r"\W+", "_", nome.lower()).strip("_")


def comparar_com_arquivo(entidades, catalogo):
    por_sigla = {e["sigla"]: e for e in entidades}
    comparacao = []
    for camada in catalogo["camadas"]:
        sigla = camada["nome"].removesuffix("_tab")
        entidade = por_sigla.get(sigla)
        colunas_arquivo = {c["nome"] for c in camada["colunas"]} - COLUNAS_DO_GDB
        campos_manual = {c["campo"] for c in entidade["campos"]} if entidade else set()
        feicao = entidade["feicao"] if entidade else None
        geometria = camada["geometria"]
        if feicao is None:
            feicao_confere = geometria == "tabela"
        else:
            feicao_confere = geometria in FEICOES.get(feicao, set())
        comparacao.append({
            "camada": camada["nome"],
            "entidade": sigla if entidade else None,
            "feicao_manual": feicao,
            "geometria_arquivo": geometria,
            "feicao_confere": feicao_confere,
            "colunas_so_no_arquivo": sorted(colunas_arquivo - campos_manual),
            "campos_so_no_manual": sorted(campos_manual - colunas_arquivo),
        })
    return comparacao


def conferir(entidades, dominios, comparacao):
    if len(entidades) != ENTIDADES_ESPERADAS:
        falhar(f"{len(entidades)} entidades lidas; o Manual define {ENTIDADES_ESPERADAS}")
    sem_sigla = [e["nome"] for e in entidades if not e["sigla"]]
    if sem_sigla:
        falhar(f"entidades sem sigla: {sem_sigla}")
    sem_campos = [e["sigla"] for e in entidades if not e["campos"]]
    if sem_campos:
        falhar(f"entidades sem campos: {sem_campos}")
    sem_grupo = [e["sigla"] for e in entidades if not e.get("grupo") or not e.get("descricao_curta")]
    if sem_grupo:
        falhar(f"entidades sem grupo ou descrição na lista da Seção 2: {sem_grupo}")
    sem_entidade = [c["camada"] for c in comparacao if not c["entidade"]]
    if sem_entidade:
        falhar(f"camadas do arquivo sem entidade no Manual: {sem_entidade}")
    siglas_dominio = {d["sigla"] for d in dominios}
    orfaos = sorted({c["dominio"] for e in entidades for c in e["campos"]
                     if c.get("dominio") and c["dominio"] not in siglas_dominio})
    if orfaos:
        falhar(f"campos 'Código DDA' apontam para domínios não encontrados: {orfaos}")


def main():
    if not MANUAL.exists():
        falhar(f"Manual não encontrado em {MANUAL.relative_to(RAIZ)}. Baixe a Revisão 5 em {FONTE['url']}")
    if sha256(MANUAL) != SHA256_MANUAL:
        falhar("o PDF do Manual não é a cópia esperada (Revisão 5); as páginas citadas podem não bater")
    if not CATALOGO.exists():
        falhar("rode antes o pipeline/catalogar_gdb.py")
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))

    with pdfplumber.open(MANUAL) as pdf:
        entidades, dominios = ler_manual(pdf)
    comparacao = comparar_com_arquivo(entidades, catalogo)
    conferir(entidades, dominios, comparacao)

    dicionario = {
        "fonte": FONTE,
        "total_entidades": len(entidades),
        "total_dominios": len(dominios),
        "entidades": entidades,
        "dominios": dominios,
        "inconsistencias_do_manual": [
            {"tipo": "sigla de domínio", "no_manual": errada, "corrigida_para": certa,
             "pagina": next(d["pagina"] for d in dominios if d.get("sigla_no_manual") == errada)}
            for errada, certa in CORRECOES_SIGLA_DOMINIO.items()
        ],
        "comparacao_com_arquivo": {"arquivo": catalogo["arquivo"], "camadas": comparacao},
        "licenca_dados": "ODbL (dados da BDGD); textos do Manual citados com a fonte",
    }
    SAIDA.write_text(json.dumps(dicionario, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Gravado: {SAIDA.relative_to(RAIZ)}")
    print(f"{len(entidades)} entidades, {sum(len(e['campos']) for e in entidades)} campos, "
          f"{len(dominios)} domínios, {sum(len(d['valores']) for d in dominios)} códigos")


if __name__ == "__main__":
    main()
