import CenaRede from "../componentes/CenaRede";
import ConcessaoPermissao from "../componentes/ConcessaoPermissao";
import DiagramaSigr from "../componentes/DiagramaSigr";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import LinhaPrazos from "../componentes/LinhaPrazos";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { acharCamada, arquivo } from "../dados";
import { inteiro } from "../formatos";
import { REFERENCIAS } from "../referencias";
import "./oque.css";

const registros = (sigla: string) => acharCamada(sigla)?.registros ?? 0;

const PERGUNTAS: Pergunta[] = [
  {
    id: "classificar-entidades",
    tipo: "classificar",
    enunciado: "No modelo da BDGD, quais destas camadas são geográficas?",
    grupos: ["Geográfica", "Não geográfica"],
    itens: [
      { rotulo: "SSDMT", grupo: 0 },
      { rotulo: "CTMT", grupo: 1 },
      { rotulo: "UNTRMT", grupo: 0 },
      { rotulo: "EQTRMT", grupo: 1 },
      { rotulo: "SUB", grupo: 0 },
      { rotulo: "UCBT", grupo: 0 },
      { rotulo: "RAMLIG", grupo: 1 },
    ],
    explicacao: (
      <p>
        Duas pegadinhas: a <code>UCBT</code> é geográfica no modelo (um ponto), mesmo vindo sem localização no
        arquivo publicado; e o <code>RAMLIG</code>, o ramal de ligação, é um fio de verdade, mas é modelado sem
        desenho próprio <Fonte de="modulo10" onde="Tabelas 1 e 7" /> <Fonte de="manual" onde="Anexo I, p. 42 e 107" />.
      </p>
    ),
  },
  {
    id: "estimar-trechos-mt",
    tipo: "estimativa",
    enunciado: "Chute: quantos trechos de rede de média tensão a Nova Palma tem?",
    valor: registros("SSDMT"),
    min: 10,
    max: 1_000_000,
    unidade: "trechos",
    explicacao: (
      <p>
        São {inteiro(registros("SSDMT"))} trechos <Fonte de="arquivo" onde="camada SSDMT" />. Parece muito para uma
        distribuidora pequena, mas cada trecho vai só de uma estrutura de suporte à seguinte, o vão{" "}
        <Fonte de="modulo10" onde="Tabela 3" />.
      </p>
    ),
  },
  {
    id: "prazo-envio",
    tipo: "escolha",
    enunciado: "Uma BDGD com data de referência 31/12/2025 deve chegar à ANEEL até quando?",
    opcoes: ["31 de dezembro de 2025", "1º de março de 2026", "30 de junho de 2026", "31 de dezembro de 2026"],
    certa: 1,
    explicacao: (
      <p>
        O envio ordinário vai até 1º de março, com dados de 31 de dezembro do ano anterior{" "}
        <Fonte de="modulo10" onde="item 41.2" />.
      </p>
    ),
  },
  {
    id: "estimar-ucbt",
    tipo: "estimativa",
    enunciado: "Chute: quantas unidades consumidoras de baixa tensão a Nova Palma atende?",
    valor: registros("UCBT"),
    min: 100,
    max: 10_000_000,
    unidade: "unidades",
    explicacao: (
      <p>
        São {inteiro(registros("UCBT"))} registros na <code>UCBT_tab</code>{" "}
        <Fonte de="arquivo" onde="camada UCBT_tab" />. É o total: unidade por unidade, este site nunca mostra.
      </p>
    ),
  },
  {
    id: "titulo-precario",
    tipo: "escolha",
    enunciado: "Qual forma de delegação de serviço público é feita “a título precário”?",
    opcoes: ["Concessão", "Permissão", "As duas"],
    certa: 1,
    explicacao: (
      <p>
        A permissão <Fonte de="lei8987" onde="art. 2º, IV" />. A concessão é por prazo determinado{" "}
        <Fonte de="lei8987" onde="art. 2º, II" />.
      </p>
    ),
  },
  {
    id: "coordenadas",
    tipo: "escolha",
    enunciado: "Em que sistema de coordenadas vêm os dados cartográficos da BDGD?",
    opcoes: [
      "SIRGAS 2000, em UTM (metros)",
      "SIRGAS 2000, em latitude e longitude (graus)",
      "WGS 84, em latitude e longitude (graus)",
    ],
    certa: 1,
    explicacao: (
      <p>
        Latitude e longitude em graus decimais, no datum SIRGAS 2000 <Fonte de="modulo10" onde="item 45" />. No
        arquivo, isso aparece como <code>{acharCamada("SSDMT")?.crs}</code>{" "}
        <Fonte de="arquivo" onde="camada SSDMT" />.
      </p>
    ),
  },
];

