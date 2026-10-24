// GD × capacidade, gerado por pipeline/gd.py (dados/processados/gd.json).
// Grupos com 1 ou 2 geradores vêm como "menos de 3" e os escondidos para não serem
// deduzidos por subtração vêm como "oculto"; nos dois casos, sem potência nem razão.
import gdJson from "../../dados/processados/gd.json";
import type { Contagem } from "./raioX";

export type GrupoGd = { qtd_ug: Contagem; ug_potencia_kw: number | null; ug_razao_pct: number | null };

export const gd = gdJson as unknown as {
  paginas_manual: { TPOTAPRT: number };
  totais: {
    geradores_bt: { qtd_ug: number; ug_potencia_kw: number; ug_razao_pct: number };
    geradores_mt: { qtd_ug: number; ug_potencia_kw: number };
    capacidade_kva: number;
    transformadores: number;
    transformadores_com_gd: number;
    transformadores_com_3_ou_mais: number;
    equipamentos_eqtrmt: number;
    capacidade_diferente_da_untrmt: number;
  };
  alimentadores: { alimentador: string; nome: string; subestacao: string; capacidade_kva: number; geradores_bt: GrupoGd }[];
  faixas_razao_transformadores: { de: number; ate: number | null; transformadores: number }[];
  maiores_razoes: {
    transformador: string;
    alimentador: string;
    capacidade_kva: number;
    qtd_ug: number;
    ug_potencia_kw: number;
    ug_razao_pct: number;
  }[];
};
