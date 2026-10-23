"""Gera o catálogo de camadas da BDGD a partir do .gdb em dados/brutos/.

Lê só metadados (nomes de camadas, contagens, colunas e tipos); nenhuma linha
de dado é carregada. Grava em dados/processados/:
  - arquivo.json:  procedência do arquivo baixado (nome decifrado, tamanho, SHA-256, origem)
  - catalogo.json: cada camada com geometria, número de registros, CRS e colunas

Uso:  .venv\\Scripts\\python.exe pipeline\\catalogar_gdb.py
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import pyogrio

RAIZ = Path(__file__).resolve().parent.parent
PASTA_BRUTOS = RAIZ / "dados" / "brutos" / "nova_palma_2025"
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

# Arquivo de estudo, conforme o CLAUDE.md. Tamanho e SHA-256 são do download
# original: se o arquivo em disco for outro, o script para com erro.
ARQUIVO_ZIP = "Nova_Palma_400_2025-12-31_V11_20260823-1836.gdb.zip"
TAMANHO_ESPERADO = 6_293_535
SHA256_ESPERADO = "1742CD48698F01A040AEEC50117E365D294876D9D689CB69247D555636321025"
DATA_DOWNLOAD = "2026-10-23"
ITEM_ARCGIS = "e3a518b754ff42fcaf0232003c0b1e9d"
DISTRIBUIDORA = "Nova Palma (UHENPAL)"

# Sufixo de modelo no nome do arquivo, conforme o glossário do Manual de
# Instruções da BDGD (Rev. 5, p. 5).
MODELOS = {
    "M6": "Modelo Antigo (Módulos 2 e 6 do PRODIST)",
    "M10": "Modelo Novo (Módulo 10 do PRODIST, Revisão 0)",
    "V10": "Modelo V1.0 (Manual de Instruções da BDGD, Revisão 1)",
    "V11": "Modelo V1.1 (versão atual do Manual de Instruções da BDGD)",
}

PADRAO_NOME = re.compile(
    r"^(?P<nome>.+?)_(?P<codigo>\d+)_(?P<data_ref>\d{4}-\d{2}-\d{2})"
    r"_(?P<modelo>[A-Z]\d+)_(?P<geracao>\d{8}-\d{4})\.gdb\.zip$"
)


def falhar(mensagem):
    print(f"ERRO: {mensagem}", file=sys.stderr)
    sys.exit(1)


def sha256(caminho):
    h = hashlib.sha256()
    with caminho.open("rb") as f:
        for bloco in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloco)
    return h.hexdigest().upper()


def descrever_arquivo(zip_path):
    partes = PADRAO_NOME.match(zip_path.name)
    if not partes:
        falhar(f"nome fora do padrão esperado: {zip_path.name}")

    tamanho = zip_path.stat().st_size
    if tamanho != TAMANHO_ESPERADO:
        falhar(f"tamanho {tamanho} difere do esperado {TAMANHO_ESPERADO}")
    hash_atual = sha256(zip_path)
    if hash_atual != SHA256_ESPERADO:
        falhar(f"SHA-256 {hash_atual} difere do esperado")

    geracao = partes["geracao"]
    return {
        "arquivo": zip_path.name,
        "distribuidora": DISTRIBUIDORA,
        "partes_do_nome": {
            "nome": partes["nome"],
            "codigo_aneel": int(partes["codigo"]),
            "data_referencia": partes["data_ref"],
            "modelo": partes["modelo"],
            "modelo_descricao": MODELOS.get(partes["modelo"], "desconhecido"),
            "geracao": geracao,
            "geracao_interpretada": f"{geracao[0:4]}-{geracao[4:6]}-{geracao[6:8]} {geracao[9:11]}:{geracao[11:13]}",
            "geracao_confirmada": False,
        },
        "tamanho_bytes": tamanho,
        "sha256": hash_atual,
        "origem": {
            "portal": "Dados Abertos ANEEL (ArcGIS Hub)",
            "item_arcgis": ITEM_ARCGIS,
            "url_download": f"https://www.arcgis.com/sharing/rest/content/items/{ITEM_ARCGIS}/data",
        },
        "data_download": DATA_DOWNLOAD,
        "fonte": "ANEEL - Base de Dados Geográfica da Distribuidora (BDGD)",
        "licenca": "ODbL",
    }


def catalogar(gdb_path):
    camadas = []
    for nome, geometria in pyogrio.list_layers(gdb_path):
        info = pyogrio.read_info(gdb_path, layer=nome, force_feature_count=True)
        camadas.append({
            "nome": nome,
            "geometria": geometria or "tabela",
            "registros": int(info["features"]),
            "crs": info["crs"],
            "colunas": [
                {"nome": coluna, "tipo": str(tipo)}
                for coluna, tipo in zip(info["fields"], info["dtypes"])
            ],
        })
    camadas.sort(key=lambda c: c["nome"])
    return {
        "arquivo": gdb_path.name,
        "total_camadas": len(camadas),
        "camadas_geograficas": sum(c["geometria"] != "tabela" for c in camadas),
        "tabelas": sum(c["geometria"] == "tabela" for c in camadas),
        "camadas": camadas,
        "fonte": "ANEEL - Base de Dados Geográfica da Distribuidora (BDGD)",
        "licenca": "ODbL",
    }


def gravar(dados, caminho):
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Gravado: {caminho.relative_to(RAIZ)}")


def main():
    zip_path = PASTA_BRUTOS / ARQUIVO_ZIP
    gdb_path = PASTA_BRUTOS / ARQUIVO_ZIP.removesuffix(".zip")
    if not zip_path.exists():
        falhar(f"zip não encontrado: {zip_path.relative_to(RAIZ)}")
    if not gdb_path.is_dir():
        falhar(f".gdb não extraído: {gdb_path.relative_to(RAIZ)}")

    PASTA_PROCESSADOS.mkdir(parents=True, exist_ok=True)
    gravar(descrever_arquivo(zip_path), PASTA_PROCESSADOS / "arquivo.json")
    catalogo = catalogar(gdb_path)
    gravar(catalogo, PASTA_PROCESSADOS / "catalogo.json")
    print(f"{catalogo['total_camadas']} camadas "
          f"({catalogo['camadas_geograficas']} geográficas, {catalogo['tabelas']} tabelas)")


if __name__ == "__main__":
    main()
