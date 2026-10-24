"""Testes da GD × capacidade (pipeline/gd.py e dados/processados/gd.json).

A conferência direta no .gdb (3 transformadores recalculados do zero) só roda
quando o arquivo da distribuidora está em dados/brutos/; sem ele, é pulada.

Uso:  .venv\\Scripts\\python.exe -m unittest discover -s pipeline\\testes -v
"""
import json
import sys
import unittest
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))
from checar_privacidade import MASCARA, OCULTO  # noqa: E402
from gd import proteger, vaza  # noqa: E402

RAIZ = PIPELINE.parent
PROCESSADOS = RAIZ / "dados" / "processados"


def carregar(nome):
    return json.loads((PROCESSADOS / nome).read_text(encoding="utf-8"))


def caminho_do_gdb():
    config = json.loads((PIPELINE / "distribuidora.json").read_text(encoding="utf-8"))
    return RAIZ / "dados" / "brutos" / config["pasta_brutos"] / config["arquivo_zip"].removesuffix(".zip")


class Protecao(unittest.TestCase):
    def g(self, q, kw=1.0):
        return {"qtd_ug": q, "ug_potencia_kw": kw, "ug_razao_pct": 1.0}

    def test_uma_mascarada_vaza_e_e_protegida(self):
        total = {"qtd_ug": 21}
        partes = [self.g(10), self.g(9), {"qtd_ug": MASCARA, "ug_potencia_kw": None}]
        self.assertTrue(vaza(total, partes))
        proteger(total, partes)
        self.assertFalse(vaza(total, partes))
        self.assertEqual(partes[1]["qtd_ug"], OCULTO)
        self.assertIsNone(partes[1]["ug_potencia_kw"])

    def test_escondidas_somando_menos_de_3_vazam(self):
        # Duas mascaradas valendo 1 cada: a potência das duas sairia por subtração.
        self.assertTrue(vaza({"qtd_ug": 12}, [self.g(10), {"qtd_ug": MASCARA}, {"qtd_ug": MASCARA}]))

    def test_tres_mascaradas_somando_4_nao_vazam(self):
        self.assertFalse(vaza({"qtd_ug": 14}, [self.g(10)] + [{"qtd_ug": MASCARA}] * 3))


class GdProcessado(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gd = carregar("gd.json")
        cls.registros = {c["nome"]: c["registros"] for c in carregar("catalogo.json")["camadas"]}

    def test_totais_batem_com_o_catalogo(self):
        t = self.gd["totais"]
        self.assertEqual(t["geradores_bt"]["qtd_ug"], self.registros["UGBT_tab"])
        self.assertEqual(t["geradores_mt"]["qtd_ug"], self.registros["UGMT_tab"])
        self.assertEqual(t["transformadores"], self.registros["UNTRMT"])

    def test_nenhum_grupo_pode_ser_deduzido(self):
        alim = [a["geradores_bt"] for a in self.gd["alimentadores"]]
        self.assertFalse(vaza(self.gd["totais"]["geradores_bt"], alim))

    def test_grupos_escondidos_sem_potencia(self):
        for a in self.gd["alimentadores"]:
            g = a["geradores_bt"]
            if g["qtd_ug"] in (MASCARA, OCULTO):
                self.assertIsNone(g["ug_potencia_kw"], a["alimentador"])
                self.assertIsNone(g["ug_razao_pct"], a["alimentador"])

    def test_maiores_razoes_so_com_3_ou_mais_e_em_ordem(self):
        maiores = self.gd["maiores_razoes"]
        self.assertTrue(maiores)
        self.assertTrue(all(m["qtd_ug"] >= 3 for m in maiores))
        razoes = [m["ug_razao_pct"] for m in maiores]
        self.assertEqual(razoes, sorted(razoes, reverse=True))

    def test_faixas_somam_os_transformadores_com_3_ou_mais(self):
        soma = sum(f["transformadores"] for f in self.gd["faixas_razao_transformadores"])
        self.assertEqual(soma, self.gd["totais"]["transformadores_com_3_ou_mais"])

    @unittest.skipUnless(caminho_do_gdb().exists(), "arquivo .gdb da distribuidora não está em dados/brutos/")
    def test_tres_transformadores_conferidos_direto_no_gdb(self):
        import pyogrio

        gdb = str(caminho_do_gdb())
        dominio = next(d for d in carregar("dicionario.json")["dominios"] if d["sigla"] == "TPOTAPRT")
        kva = {str(v["codigo"]): float(str(v["pot"]).replace(",", ".")) for v in dominio["valores"]}
        ug = pyogrio.read_dataframe(gdb, layer="UGBT_tab", columns=["UNI_TR_MT", "POT_INST"], read_geometry=False)
        eq = pyogrio.read_dataframe(gdb, layer="EQTRMT", columns=["UNI_TR_MT", "POT_NOM"], read_geometry=False)
        for m in self.gd["maiores_razoes"][:3]:
            meus = ug[ug.UNI_TR_MT == m["transformador"]]
            cap = sum(kva[str(c)] for c in eq.POT_NOM[eq.UNI_TR_MT == m["transformador"]])
            self.assertEqual(len(meus), m["qtd_ug"], m["transformador"])
            self.assertAlmostEqual(meus.POT_INST.sum(), m["ug_potencia_kw"], delta=0.06)
            self.assertAlmostEqual(cap, m["capacidade_kva"], delta=0.01)
            self.assertAlmostEqual(100 * meus.POT_INST.sum() / cap, m["ug_razao_pct"], delta=0.06)


if __name__ == "__main__":
    unittest.main()
