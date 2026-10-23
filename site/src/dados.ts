// Dados gerados pelo pipeline Python (dados/processados/). O site só lê estes
// arquivos; nunca o .gdb.
import arquivoJson from "../../dados/processados/arquivo.json";
import catalogoJson from "../../dados/processados/catalogo.json";

export const arquivo = arquivoJson;

export type Camada = {
  nome: string;
  geometria: string;
  registros: number;
  crs: string | null;
  colunas: { nome: string; tipo: string }[];
};

export const catalogo = catalogoJson as { total_camadas: number; camadas: Camada[] };

/** Acha a camada pela sigla, aceitando com ou sem o sufixo "_tab" (ex.: UCBT ou UCBT_tab). */
export function acharCamada(sigla: string): Camada | undefined {
  const alvo = sigla.toUpperCase();
  return catalogo.camadas.find(
    (c) => c.nome.toUpperCase() === alvo || c.nome.toUpperCase() === `${alvo}_TAB`,
  );
}

/** "2025-12-31" -> "31/12/2025" */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}
