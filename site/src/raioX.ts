// Raio-x da rede, gerado por pipeline/raio_x.py (dados/processados/raio_x.json).
// Contagens de unidades consumidoras podem vir mascaradas: "menos de 3" (grupo
// pequeno) ou "oculto" (escondida para que um grupo pequeno não seja deduzido
// por subtração).
import raioXJson from "../../dados/processados/raio_x.json";
import { inteiro } from "./formatos";

export type Contagem = number | string;

export type Alimentador = {
  alimentador: string;
  nome: string;
  subestacao: string;
  tensao: string;
  km_mt: number;
  km_bt: number;
  transformadores: number;
  potencia_kva: number;
  consumidores_bt: { qtd_uc: Contagem };
  consumidores_mt: { qtd_uc: Contagem };
};

export type Subestacao = {
  subestacao: string;
  nome: string;
  alimentadores: number;
  km_mt: number;
  km_bt: number;
  transformadores: number;
  potencia_kva: number;
  consumidores_bt: { qtd_uc: Contagem };
  consumidores_mt: { qtd_uc: Contagem };
};

export const raioX = raioXJson as unknown as {
  paginas_manual: { TTEN: number; TSITATI: number };
  totais: {
    subestacoes: number;
    alimentadores: number;
    transformadores: number;
    potencia_kva: number;
    consumidores_bt: { qtd_uc: number };
    consumidores_mt: { qtd_uc: number };
    mediana_uc_bt_por_transformador: number;
  };
  comprimentos: { camada: string; rede: "AT" | "MT" | "BT"; trechos: number; km_comp: number; km_medido: number }[];
  tensoes: { codigo: string; descricao: string; alimentadores: number }[];
  situacao_uc_bt: { codigo: string; descricao: string; qtd_uc: Contagem }[];
  subestacoes: Subestacao[];
  alimentadores: Alimentador[];
  potencias_transformadores: { kva: number; transformadores: number }[];
  faixas_uc_bt_por_transformador: { de: number; ate: number | null; transformadores: number }[];
};

/** Número para gráficos; contagens mascaradas não têm valor (null). */
export const numero = (c: Contagem): number | null => (typeof c === "number" ? c : null);

/** Texto para mostrar: "4.530", "menos de 3" ou "oculto". */
export const contagemTexto = (c: Contagem): string => (typeof c === "number" ? inteiro(c) : c);

export function decimal(n: number, casas = 1): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Subestações que têm alimentadores, na ordem fixa das cores (cor segue a subestação). */
export const SUBESTACOES_COM_ALIMENTADOR = raioX.subestacoes
  .filter((s) => s.alimentadores > 0)
  .map((s) => s.subestacao);

/** Índice da cor categórica da subestação (0 a 3), ou -1 se não tiver cor. */
export const corDaSubestacao = (sigla: string) => SUBESTACOES_COM_ALIMENTADOR.indexOf(sigla);

/** Nome curto: "SUBESTAÇÃO - PC3 - (SATURNINO)" -> "PC3 Saturnino". */
export function nomeCurto(s: Subestacao): string {
  const apelido = s.nome.match(/\(([^)]+)\)/)?.[1] ?? s.nome.replace(/SUBESTA[ÇC][ÃA]O\s*-?\s*/i, "");
  const bonito = apelido
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/(\d)kv\b/i, "$1 kV");
  return s.subestacao === bonito.toUpperCase() ? s.subestacao : `${s.subestacao} · ${bonito}`;
}