export default function OQueEBdgd() {
  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">O que é a BDGD</p>
        <h1>Um retrato da rede elétrica, entregue todo ano</h1>
        <p className="lide">
          A BDGD é o conjunto de informações que cada distribuidora envia à ANEEL: a rede, os equipamentos, os
          consumidores e a geração, num modelo geográfico <Fonte de="modulo10" onde="itens 10, 11 e 16" />. Toque nos
          elementos do desenho.
        </p>
      </header>

      <section className="bloco-visual">
        <h2>Cada pedaço da rede vira uma camada</h2>
        <p className="lide">
          As camadas geográficas têm desenho (ponto, linha ou polígono); as não geográficas são fichas ligadas a
          elas <Fonte de="modulo10" onde="itens 18, 22 e 32" />. São 23 geográficas e 20 não geográficas{" "}
          <Fonte de="manual" onde="Seção 2, item 2.4, p. 8" />.
        </p>
        <CenaRede />
      </section>

      <section className="bloco-visual">
        <h2>Um retrato por ano</h2>
        <p className="lide">As datas reais do arquivo usado neste site.</p>
        <LinhaPrazos />
      </section>

      <section className="bloco-visual duas-colunas">
        <div>
          <h2>Onde a BDGD mora</h2>
          <p className="lide">
            No SIG-R, o sistema de informação geográfica da ANEEL. As regras estão no Módulo 10 do PRODIST{" "}
            <Fonte de="modulo10" />; os detalhes de cada campo, no Manual de Instruções da BDGD{" "}
            <Fonte de="modulo10" onde="itens 15, 20.1 e 21" />.
          </p>
          <DiagramaSigr />
        </div>
        <div>
          <h2>Quem entrega</h2>
          <p className="lide">
            Concessionárias e permissionárias. O Manual lista todas, inclusive as permissionárias com contrato de
            2010 a 2020 <Fonte de="manual" onde="Anexo III, item 3.1, p. 213" />.
          </p>
          <ConcessaoPermissao />
          <p className="nota">
            Códigos de área de atuação do Anexo III <Fonte de="manual" onde="p. 214" />. A letra inicial acompanha a
            forma de outorga, mas isso é uma leitura nossa do código: o Manual não explica o formato.
          </p>
        </div>
      </section>

      <section className="bloco-visual">
        <h2>Onde baixar</h2>
        <div className="atalhos">
          <a className="atalho" href={REFERENCIAS.arquivo.url}>
            <span className="atalho-icone" aria-hidden="true">
              ⬇
            </span>
            <strong>Os arquivos da BDGD</strong>
            <span>
              Portal de dados abertos da ANEEL: um <code>.gdb.zip</code> por distribuidora e data de referência{" "}
              <Fonte de="arquivo" />
            </span>
          </a>
          <a className="atalho" href={REFERENCIAS.manual.url}>
            <span className="atalho-icone" aria-hidden="true">
              📘
            </span>
            <strong>O Manual de Instruções</strong>
            <span>
              Página de manuais de distribuição da ANEEL <Fonte de="manual" onde="Seção 1, item 2.1, p. 7" />
            </span>
          </a>
        </div>
        <p className="nota">
          O arquivo usado aqui é o <code>{arquivo.arquivo}</code>. As informações do SIG-R são públicas, respeitado o
          direito de privacidade dos usuários <Fonte de="modulo10" onde="item 47" />.
        </p>
      </section>

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Seis perguntas. Nas de chute, arrisque antes de saber: o número real aparece depois.</p>
        <Quiz titulo="Teste: o que é a BDGD" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["modulo10", "manual", "lei8987", "arquivo"]} />
    </article>
  );
}
