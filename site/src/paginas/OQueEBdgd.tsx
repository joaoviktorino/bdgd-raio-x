import { Link } from "react-router";

import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import { acharCamada, arquivo, dataBR } from "../dados";
import { REFERENCIAS } from "../referencias";

// Camadas da Nova Palma usadas como exemplo dos dois tipos de entidade.
const EXEMPLOS = [
  { sigla: "SSDMT", oQueE: "Segmentos da rede de média tensão", forma: "linhas" },
  { sigla: "UNTRMT", oQueE: "Transformadores de média para baixa tensão", forma: "pontos" },
  { sigla: "SUB", oQueE: "Subestações", forma: "polígonos" },
  { sigla: "CTMT", oQueE: "Circuitos de média tensão (alimentadores)", forma: "tabela" },
  { sigla: "UCBT", oQueE: "Unidades consumidoras de baixa tensão", forma: "tabela" },
];

export default function OQueEBdgd() {
  const dataReferencia = dataBR(arquivo.partes_do_nome.data_referencia);
  const crs = acharCamada("SSDMT")?.crs;

  return (
    <article className="texto">
      <h1>O que é a BDGD</h1>

      <p className="lide">
        A <strong>BDGD (Base de Dados Geográfica da Distribuidora)</strong> é o conjunto de informações
        que cada distribuidora de energia elétrica envia à ANEEL, seguindo uma estrutura e um conteúdo
        definidos na regulação <Fonte de="modulo10" onde="item 16" />.
      </p>

      <h2>O que ela descreve</h2>
      <p>
        A BDGD reúne <strong>dados técnicos</strong> do sistema de distribuição,{" "}
        <strong>informações comerciais</strong> e <strong>dados físico-contábeis</strong> da base de
        ativos <Fonte de="modulo10" onde="item 11" />. É um modelo geográfico: uma simplificação do
        sistema elétrico real, para um período, que contém <Fonte de="modulo10" onde="itens 10 e 10.1" />:
      </p>
      <ul>
        <li>o traçado dos segmentos de rede de alta, média e baixa tensão entre as estruturas de suporte;</li>
        <li>a localização das estruturas de suporte da rede;</li>
        <li>a localização dos usuários e dos equipamentos;</li>
        <li>a delimitação das subestações e de outras áreas de interesse.</li>
      </ul>

      <h2>A regulação: Módulo 10 do PRODIST</h2>
      <p>
        As regras da BDGD estão no <strong>Módulo 10 do PRODIST</strong> (Procedimentos de Distribuição
        de Energia Elétrica no Sistema Elétrico Nacional), que é o Anexo X da Resolução Normativa ANEEL
        nº 956/2021 <Fonte de="modulo10" />. O Módulo 10 diz <em>o que</em> a base deve conter; a lista
        completa de entidades, campos e códigos fica no Manual de Instruções da BDGD{" "}
        <Fonte de="modulo10" onde="itens 15, 20.1 e 21" />.
      </p>

      <h2>BDGD e SIG-R</h2>
      <p>
        O <strong>SIG-R (Sistema de Informação Geográfica Regulatório)</strong> é o conjunto de sistemas
        e bases de dados reunidos pela ANEEL para obter informações do sistema de distribuição e dos
        usuários <Fonte de="modulo10" onde="item 7" />. A BDGD de cada distribuidora é uma parte do
        SIG-R, que também se apoia em outras bases, como as do IBGE, a classificação de atividades
        econômicas (CNAE) e os manuais de contabilidade e de controle patrimonial do setor elétrico{" "}
        <Fonte de="modulo10" onde="item 8 e Diagrama 1" />.
      </p>

      <h2>Dois tipos de entidade</h2>
      <p>
        A BDGD é organizada em <strong>entidades</strong>: modelos de dados que representam redes,
        estruturas, equipamentos, usuários e outras informações. Elas são de dois tipos{" "}
        <Fonte de="modulo10" onde="itens 18 e 18.1" />:
      </p>
      <ul>
        <li>
          <strong>Entidades geográficas</strong> têm representação no mapa (ponto, linha ou polígono).
          Exemplos: segmento de rede (linha), transformador (ponto), subestação (polígono) e unidade
          consumidora (ponto) <Fonte de="modulo10" onde="item 22 e Tabelas 1 a 4" />.
        </li>
        <li>
          <strong>Entidades não geográficas</strong> são tabelas que se ligam às demais, sem
          representação no mapa. Exemplos: circuito de rede (os alimentadores), medidor e balanço de
          energia <Fonte de="modulo10" onde="item 32 e Tabelas 6 a 8" />.
        </li>
      </ul>
      <p>
        Na versão atual do modelo de dados (V1.1) são <strong>23 entidades geográficas e 20 não
        geográficas</strong> <Fonte de="manual" onde="Seção 2, item 2.4, p. 8" />.
      </p>

      <h3>Na Nova Palma</h3>
      <div className="tabela-rolavel">
        <table>
          <thead>
            <tr>
              <th>Camada</th>
              <th>O que é</th>
              <th className="numero">Registros</th>
            </tr>
          </thead>
          <tbody>
            {EXEMPLOS.map(({ sigla, oQueE, forma }) => {
              const camada = acharCamada(sigla);
              return (
                <tr key={sigla}>
                  <td>
                    <Link to={`/camadas/${sigla}`}>
                      <code>{camada?.nome ?? sigla}</code>
                    </Link>
                    <span className="detalhe">{forma}</span>
                  </td>
                  <td>{oQueE}</td>
                  <td className="numero">{camada?.registros.toLocaleString("pt-BR")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="nota">
        Contagens lidas do arquivo <Fonte de="arquivo" onde="catálogo de camadas" />. Repare na{" "}
        <code>UCBT_tab</code>: no Manual, a unidade consumidora é um ponto com endereço{" "}
        <Fonte de="manual" onde="Anexo I, p. 42–43" />, mas no arquivo publicado ela vem como tabela, sem
        localização e sem logradouro. As informações do SIG-R são públicas, respeitado o direito de
        privacidade dos usuários <Fonte de="modulo10" onde="item 47" />.
      </p>

      <h2>Prazos</h2>
      <ul>
        <li>
          O envio <strong>ordinário</strong> é anual <Fonte de="modulo10" onde="item 41.1" />: até{" "}
          <strong>1º de março</strong> de cada ano, com dados referenciados em{" "}
          <strong>31 de dezembro do ano anterior</strong> <Fonte de="modulo10" onde="item 41.2" />. O
          arquivo da Nova Palma usado aqui tem data de referência {dataReferencia}{" "}
          <Fonte de="arquivo" />.
        </li>
        <li>
          O envio <strong>extraordinário</strong> acontece sob demanda da ANEEL, que define a data de
          referência, pede o envio com pelo menos 30 dias de antecedência e dá até 60 dias, a contar da
          data de referência, para a entrega <Fonte de="modulo10" onde="itens 42 a 42.4" />.
        </li>
        <li>
          Só é publicada a BDGD que foi validada e aceita pela ANEEL{" "}
          <Fonte de="modulo10" onde="item 48" />.
        </li>
      </ul>

      <h2>Coordenadas</h2>
      <p>
        Todos os dados cartográficos vêm em latitude e longitude, em graus decimais, no datum{" "}
        <strong>SIRGAS 2000</strong> <Fonte de="modulo10" onde="item 45" />. No arquivo da Nova Palma,
        isso aparece como <code>{crs}</code> <Fonte de="arquivo" onde="camada SSDMT" />. Por estar em
        graus, o comprimento de uma linha não pode ser lido direto em metros: o raio-x da rede vai usar
        o comprimento declarado em cada segmento.
      </p>

      <h2>Onde baixar</h2>
      <ul>
        <li>
          <strong>Os arquivos da BDGD</strong> estão no{" "}
          <a href={REFERENCIAS.arquivo.url}>portal de dados abertos da ANEEL</a>, um arquivo{" "}
          <code>.gdb.zip</code> por distribuidora e data de referência. O usado aqui é o{" "}
          <code>{arquivo.arquivo}</code>, baixado em {dataBR(arquivo.data_download)}{" "}
          <Fonte de="arquivo" />.
        </li>
        <li>
          <strong>O Manual de Instruções da BDGD</strong> e os arquivos acessórios estão na página de
          manuais de distribuição da ANEEL <Fonte de="manual" onde="Seção 1, item 2.1, p. 7" />.
        </li>
      </ul>

      <h2>Concessionária × permissionária</h2>
      <p>A Lei das Concessões define duas formas de delegar a prestação de um serviço público:</p>
      <ul>
        <li>
          <strong>Concessão</strong> é a delegação feita mediante licitação, a pessoa jurídica ou
          consórcio de empresas, por sua conta e risco e <strong>por prazo determinado</strong>{" "}
          <Fonte de="lei8987" onde="art. 2º, II" />.
        </li>
        <li>
          <strong>Permissão</strong> é a delegação feita <strong>a título precário</strong>, mediante
          licitação, a pessoa física ou jurídica <Fonte de="lei8987" onde="art. 2º, IV" />, formalizada
          por contrato de adesão que pode ser revogado unilateralmente pelo poder concedente{" "}
          <Fonte de="lei8987" onde="art. 40" />.
        </li>
      </ul>
      <p>
        O Manual da BDGD lista todas as distribuidoras, inclusive as permissionárias que assinaram contrato
        entre 2010 e 2020 <Fonte de="manual" onde="Anexo III, item 3.1, p. 213" />. Cada uma tem um
        código de área de atuação: o da Nova Palma (UHENPAL) é <code>C.062.RS.2001</code>; o de
        cooperativas como a CERAL é <code>P.025.SC.2008</code>{" "}
        <Fonte de="manual" onde="Anexo III, p. 214" />.
      </p>
      <p className="nota">
        A letra inicial acompanha a forma de outorga (C de concessão, P de permissão), mas isso é uma
        leitura do código: o Manual não explica o formato dele.
      </p>

      <ListaDeFontes fontes={["modulo10", "manual", "lei8987", "arquivo"]} />
    </article>
  );
}
