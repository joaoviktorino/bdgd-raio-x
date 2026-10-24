// Lista única das seções do site (conforme o CLAUDE.md). Menu, página inicial e
// páginas "em construção" saem daqui.

export type Secao = {
  caminho: string;
  titulo: string;
  resumo: string;
  issue: number;
  icone: "documento" | "quebra-cabeca" | "camadas" | "ligacoes" | "rede" | "mapa" | "sol";
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
    pronta: true,
    teste: true,
  },
  {
    caminho: "ligacoes",
    titulo: "Mapa de ligações",
    resumo: "Todas as entidades sobre um desenho da rede, da transmissão às casas, e quem se liga a quem.",
    issue: 29,
    icone: "ligacoes",
    pronta: true,
    teste: true,
  },
  {
    caminho: "raio-x",
    titulo: "Raio-x da rede",
    resumo: "Subestações, alimentadores, km de rede, transformadores e consumidores por alimentador.",
    issue: 10,
    icone: "rede",
    pronta: true,
    teste: true,
  },
  {
    caminho: "mapa",
    titulo: "Mapa da rede",
    resumo: "Área de atuação, subestações, redes e transformadores num mapa interativo, sem localizar consumidores.",
    issue: 11,
    icone: "mapa",
    pronta: true,
    teste: true,
  },
  {
    caminho: "gd",
    titulo: "GD × capacidade",
    resumo: "Geração distribuída conectada comparada com a capacidade dos transformadores.",
    issue: 12,
    icone: "sol",
    pronta: true,
    teste: true,
  },
];

export const URL_REPOSITORIO = "https://github.com/joaoviktorino/bdgd-raio-x";
