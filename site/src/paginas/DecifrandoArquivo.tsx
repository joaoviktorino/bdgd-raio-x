import AbrindoPacote from "../componentes/AbrindoPacote";
import Certidao, { BlocoDeCodigo } from "../componentes/Certidao";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import NomeDecifrado from "../componentes/NomeDecifrado";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { arquivo, catalogo } from "../dados";
import { inteiro, megabytes } from "../formatos";
import "./decifrando.css";

const p = arquivo.partes_do_nome;

// Nomes para "achar o erro": três seguem o padrão nome_código_data_modelo_geração;
// um troca a data de lugar com o código.
const ano = Number(p.data_referencia.slice(0, 4));
const NOMES = [
  `${p.nome}_${p.codigo_aneel}_${ano - 1}-12-31_${p.modelo}_${ano}0910-1015.gdb.zip`,
  `${p.nome}_${p.data_referencia}_${p.codigo_aneel}_${p.modelo}_${p.geracao}.gdb.zip`,
  `${p.nome}_${p.codigo_aneel}_${ano - 2}-12-31_${p.modelo}_${ano - 1}0214-1616.gdb.zip`,
  `${p.nome}_${p.codigo_aneel}_${ano - 4}-12-31_V10_${ano - 3}0822-1623.gdb.zip`,
];

const PERGUNTAS: Pergunta[] = [
  {
    id: "montar-nome",
    tipo: "ordenar",
    enunciado: "Monte o nome do arquivo: ponha as peças na ordem em que aparecem.",
    itens: [
      `${p.nome} (nome da distribuidora)`,
      `${p.codigo_aneel} (código na ANEEL)`,
      `${p.data_referencia} (data de referência)`,
      `${p.modelo} (modelo de dados)`,
      `${p.geracao} (data e hora de geração)`,
    ],
    pontas: ["Começo do nome", "Fim, antes de .gdb.zip"],
    explicacao: (
      <p>
        <code>{arquivo.arquivo}</code>: nome, código, data de referência, modelo e geração, separados por{" "}
        <code>_</code> <Fonte de="arquivo" />. O sufixo do modelo segue o glossário do Manual{" "}
        <Fonte de="manual" onde="p. 5" />.
      </p>
    ),
  },
  {
    id: "achar-erro",
    tipo: "escolha",
    enunciado: "Três destes nomes seguem o padrão. Qual foi inventado errado?",
    opcoes: NOMES,
    certa: 1,
    explicacao: (
      <p>
        No segundo, a data de referência veio antes do código da distribuidora. O padrão é sempre nome, código, data,
        modelo e geração <Fonte de="arquivo" />.
      </p>
    ),
  },
  {
    id: "estimar-mb",
    tipo: "estimativa",
    enunciado: "Chute: quantos megabytes tem o zip baixado?",
    valor: Math.round(arquivo.tamanho_bytes / 1_000_000),
    min: 1,
    max: 10000,
    unidade: "MB",
    explicacao: (
      <p>
        {megabytes(arquivo.tamanho_bytes)} compactado. Aberto, vira {megabytes(arquivo.conteudo_zip.tamanho_descompactado_bytes)}{" "}
        <Fonte de="pipeline" />.
      </p>
    ),
  },
  {
    id: "estimar-arquivos",
    tipo: "estimativa",
    enunciado: `Dentro do zip há uma pasta .gdb com as ${catalogo.total_camadas} camadas. Quantos arquivos ela tem?`,
    valor: arquivo.conteudo_zip.arquivos,
    min: 1,
    max: 10000,
    unidade: "arquivos",
    explicacao: (
      <p>
        {inteiro(arquivo.conteudo_zip.arquivos)} arquivos: cada camada se espalha em vários (tabela, índice e outros){" "}
        <Fonte de="pipeline" />.
      </p>
    ),
  },
];

export default function DecifrandoArquivo() {
  const codigoPython = [
    "import pyogrio",
    "",
    `gdb = "${arquivo.conteudo_zip.pasta}"`,
    "for nome, geometria in pyogrio.list_layers(gdb):",
    "    print(nome, geometria)",
  ].join("\n");

  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Decifrando o arquivo</p>
        <h1>Um nome de arquivo conta quase tudo</h1>
        <p className="lide">Toque em cada parte do nome para ver o que ela diz.</p>
      </header>

      <NomeDecifrado />

      <section className="bloco-visual">
        <h2>Abrindo o pacote</h2>
        <p className="lide">Do zip baixado às camadas que um programa de mapas enxerga.</p>
        <AbrindoPacote />
      </section>

      <section className="bloco-visual duas-colunas">
        <div>
          <h2>A certidão do arquivo</h2>
          <p className="lide">De onde veio, quanto pesa e como provar que é o mesmo.</p>
          <Certidao />
        </div>

        <div>
          <h2>Abra você mesmo</h2>
          <p className="lide">
            Depois de extrair o zip, estas linhas de Python listam as {catalogo.total_camadas} camadas da pasta{" "}
            <code>.gdb</code>, do
            mesmo jeito que este projeto faz <Fonte de="pipeline" />.
          </p>
          <BlocoDeCodigo linguagem="Python" codigo={codigoPython} />
          <p className="nota">
            Precisa da biblioteca <code>pyogrio</code>, que já vem com o GDAL, a biblioteca que lê o formato File
            Geodatabase. No projeto, ela é instalada junto com o <code>geopandas</code>.
          </p>
        </div>
      </section>

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Monte, ache o erro e chute os tamanhos.</p>
        <Quiz id="decifrando-o-arquivo" titulo="Teste: decifrando o arquivo" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["manual", "modulo10", "arquivo", "pipeline"]} />
    </article>
  );
}
