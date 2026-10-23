// Dados gerados pelo pipeline Python (dados/processados/). O site só lê estes
// arquivos; nunca o .gdb. A distribuidora de estudo vem de pipeline/distribuidora.json.
import arquivoJson from "../../dados/processados/arquivo.json";
import catalogoJson from "../../dados/processados/catalogo.json";

export const arquivo = arquivoJson;

/** Nome curto da distribuidora de estudo (ex.: "DMED"). */
export const distribuidora = arquivo.distribuidora;

export type Camada = {
  nome: string;
  geometria: string;
  /** Número de registros, ou "menos de 3" em camadas de unidades com 1 ou 2 registros (privacidade). */
  registros: number | string;
  crs: string | null;
  colunas: { nome: string; tipo: string }[];
};

export const catalogo = catalogoJson as {
  total_camadas: number;
  camadas_vazias: number;
  camadas: Camada[];
};

/** Acha a camada pela sigla, aceitando com ou sem o sufixo "_tab" (ex.: UCBT ou UCBT_tab). */
export function acharCamada(sigla: string): Camada | undefined {
  const alvo = sigla.toUpperCase();
  return catalogo.camadas.find(
    (c) => c.nome.toUpperCase() === alvo || c.nome.toUpperCase() === `${alvo}_TAB`,
  );
}

/** Registros para mostrar: "93.995" ou "menos de 3". */
export function registrosTexto(c: Camada | undefined): string {
  if (!c) return "";
  return typeof c.registros === "number" ? c.registros.toLocaleString("pt-BR") : c.registros;
}

/** Registros para calcular (tamanhos, estimativas). Uma camada mascarada conta como 1: tem algo, mas pouco. */
export function registrosNumero(c: Camada | undefined): number {
  if (!c) return 0;
  return typeof c.registros === "number" ? c.registros : 1;
}

/** "2025-12-31" -> "31/12/2025" */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
