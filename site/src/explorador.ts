// Dados do explorador de camadas (dados/processados/explorador.json), carregados só
// quando uma página de camadas é aberta, e guardados para as próximas.
import { useEffect, useState } from "react";

export type Coluna = {
  campo: string;
  tipo: string;
  descricao: string;
  pagina: number;
  obrigatorio: boolean;
  no_arquivo: boolean;
  dominio?: string;
  /** Camadas para onde a coluna aponta (campos "Vinculado"; alguns aceitam mais de uma). */
  liga_a?: string[];
};

export type CamadaExplorador = {
  nome: string;
  sigla: string;
  nome_oficial: string;
  grupo: string;
  conjunto: string;
  tipo: "geografica" | "nao_geografica";
  feicao: string | null;
  geometria: string;
  registros: number | string;
  vazia: boolean;
  vazia_em_todas_as_comparadas: boolean;
  descricao: string;
  pagina_lista: number;
  pagina_entidade: number;
  liga_a: string[];
  ligada_por: { camada: string; campo: string }[];
  colunas: Coluna[];
  colunas_so_no_arquivo: string[];
};

export type Explorador = {
  distribuidora: string;
  distribuidoras_comparadas: number;
  grupos: { nome: string; camadas: string[] }[];
  camadas: CamadaExplorador[];
};

let promessa: Promise<Explorador> | null = null;

function carregar(): Promise<Explorador> {
  promessa ??= import("../../dados/processados/explorador.json").then((m) => m.default as unknown as Explorador);
  return promessa;
}

/** Devolve o explorador quando carregado (ou null enquanto carrega). */
export function useExplorador(): Explorador | null {
  const [dados, setDados] = useState<Explorador | null>(null);
  useEffect(() => {
    let ativo = true;
    carregar().then((d) => ativo && setDados(d));
    return () => {
      ativo = false;
    };
  }, []);
  return dados;
}

/** Acha a camada pelo nome ou pela sigla (UCBT ou UCBT_tab). */
export function acharNoExplorador(exp: Explorador, sigla: string): CamadaExplorador | undefined {
  const alvo = sigla.toUpperCase();
  return exp.camadas.find((c) => c.nome.toUpperCase() === alvo || c.sigla.toUpperCase() === alvo);
}

/** "ponto" | "linha" | "poligono" | "tabela" pela geometria do arquivo. */
export function formaDe(geometria: string): "ponto" | "linha" | "poligono" | "tabela" {
  if (geometria.includes("Point")) return "ponto";
  if (geometria.includes("Line")) return "linha";
  if (geometria.includes("Polygon")) return "poligono";
  return "tabela";
}

export const NOME_FORMA = { ponto: "Ponto", linha: "Linha", poligono: "Polígono", tabela: "Tabela" };

/** Colunas que identificam uma unidade consumidora ou geradora: o site nunca mostra valores delas. */
export const COLUNAS_IDENTIFICADORAS = new Set(["COD_ID", "PAC", "PN_CON", "CEP", "BRR", "RAMAL", "LGRD"]);
