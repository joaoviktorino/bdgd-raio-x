"""Gera as geometrias simplificadas do mapa da rede (GeoJSON) a partir do .gdb.

Grava em dados/processados/:
  - mapa_rede.geojson: área de atuação (ARAT), subestações (SUB), rede de alta
    tensão (SSDAT) e rede de média tensão (SSDMT), esta juntada por alimentador;
  - mapa_bt.geojson: rede de baixa tensão (SSDBT), juntada por alimentador;
  - mapa_transformadores.geojson: transformadores de distribuição (UNTRMT), com
    potência em kVA e alimentador.

Os trechos de rede de um mesmo alimentador viram uma só feição, simplificada
(tolerância de TOLERANCIA graus, cerca de 5 m) e com coordenadas arredondadas a
CASAS decimais (cerca de 1 m). Assim o mapa abre rápido também no celular.

Privacidade: unidades consumidoras e geradoras não entram no mapa, nem como pontos
nem agregadas por transformador (a contagem por transformador, subtraída do total
do alimentador publicado no raio-x, poderia revelar grupos com menos de 3).

Uso:  .venv\\Scripts\\python.exe pipeline\\mapa.py
"""
import json
import sys
from pathlib import Path

import pyogrio
import shapely
from pyproj import Geod
from shapely.geometry import mapping
from shapely.ops import linemerge

RAIZ = Path(__file__).resolve().parent.parent
CONFIGURACAO = RAIZ / "pipeline" / "distribuidora.json"
PASTA_PROCESSADOS = RAIZ / "dados" / "processados"

TOLERANCIA = 0.00005  # graus; cerca de 5 m
TOLERANCIA_AREA = 0.0002  # contornos de área de atuação e subestação; cerca de 20 m
CASAS = 5  # cerca de 1 m
CRS_ESPERADO = "EPSG:4674"
GEOD = Geod(ellps="GRS80")  # elipsoide do SIRGAS 2000


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
    df = pyogrio.read_dataframe(gdb, layer=camada, columns=colunas)
    if df.crs is None or df.crs.to_epsg() != 4674:
        falhar(f"{camada}: sistema de coordenadas {df.crs}, esperado {CRS_ESPERADO} (Módulo 10, item 45)")
    return df


def arredondar(coordenadas):
    if isinstance(coordenadas[0], (int, float)):
        return [round(c, CASAS) for c in coordenadas]
    return [arredondar(c) for c in coordenadas]


def feicao(geometria, propriedades):
    g = mapping(geometria)
    return {"type": "Feature", "properties": propriedades,
            "geometry": {"type": g["type"], "coordinates": arredondar(g["coordinates"])}}


def colecao(feicoes):
    return {"type": "FeatureCollection", "feicoes_de": "ANEEL, BDGD (licença ODbL). Cálculo: pipeline/mapa.py",
            "features": feicoes}


def rede_por_alimentador(gdb, camada, sub_de):
    df = ler(gdb, camada, ["CTMT", "COMP"])
    feicoes = []
    for alimentador, grupo in df.groupby("CTMT"):
        linhas = linemerge(shapely.union_all(grupo.geometry.values))
        feicoes.append(feicao(shapely.simplify(linhas, TOLERANCIA), {
            "camada": camada,
            "alimentador": alimentador,
            "subestacao": sub_de.get(alimentador),
            "trechos": len(grupo),
            "km": round(float(grupo.COMP.sum()) / 1000, 2),
        }))
    return feicoes


