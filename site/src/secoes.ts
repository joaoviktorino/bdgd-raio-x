// Lista única das seções do site (conforme o CLAUDE.md). Menu, página inicial e
// páginas "em construção" saem daqui.

export type Secao = {
  caminho: string;
  titulo: string;
  resumo: string;
  issue: number;
};

export const SECOES: Secao[] = [
  {
    caminho: "o-que-e-bdgd",
    titulo: "O que é a BDGD",
    resumo: "A base de dados que toda distribuidora envia à ANEEL: regulação, prazos e onde baixar.",
    issue: 7,
  },
  {
    caminho: "decifrando-o-arquivo",
    titulo: "Decifrando o arquivo",
    resumo: "O nome do arquivo baixado, parte por parte, e a procedência de cada dado.",
    issue: 8,
  },
  {
    caminho: "camadas",
    titulo: "Camadas",
    resumo: "As 43 camadas do arquivo: o que cada uma guarda, suas colunas e ligações.",
    issue: 9,
  },
  {
    caminho: "raio-x",
    titulo: "Raio-x da rede",
    resumo: "Subestações, alimentadores, km de rede, transformadores e consumidores por alimentador.",
    issue: 10,
  },
  {
    caminho: "mapa",
    titulo: "Mapa",
    resumo: "A rede da distribuidora num mapa interativo, sem localizar consumidores.",
    issue: 11,
  },
  {
    caminho: "gd",
    titulo: "GD × capacidade",
    resumo: "Geração distribuída conectada comparada com a capacidade dos transformadores.",
    issue: 12,
  },
];

export const URL_REPOSITORIO = "https://github.com/joaoviktorino/bdgd-raio-x";
