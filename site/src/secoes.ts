// Lista única das seções do site (conforme o CLAUDE.md). Menu, página inicial e
// páginas "em construção" saem daqui.

export type Secao = {
  caminho: string;
  titulo: string;
  resumo: string;
  issue: number;
  icone: "documento" | "quebra-cabeca" | "camadas" | "rede" | "mapa" | "sol";
  pronta?: boolean;
  teste?: boolean;
};

export const SECOES: Secao[] = [
  {
    caminho: "o-que-e-bdgd",
    titulo: "O que é a BDGD",
    resumo: "A rede desenhada camada por camada, os prazos e quem entrega a base à ANEEL.",
    issue: 7,
    icone: "documento",
    pronta: true,
    teste: true,
  },
  {
    caminho: "decifrando-o-arquivo",
    titulo: "Decifrando o arquivo",
    resumo: "O nome do arquivo, peça por peça, e o que sai de dentro do zip.",
    issue: 8,
    icone: "quebra-cabeca",
    pronta: true,
  },
  {
    caminho: "camadas",
    titulo: "Camadas",
    resumo: "Todas as camadas do arquivo: o que cada uma guarda, suas colunas e ligações.",
    issue: 9,
    icone: "camadas",
  },
  {
    caminho: "raio-x",
    titulo: "Raio-x da rede",
    resumo: "Subestações, alimentadores, km de rede, transformadores e consumidores por alimentador.",
    issue: 10,
    icone: "rede",
  },
  {
    caminho: "mapa",
    titulo: "Mapa",
    resumo: "A rede da distribuidora num mapa interativo, sem localizar consumidores.",
    issue: 11,
    icone: "mapa",
  },
  {
    caminho: "gd",
    titulo: "GD × capacidade",
    resumo: "Geração distribuída conectada comparada com a capacidade dos transformadores.",
    issue: 12,
    icone: "sol",
  },
];

export const URL_REPOSITORIO = "https://github.com/joaoviktorino/bdgd-raio-x";