def montar(gdb):
    ctmt = pyogrio.read_dataframe(gdb, layer="CTMT", columns=["COD_ID", "SUB", "NOME"], read_geometry=False)
    sub_de = dict(zip(ctmt.COD_ID, ctmt.SUB))
    nome_de = dict(zip(ctmt.COD_ID, ctmt.NOME.astype(str).str.strip()))

    rede = []
    for g in ler(gdb, "ARAT", []).geometry:
        area = abs(GEOD.geometry_area_perimeter(g)[0]) / 1e6  # área geodésica, km²
        rede.append(feicao(shapely.simplify(g, TOLERANCIA_AREA), {"camada": "ARAT", "area_km2": round(area, 1)}))
    for linha in ler(gdb, "SUB", ["COD_ID", "NOME"]).itertuples():
        rede.append(feicao(shapely.simplify(linha.geometry, TOLERANCIA_AREA / 4), {
            "camada": "SUB", "subestacao": linha.COD_ID, "nome": str(linha.NOME).strip()}))
    at = ler(gdb, "SSDAT", ["CTAT", "COMP"])
    for circuito, grupo in at.groupby("CTAT"):
        linhas = linemerge(shapely.union_all(grupo.geometry.values))
        rede.append(feicao(shapely.simplify(linhas, TOLERANCIA), {
            "camada": "SSDAT", "circuito_at": circuito, "trechos": len(grupo),
            "km": round(float(grupo.COMP.sum()) / 1000, 2)}))
    mt = rede_por_alimentador(gdb, "SSDMT", sub_de)
    for f in mt:
        f["properties"]["nome"] = nome_de.get(f["properties"]["alimentador"])
    rede += mt

    bt = rede_por_alimentador(gdb, "SSDBT", sub_de)

    trafos = ler(gdb, "UNTRMT", ["COD_ID", "CTMT", "POT_NOM"])
    transformadores = [
        feicao(t.geometry, {
            "camada": "UNTRMT",
            "transformador": t.COD_ID,
            "alimentador": t.CTMT,
            "potencia_kva": float(t.POT_NOM),
        })
        for t in trafos.itertuples() if t.geometry is not None
    ]
    return {"mapa_rede": rede, "mapa_bt": bt, "mapa_transformadores": transformadores}, trafos


def conferir(arquivos, trafos):
    """Cada alimentador tem uma feição; km e trechos batem com o raio-x; nenhum transformador perdido."""
    raio_x = json.loads((PASTA_PROCESSADOS / "raio_x.json").read_text(encoding="utf-8"))
    erros = []
    for chave, rede in (("mapa_rede", "km_mt"), ("mapa_bt", "km_bt")):
        camada = "SSDMT" if rede == "km_mt" else "SSDBT"
        km = {f["properties"]["alimentador"]: f["properties"]["km"]
              for f in arquivos[chave] if f["properties"]["camada"] == camada}
        for a in raio_x["alimentadores"]:
            if abs(km.get(a["alimentador"], 0) - a[rede]) > 0.02:
                erros.append(f"{camada} {a['alimentador']}: {km.get(a['alimentador'])} km no mapa, {a[rede]} no raio-x")
    if len(arquivos["mapa_transformadores"]) != len(trafos):
        erros.append("há transformadores sem geometria")
    if erros:
        falhar("conferência do mapa falhou:\n  " + "\n  ".join(erros))


def main():
    gdb = caminho_do_gdb()
    arquivos, trafos = montar(gdb)
    conferir(arquivos, trafos)
    resumo = {"tolerancia_graus": TOLERANCIA, "casas_decimais": CASAS, "arquivos": []}
    for nome, feicoes in arquivos.items():
        destino = PASTA_PROCESSADOS / f"{nome}.geojson"
        destino.write_text(json.dumps(colecao(feicoes), ensure_ascii=False, separators=(",", ":")) + "\n",
                           encoding="utf-8")
        resumo["arquivos"].append({"arquivo": destino.name, "feicoes": len(feicoes),
                                   "kb": destino.stat().st_size // 1024})
        print(f"{destino.name}: {len(feicoes)} feições ({destino.stat().st_size // 1024} KB)")
    # Números pequenos que a página usa sem baixar os GeoJSON (área, tamanhos).
    resumo["area_km2"] = next(f["properties"]["area_km2"] for f in arquivos["mapa_rede"]
                              if f["properties"]["camada"] == "ARAT")
    (PASTA_PROCESSADOS / "mapa_resumo.json").write_text(
        json.dumps(resumo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
