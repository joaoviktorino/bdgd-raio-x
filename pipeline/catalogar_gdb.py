"""Gera o catálogo de camadas da BDGD a partir do .gdb em dados/brutos/.

Lê só metadados (nomes de camadas, contagens, colunas e tipos); nenhuma linha
de dado é carregada. A distribuidora de estudo vem de pipeline/distribuidora.json.
Grava em dados/processados/:
  - arquivo.json:  procedência do arquivo baixado (nome decifrado, tamanho, SHA-256,
                   conteúdo do zip, origem, códigos do Anexo III)
  - catalogo.json: cada camada com geometria, número de registros, CRS e colunas

Uso:  .venv\\Scripts\\python.exe pipeline\\catalogar_gdb.py
"""
import hashlib
import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

import pyogrio

sys.path.insert(0, str(Path(__file__).resolve().parent))
from checar_privacidade import CAMADA_DE_UNIDADES, MASCARA, MINIMO_UNIDADES  # noqa: E402

RAIZ = Path(__file__).resolve().parent.parent
CONFIGURACAO = RAIZ / "pipeline" / "distribuidora.json"
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

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


def conteudo_do_zip(zip_path):
    """Lê a lista interna do zip (sem extrair): pasta raiz, arquivos e tamanho descompactado."""
    with zipfile.ZipFile(zip_path) as z:
        arquivos = [i for i in z.infolist() if not i.is_dir()]
    raizes = sorted({i.filename.split("/")[0] for i in arquivos})
    extensoes = Counter(Path(i.filename).suffix.lower() or "(sem extensão)" for i in arquivos)
    return {
        "pasta": raizes[0] if len(raizes) == 1 else raizes,
        "arquivos": len(arquivos),
        "tamanho_descompactado_bytes": sum(i.file_size for i in arquivos),
        "arquivos_por_extensao": dict(sorted(extensoes.items(), key=lambda e: (-e[1], e[0]))),
    }


def descrever_arquivo(zip_path, cfg):
    partes = PADRAO_NOME.match(zip_path.name)
    if not partes:
        falhar(f"nome fora do padrão esperado: {zip_path.name}")

    tamanho = zip_path.stat().st_size
    if tamanho != cfg["tamanho_bytes"]:
        falhar(f"tamanho {tamanho} difere do esperado {cfg['tamanho_bytes']}")
    hash_atual = sha256(zip_path)
    if hash_atual != cfg["sha256"]:
        falhar(f"SHA-256 {hash_atual} difere do esperado")
    if int(partes["codigo"]) != cfg["anexo_iii"]["dist_sari"]:
        falhar("o código no nome do arquivo não bate com o DIST (SARI) da configuração")

    geracao = partes["geracao"]
    return {
        "arquivo": zip_path.name,
        "distribuidora": cfg["nome"],
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
        "anexo_iii": {k: v for k, v in cfg["anexo_iii"].items() if not k.startswith("_")},
        "tamanho_bytes": tamanho,
        "sha256": hash_atual,
        "conteudo_zip": conteudo_do_zip(zip_path),
        "origem": {
            "portal": "Dados Abertos ANEEL (ArcGIS Hub)",
            "item_arcgis": cfg["item_arcgis"],
            "url_download": f"https://www.arcgis.com/sharing/rest/content/items/{cfg['item_arcgis']}/data",
        },
        "data_download": cfg["data_download"],
        "fonte": "ANEEL - Base de Dados Geográfica da Distribuidora (BDGD)",
        "licenca": "ODbL",
    }


def registros_publicaveis(nome, n):
    """Camadas de unidades consumidoras ou geradoras com 1 ou 2 registros não mostram o número."""
    if CAMADA_DE_UNIDADES.match(nome) and 0 < n < MINIMO_UNIDADES:
        return MASCARA
    return n


def catalogar(gdb_path):
    camadas = []
    for nome, geometria in pyogrio.list_layers(gdb_path):
        info = pyogrio.read_info(gdb_path, layer=nome, force_feature_count=True)
        camadas.append({
            "nome": nome,
            "geometria": geometria or "tabela",
            "registros": registros_publicaveis(nome, int(info["features"])),
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
        "camadas_vazias": sum(c["registros"] == 0 for c in camadas),
        "camadas": camadas,
        "fonte": "ANEEL - Base de Dados Geográfica da Distribuidora (BDGD)",
        "licenca": "ODbL",
    }


def gravar(dados, caminho):
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Gravado: {caminho.relative_to(RAIZ)}")


def main():
    cfg = json.loads(CONFIGURACAO.read_text(encoding="utf-8"))
    pasta = RAIZ / "dados" / "brutos" / cfg["pasta_brutos"]
    zip_path = pasta / cfg["arquivo_zip"]
    gdb_path = pasta / cfg["arquivo_zip"].removesuffix(".zip")
    if not zip_path.exists():
        falhar(f"zip não encontrado: {zip_path.relative_to(RAIZ)}")
    if not gdb_path.is_dir():
        falhar(f".gdb não extraído: {gdb_path.relative_to(RAIZ)}")

    PASTA_PROCESSADOS.mkdir(parents=True, exist_ok=True)
    gravar(descrever_arquivo(zip_path, cfg), PASTA_PROCESSADOS / "arquivo.json")
    catalogo = catalogar(gdb_path)
    gravar(catalogo, PASTA_PROCESSADOS / "catalogo.json")
    print(f"{catalogo['total_camadas']} camadas "
          f"({catalogo['camadas_geograficas']} geográficas, {catalogo['tabelas']} tabelas, "
          f"{catalogo['camadas_vazias']} vazias)")


if __name__ == "__main__":
    main()
