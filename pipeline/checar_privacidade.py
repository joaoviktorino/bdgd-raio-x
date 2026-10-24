"""Trava de privacidade: confere se dados/processados/ respeita as regras do CLAUDE.md.

Percorre todos os .json, .geojson e .csv de dados/processados/ e termina com
erro (código 1) se encontrar:
  1. coluna que identifica unidade (PAC, PN_CON, CEP, BRR, RAMAL, COD_ID);
  2. grupo com 1 ou 2 unidades exposto (qtd_uc/qtd_ug não mascarado como
     "menos de 3", ou campo uc_*/ug_* preenchido num grupo mascarado ou
     "oculto"; no
     catálogo, camada de unidades com 1 ou 2 registros);
  3. feição de mapa sem a propriedade "camada" ou vinda de camada de unidade
     consumidora/geradora (UCBT, UGMT_tab...);
  4. coordenada solta (lat, lon, latitude, longitude...).

Uso:  .venv\\Scripts\\python.exe pipeline\\checar_privacidade.py
"""
import csv
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

# Regra 1. COD_ID também é proibido: só pelo nome não dá para saber se é de
# um alimentador ou de um consumidor; nos processados os códigos ganham nomes
# explícitos (alimentador, transformador...).
COLUNAS_PROIBIDAS = {"PAC", "PN_CON", "CEP", "BRR", "RAMAL", "COD_ID"}

# Regra 2. Grupos com menos de MINIMO_UNIDADES unidades não mostram valor.
MINIMO_UNIDADES = 3
MASCARA = "menos de 3"
# Supressão complementar: contagem de 3 ou mais escondida para que um grupo
# mascarado não possa ser deduzido por subtração (total menos as partes visíveis).
OCULTO = "oculto"
CONTAGENS = {"qtd_uc": "uc_", "qtd_ug": "ug_"}  # contagem -> prefixo dos campos derivados

# Regra 3. Camadas de unidades consumidoras e geradoras (AT, MT, BT; com ou sem _tab).
CAMADA_DE_UNIDADES = re.compile(r"^U[CG](AT|MT|BT)(_tab)?$", re.IGNORECASE)

# Regra 4.
COLUNAS_COORDENADA = {"lat", "lon", "lng", "latitude", "longitude"}

EXTENSOES = {".json", ".geojson", ".csv"}


def vazio(valor):
    return valor is None or valor == ""


def verificar_colunas(colunas, onde):
    """Regras 1 e 4: nomes de coluna proibidos."""
    problemas = []
    for chave in colunas:
        if chave.upper() in COLUNAS_PROIBIDAS:
            problemas.append(f"{onde}: coluna proibida '{chave}' (identifica unidade)")
        if chave.lower() in COLUNAS_COORDENADA:
            problemas.append(f"{onde}: coordenada solta '{chave}'")
    return problemas


def verificar_contagens(registro, onde):
    """Regra 2: grupos com menos de 3 unidades precisam estar mascarados."""
    problemas = []
    for contagem, prefixo in CONTAGENS.items():
        if contagem not in registro:
            continue
        valor = registro[contagem]
        if valor in (MASCARA, OCULTO):
            preenchidos = [c for c in registro if c.startswith(prefixo) and not vazio(registro[c])]
            for campo in preenchidos:
                problemas.append(f"{onde}: '{campo}' preenchido num grupo mascarado ({contagem} = '{valor}')")
            continue
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            problemas.append(f"{onde}: {contagem} com valor inválido {valor!r}")
            continue
        if 0 < numero < MINIMO_UNIDADES:
            problemas.append(f"{onde}: grupo com {contagem} = {valor} exposto (deveria ser '{MASCARA}')")
    return problemas


def verificar_camada_de_unidades(registro, onde):
    """Regra 2b: no catálogo, camada de unidades consumidoras/geradoras com 1 ou 2 registros fica mascarada."""
    nome, n = registro.get("nome"), registro.get("registros")
    if isinstance(nome, str) and CAMADA_DE_UNIDADES.match(nome) and isinstance(n, (int, float)) and 0 < n < MINIMO_UNIDADES:
        return [f"{onde}: camada '{nome}' com {n} registros exposta (deveria ser '{MASCARA}')"]
    return []


def verificar_registro(registro, onde):
    """Aplica as regras 1, 2, 2b e 4 a um registro (dict)."""
    return (verificar_colunas(registro, onde) + verificar_contagens(registro, onde)
            + verificar_camada_de_unidades(registro, onde))


def verificar_geojson(dados, onde):
    """Aplica a regra 3 às feições de um GeoJSON."""
    feicoes = dados.get("features", []) if dados.get("type") == "FeatureCollection" else [dados]
    problemas = []
    for i, feicao in enumerate(feicoes):
        propriedades = feicao.get("properties") or {}
        camada = propriedades.get("camada")
        if vazio(camada):
            problemas.append(f"{onde}.features[{i}]: feição sem a propriedade 'camada'")
        elif CAMADA_DE_UNIDADES.match(str(camada)):
            problemas.append(f"{onde}.features[{i}]: feição da camada '{camada}' (unidade consumidora/geradora)")
    return problemas


def percorrer_json(valor, onde):
    """Visita todos os objetos de um JSON, em qualquer profundidade."""
    problemas = []
    if isinstance(valor, dict):
        if valor.get("type") in ("FeatureCollection", "Feature"):
            problemas += verificar_geojson(valor, onde)
        problemas += verificar_registro(valor, onde)
        for chave, filho in valor.items():
            problemas += percorrer_json(filho, f"{onde}.{chave}")
    elif isinstance(valor, list):
        for i, filho in enumerate(valor):
            problemas += percorrer_json(filho, f"{onde}[{i}]")
    return problemas


def verificar_arquivo(caminho, nome):
    if caminho.suffix.lower() == ".csv":
        with caminho.open(encoding="utf-8", newline="") as f:
            leitor = csv.DictReader(f)
            problemas = verificar_colunas(leitor.fieldnames or [], f"{nome} (cabeçalho)")
            for n, linha in enumerate(leitor, start=2):
                problemas += verificar_contagens(linha, f"{nome}:linha {n}")
            return problemas
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as erro:
        return [f"{nome}: não é um JSON válido ({erro})"]
    return percorrer_json(dados, f"{nome} $")


def verificar_pasta(pasta):
    """Verifica todos os arquivos da pasta. Devolve (arquivos verificados, problemas)."""
    arquivos = sorted(p for p in pasta.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSOES)
    problemas = []
    for caminho in arquivos:
        problemas += verificar_arquivo(caminho, caminho.relative_to(pasta).as_posix())
    return len(arquivos), problemas


def main():
    pasta = Path(sys.argv[1]) if len(sys.argv) > 1 else PASTA_PROCESSADOS
    if not pasta.is_dir():
        print(f"ERRO: pasta não encontrada: {pasta}", file=sys.stderr)
        sys.exit(1)
    total, problemas = verificar_pasta(pasta)
    if problemas:
        print(f"ERRO: {len(problemas)} problema(s) de privacidade em {total} arquivo(s):", file=sys.stderr)
        for problema in problemas:
            print(f"  - {problema}", file=sys.stderr)
        sys.exit(1)
    print(f"OK: {total} arquivo(s) verificado(s), nenhum problema de privacidade.")


if __name__ == "__main__":
    main()
