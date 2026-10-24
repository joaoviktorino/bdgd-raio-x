"""Testes da trava de privacidade com arquivos de exemplo inventados.

Uso:  .venv\\Scripts\\python.exe -m unittest discover -s pipeline\\testes -v
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import checar_privacidade as trava  # noqa: E402


class TravaDePrivacidade(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.pasta = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def gravar(self, nome, conteudo):
        caminho = self.pasta / nome
        if isinstance(conteudo, str):
            caminho.write_text(conteudo, encoding="utf-8")
        else:
            caminho.write_text(json.dumps(conteudo, ensure_ascii=False), encoding="utf-8")

    def problemas(self):
        _, problemas = trava.verificar_pasta(self.pasta)
        return problemas

    def assertBarra(self, trecho):
        problemas = self.problemas()
        self.assertTrue(any(trecho in p for p in problemas), f"esperava '{trecho}' em {problemas}")

    # --- o que deve passar ---

    def test_dados_agregados_validos_passam(self):
        self.gravar("alimentadores.json", [
            {"alimentador": "AL01", "qtd_uc": 1520, "uc_energia_mwh": 830.5},
            {"alimentador": "AL02", "qtd_uc": "menos de 3", "uc_energia_mwh": None},
            {"alimentador": "AL03", "qtd_uc": 0, "qtd_ug": 0},
        ])
        self.gravar("transformadores.csv",
                    "transformador,qtd_ug,ug_potencia_kw\nTR1,12,85.2\nTR2,menos de 3,\n")
        self.gravar("rede.geojson", {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"camada": "SSDMT", "alimentador": "AL01"},
             "geometry": {"type": "LineString", "coordinates": [[-53.1, -29.5], [-53.2, -29.6]]}},
        ]})
        self.assertEqual(self.problemas(), [])

    def test_cod_id_como_valor_no_catalogo_passa(self):
        self.gravar("catalogo.json", {"camadas": [
            {"nome": "UCBT_tab", "colunas": [{"nome": "COD_ID", "tipo": "object"}, {"nome": "CEP", "tipo": "object"}]},
        ]})
        self.assertEqual(self.problemas(), [])

    def test_dados_atuais_do_projeto_passam(self):
        _, problemas = trava.verificar_pasta(trava.PASTA_PROCESSADOS)
        self.assertEqual(problemas, [])

    # --- regra 1: colunas que identificam unidade ---

    def test_barra_coluna_proibida_em_json(self):
        self.gravar("ucs.json", [{"alimentador": "AL01", "PAC": "123"}])
        self.assertBarra("coluna proibida 'PAC'")

    def test_barra_cod_id_generico(self):
        self.gravar("ucs.json", [{"COD_ID": "UC-1", "qtd_uc": 10}])
        self.assertBarra("coluna proibida 'COD_ID'")

    def test_barra_coluna_proibida_em_csv(self):
        self.gravar("ucs.csv", "alimentador,cep\nAL01,97000-000\n")
        self.assertBarra("coluna proibida 'cep'")

    # --- regra 2: grupos com menos de 3 unidades ---

    def test_barra_grupo_de_2_unidades_exposto(self):
        self.gravar("transformadores.json", [{"transformador": "TR1", "qtd_uc": 2}])
        self.assertBarra("qtd_uc = 2 exposto")

    def test_barra_grupo_de_1_gerador_em_csv(self):
        self.gravar("gd.csv", "transformador,qtd_ug,ug_potencia_kw\nTR1,1,5.0\n")
        self.assertBarra("qtd_ug = 1 exposto")

    def test_barra_valor_derivado_em_grupo_mascarado(self):
        self.gravar("gd.json", [{"transformador": "TR1", "qtd_ug": "menos de 3", "ug_potencia_kw": 7.5}])
        self.assertBarra("'ug_potencia_kw' preenchido num grupo mascarado")

    def test_barra_valor_derivado_em_grupo_oculto(self):
        self.gravar("gd.json", [{"transformador": "TR1", "qtd_ug": "oculto", "ug_potencia_kw": 7.5}])
        self.assertBarra("'ug_potencia_kw' preenchido num grupo mascarado")

    def test_barra_contagem_com_valor_invalido(self):
        self.gravar("gd.json", [{"transformador": "TR1", "qtd_ug": "poucos"}])
        self.assertBarra("valor inválido")

    def test_barra_camada_de_unidades_com_2_registros_no_catalogo(self):
        self.gravar("catalogo.json", {"camadas": [{"nome": "UCAT_tab", "registros": 2, "colunas": []}]})
        self.assertBarra("camada 'UCAT_tab' com 2 registros exposta")

    def test_camada_de_unidades_mascarada_e_camada_de_rede_pequena_passam(self):
        self.gravar("catalogo.json", {"camadas": [
            {"nome": "UGAT_tab", "registros": "menos de 3", "colunas": []},
            {"nome": "SUB", "registros": 2, "colunas": []},
        ]})
        self.assertEqual(self.problemas(), [])

    # --- regra 3: mapas ---

    def test_barra_feicao_de_unidade_consumidora(self):
        self.gravar("ucs.geojson", {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {"camada": "UCBT_tab"},
             "geometry": {"type": "Point", "coordinates": [-53.1, -29.5]}},
        ]})
        self.assertBarra("camada 'UCBT_tab'")

    def test_barra_feicao_sem_camada(self):
        self.gravar("rede.geojson", {"type": "FeatureCollection", "features": [
            {"type": "Feature", "properties": {},
             "geometry": {"type": "Point", "coordinates": [-53.1, -29.5]}},
        ]})
        self.assertBarra("sem a propriedade 'camada'")

    # --- regra 4: coordenadas soltas ---

    def test_barra_coordenada_solta(self):
        self.gravar("pontos.json", [{"transformador": "TR1", "lat": -29.5, "lon": -53.1}])
        self.assertBarra("coordenada solta 'lat'")

    # --- arquivos quebrados ---

    def test_barra_json_invalido(self):
        self.gravar("quebrado.json", "{isto não é json")
        self.assertBarra("não é um JSON válido")


if __name__ == "__main__":
    unittest.main()
