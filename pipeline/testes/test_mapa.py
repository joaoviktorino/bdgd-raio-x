"""Testes do mapa da rede (dados/processados/mapa_*.geojson, gerados por pipeline/mapa.py).

Uso:  .venv\\Scripts\\python.exe -m unittest discover -s pipeline\\testes -v
"""
import json
import unittest
from pathlib import Path

PROCESSADOS = Path(__file__).resolve().parent.parent.parent / "dados" / "processados"
ARQUIVOS = ["mapa_rede", "mapa_bt", "mapa_transformadores"]
LIMITE_KB = 800  # cada arquivo; o mapa precisa abrir rápido no celular


def carregar(nome):
    return json.loads((PROCESSADOS / nome).read_text(encoding="utf-8"))


class Mapa(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mapas = {n: carregar(f"{n}.geojson") for n in ARQUIVOS}
        cls.raio_x = carregar("raio_x.json")
        cls.registros = {c["nome"]: c["registros"] for c in carregar("catalogo.json")["camadas"]}

    def camadas(self, nome):
        return {f["properties"]["camada"] for f in self.mapas[nome]["features"]}

    def test_so_camadas_de_rede_e_area(self):
        self.assertEqual(self.camadas("mapa_rede"), {"ARAT", "SUB", "SSDAT", "SSDMT"})
        self.assertEqual(self.camadas("mapa_bt"), {"SSDBT"})
        self.assertEqual(self.camadas("mapa_transformadores"), {"UNTRMT"})

    def test_nenhuma_contagem_de_unidades_no_mapa(self):
        for nome, mapa in self.mapas.items():
            for f in mapa["features"]:
                chaves = set(f["properties"])
                self.assertFalse({"qtd_uc", "qtd_ug"} & chaves, nome)
                self.assertFalse(any(c.startswith(("uc_", "ug_")) for c in chaves), nome)

    def test_cada_alimentador_tem_sua_rede_mt(self):
        alimentadores = {f["properties"]["alimentador"] for f in self.mapas["mapa_rede"]["features"]
                         if f["properties"]["camada"] == "SSDMT"}
        self.assertEqual(alimentadores, {a["alimentador"] for a in self.raio_x["alimentadores"]})

    def test_trechos_somam_o_catalogo(self):
        for nome, camada in (("mapa_rede", "SSDMT"), ("mapa_rede", "SSDAT"), ("mapa_bt", "SSDBT")):
            trechos = sum(f["properties"]["trechos"] for f in self.mapas[nome]["features"]
                          if f["properties"]["camada"] == camada)
            self.assertEqual(trechos, self.registros[camada], camada)

    def test_todos_os_transformadores(self):
        self.assertEqual(len(self.mapas["mapa_transformadores"]["features"]), self.registros["UNTRMT"])

    def test_coordenadas_no_brasil_e_arredondadas(self):
        for f in self.mapas["mapa_transformadores"]["features"][:200]:
            lon, lat = f["geometry"]["coordinates"]
            self.assertTrue(-74 < lon < -34 and -34 < lat < 6)
            self.assertLessEqual(len(str(lon).split(".")[1]), 5)

    def test_arquivos_pequenos(self):
        for nome in ARQUIVOS:
            tamanho = (PROCESSADOS / f"{nome}.geojson").stat().st_size / 1024
            self.assertLess(tamanho, LIMITE_KB, nome)


if __name__ == "__main__":
    unittest.main()
