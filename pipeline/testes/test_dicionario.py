"""Testes do dicionário gerado (dados/processados/dicionario.json).

Conferem que o dicionário cobre o arquivo publicado e que os campos usados nas
fases 1 e 2 têm o tipo e a unidade descritos no Manual (Revisão 5).

Uso:  .venv\\Scripts\\python.exe -m unittest discover -s pipeline\\testes -v
"""
import json
import unittest
from pathlib import Path

PROCESSADOS = Path(__file__).resolve().parent.parent.parent / "dados" / "processados"


def carregar(nome):
    return json.loads((PROCESSADOS / nome).read_text(encoding="utf-8"))


class Dicionario(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.dicionario = carregar("dicionario.json")
        cls.catalogo = carregar("catalogo.json")
        cls.entidades = {e["sigla"]: e for e in cls.dicionario["entidades"]}
        cls.dominios = {d["sigla"]: d for d in cls.dicionario["dominios"]}

    def campo(self, entidade, nome):
        return next(c for c in self.entidades[entidade]["campos"] if c["campo"] == nome)

    def test_toda_camada_do_arquivo_tem_entidade_com_pagina(self):
        for camada in self.catalogo["camadas"]:
            sigla = camada["nome"].removesuffix("_tab")
            self.assertIn(sigla, self.entidades, camada["nome"])
            self.assertIsInstance(self.entidades[sigla]["pagina"], int)

    def test_todo_campo_tem_descricao_e_pagina(self):
        for entidade in self.entidades.values():
            for campo in entidade["campos"]:
                self.assertTrue(campo["descricao"], f"{entidade['sigla']}.{campo['campo']}")
                self.assertIsInstance(campo["pagina"], int)

    def test_potencia_do_transformador_muda_de_tipo_conforme_a_entidade(self):
        self.assertEqual(self.campo("UNTRMT", "POT_NOM")["tipo"], "Decimal")
        self.assertIn("kVA", self.campo("UNTRMT", "POT_NOM")["descricao"])
        self.assertEqual(self.campo("EQTRMT", "POT_NOM")["dominio"], "TPOTAPRT")

    def test_potencia_de_gd_em_kw(self):
        for entidade in ("UGBT", "UGMT"):
            campo = self.campo(entidade, "POT_INST")
            self.assertEqual(campo["tipo"], "Decimal")
            self.assertIn("kW", campo["descricao"])

    def test_comprimento_da_rede_em_metros(self):
        for entidade in ("SSDMT", "SSDBT"):
            campo = self.campo(entidade, "COMP")
            self.assertEqual(campo["tipo"], "Decimal")
            self.assertIn("(m)", campo["descricao"])

    def test_chaves_de_ligacao(self):
        self.assertEqual(self.campo("UCBT", "CTMT")["entidade_vinculada"], "CTMT")
        self.assertEqual(self.campo("UGBT", "UNI_TR_MT")["entidade_vinculada"], "UNTRMT")

    def test_dominio_tpotaprt_traduz_codigo_em_kva(self):
        valores = {v["codigo"]: v for v in self.dominios["TPOTAPRT"]["valores"]}
        self.assertEqual(valores["4"]["pot"], "15")
        self.assertEqual(valores["4"]["descricao"], "15 kVA")

    def test_campo_que_aceita_varias_entidades_liga_a_todas(self):
        self.assertEqual(self.campo("EQSE", "UN_SE")["entidades_vinculadas"], ["UNSEAT", "UNSEMT", "UNSEBT"])
        explorador = carregar("explorador.json")
        eqse = next(c for c in explorador["camadas"] if c["sigla"] == "EQSE")
        self.assertEqual(sorted(eqse["liga_a"]), ["UNSEAT", "UNSEBT", "UNSEMT"])

    def test_explorador_cobre_todas_as_camadas_com_grupo_e_descricao(self):
        explorador = carregar("explorador.json")
        nomes = {c["nome"] for c in explorador["camadas"]}
        self.assertEqual(nomes, {c["nome"] for c in self.catalogo["camadas"]})
        nos_grupos = [n for g in explorador["grupos"] for n in g["camadas"]]
        self.assertEqual(sorted(nos_grupos), sorted(nomes))
        for c in explorador["camadas"]:
            self.assertTrue(c["descricao"], c["nome"])

    def test_todo_campo_dda_aponta_para_dominio_existente(self):
        for entidade in self.entidades.values():
            for campo in entidade["campos"]:
                if "dominio" in campo:
                    self.assertIn(campo["dominio"], self.dominios, f"{entidade['sigla']}.{campo['campo']}")


if __name__ == "__main__":
    unittest.main()
