"""Testes do raio-x da rede (pipeline/raio_x.py e dados/processados/raio_x.json).

Conferem a proteção contra dedução por subtração e a coerência dos totais com o
catálogo. Não precisam do .gdb: leem só os dados processados.

Uso:  .venv\\Scripts\\python.exe -m unittest discover -s pipeline\\testes -v
"""
import json
import sys
import unittest
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE))
from checar_privacidade import MASCARA, OCULTO  # noqa: E402
from raio_x import particoes, partes_deduziveis, proteger_por_subtracao  # noqa: E402

PROCESSADOS = PIPELINE.parent / "dados" / "processados"


def carregar(nome):
    return json.loads((PROCESSADOS / nome).read_text(encoding="utf-8"))


class DeducaoPorSubtracao(unittest.TestCase):
    def test_uma_parte_mascarada_e_deduzivel(self):
        self.assertEqual(partes_deduziveis(12, [10, MASCARA]), [1])

    def test_duas_mascaradas_somando_4_sao_deduziveis(self):
        self.assertEqual(partes_deduziveis(14, [10, MASCARA, MASCARA]), [1, 2])

    def test_duas_mascaradas_somando_3_nao_sao(self):
        self.assertEqual(partes_deduziveis(13, [10, MASCARA, MASCARA]), [])

    def test_oculto_junto_protege_a_mascarada(self):
        self.assertEqual(partes_deduziveis(112, [100, MASCARA, OCULTO]), [])

    def test_oculto_que_so_pode_valer_3_e_deduzivel(self):
        self.assertEqual(partes_deduziveis(104, [100, MASCARA, OCULTO]), [1, 2])

    def test_protecao_esconde_a_menor_parte_visivel(self):
        raio_x = {
            "totais": {"consumidores_bt": {"qtd_uc": 117}, "consumidores_mt": {"qtd_uc": 0}},
            "subestacoes": [{"subestacao": "S", "consumidores_bt": {"qtd_uc": 117},
                             "consumidores_mt": {"qtd_uc": 0}}],
            "alimentadores": [
                {"subestacao": "S", "consumidores_bt": {"qtd_uc": q}, "consumidores_mt": {"qtd_uc": 0}}
                for q in (100, 15, MASCARA)
            ],
        }
        proteger_por_subtracao(raio_x)
        self.assertEqual([a["consumidores_bt"]["qtd_uc"] for a in raio_x["alimentadores"]], [100, OCULTO, MASCARA])


class RaioXProcessado(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.raio_x = carregar("raio_x.json")
        cls.registros = {c["nome"]: c["registros"] for c in carregar("catalogo.json")["camadas"]}

    def test_nenhum_valor_mascarado_pode_ser_deduzido(self):
        for nome, total, partes in particoes(self.raio_x):
            self.assertEqual(partes_deduziveis(total["qtd_uc"], [p["qtd_uc"] for p in partes]), [], nome)

    def test_totais_batem_com_o_catalogo(self):
        t = self.raio_x["totais"]
        self.assertEqual(t["subestacoes"], self.registros["SUB"])
        self.assertEqual(t["alimentadores"], self.registros["CTMT"])
        self.assertEqual(t["transformadores"], self.registros["UNTRMT"])
        self.assertEqual(t["consumidores_bt"]["qtd_uc"], self.registros["UCBT_tab"])
        self.assertEqual(t["consumidores_mt"]["qtd_uc"], self.registros["UCMT_tab"])
        for c in self.raio_x["comprimentos"]:
            self.assertEqual(c["trechos"], self.registros[c["camada"]], c["camada"])

    def test_alimentadores_somam_os_totais(self):
        alim = self.raio_x["alimentadores"]
        t = self.raio_x["totais"]
        self.assertEqual(len(alim), t["alimentadores"])
        self.assertEqual(sum(a["transformadores"] for a in alim), t["transformadores"])
        self.assertAlmostEqual(sum(a["potencia_kva"] for a in alim), t["potencia_kva"], delta=1)

    def test_distribuicoes_somam_os_transformadores(self):
        total = self.raio_x["totais"]["transformadores"]
        self.assertEqual(sum(p["transformadores"] for p in self.raio_x["potencias_transformadores"]), total)
        self.assertEqual(sum(f["transformadores"] for f in self.raio_x["faixas_uc_bt_por_transformador"]), total)

    def test_comprimento_medido_fica_perto_do_declarado(self):
        for c in self.raio_x["comprimentos"]:
            self.assertLess(abs(c["km_medido"] - c["km_comp"]) / c["km_comp"], 0.05, c["camada"])


if __name__ == "__main__":
    unittest.main()
