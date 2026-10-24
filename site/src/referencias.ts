// Cadastro das fontes citadas no site. Toda afirmação sobre a BDGD aponta para
// uma destas fontes, com o item ou a página (componente <Fonte />).
import { arquivo, dataBR, distribuidora } from "./dados";

export type Referencia = {
  curto: string;
  titulo: string;
  url: string;
};

export const REFERENCIAS = {
  modulo10: {
    curto: "Módulo 10",
    titulo:
      "PRODIST, Módulo 10 – Sistema de Informação Geográfica Regulatório (Anexo X da Resolução Normativa ANEEL nº 956, de 7 de dezembro de 2021)",
    url: "https://www.gov.br/aneel/pt-br/centrais-de-conteudos/procedimentos-regulatorios/prodist",
  },
  manual: {
    curto: "Manual da BDGD",
    titulo: "Manual de Instruções da Base de Dados Geográfica da Distribuidora – BDGD, Revisão 5 (vigência 01/03/2026)",
    url: "https://www.gov.br/aneel/pt-br/centrais-de-conteudos/manuais-modelos-e-instrucoes/distribuicao",
  },
  lei8987: {
    curto: "Lei 8.987/1995",
    titulo: "Lei nº 8.987, de 13 de fevereiro de 1995 (Lei das Concessões), texto compilado",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l8987cons.htm",
  },
  arquivo: {
    curto: `Arquivo da ${distribuidora}`,
    titulo: `BDGD da ${distribuidora}, data de referência ${dataBR(arquivo.partes_do_nome.data_referencia)}, portal de dados abertos da ANEEL`,
    url: "https://dadosabertos-aneel.opendata.arcgis.com/search?tags=distribuicao",
  },
  pipeline: {
    curto: "pipeline deste projeto",
    titulo: "pipeline/catalogar_gdb.py, o script deste projeto que abre o .gdb e gera o catálogo de camadas",
    url: "https://github.com/joaoviktorino/bdgd-raio-x/blob/main/pipeline/catalogar_gdb.py",
  },
  raioX: {
    curto: "cálculo deste projeto",
    titulo:
      "pipeline/raio_x.py, o script deste projeto que soma as camadas do .gdb por subestação e alimentador e grava dados/processados/raio_x.json",
    url: "https://github.com/joaoviktorino/bdgd-raio-x/blob/main/pipeline/raio_x.py",
  },
  mapa: {
    curto: "cálculo deste projeto",
    titulo:
      "pipeline/mapa.py, o script deste projeto que junta e simplifica as geometrias do .gdb por alimentador e grava os GeoJSON do mapa",
    url: "https://github.com/joaoviktorino/bdgd-raio-x/blob/main/pipeline/mapa.py",
  },
  fundo: {
    curto: "OpenFreeMap",
    titulo: "Mapa de fundo: OpenFreeMap (estilos Positron e Dark), com dados © OpenStreetMap e OpenMapTiles",
    url: "https://openfreemap.org/",
  },
} satisfies Record<string, Referencia>;

export type ChaveReferencia = keyof typeof REFERENCIAS;
