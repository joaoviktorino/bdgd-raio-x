import { type ReactNode, useMemo, useState } from "react";

import Contador from "../componentes/Contador";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import {
  Colunas,
  corVar,
  DoisJeitos,
  EstrelaAlimentadores,
  LegendaSubestacoes,
  MEDIDAS,
  RankingAlimentadores,
} from "../componentes/RaioXGraficos";
import { distribuidora } from "../dados";
import { inteiro } from "../formatos";
import { type Alimentador, contagemTexto, decimal, nomeCurto, numero, raioX } from "../raioX";
import "./raiox.css";

const t = raioX.totais;
const km = (rede: string) => raioX.comprimentos.find((c) => c.rede === rede)!;
const kmTotal = raioX.comprimentos.reduce((s, c) => s + c.km_comp, 0);
const tensao = raioX.tensoes.length === 1 ? raioX.tensoes[0].descricao : null;

/** "De onde vem": camada, coluna(s) e cálculo de um número. */
function Origem({ children }: { children: ReactNode }) {
  return (
    <p className="rx-origem">
      <span>De onde vem:</span> {children}
    </p>
  );
}

// Potências com pelo menos 20 transformadores viram colunas; as demais somam em "outras".
const MINIMO_COLUNA = 20;
const potencias = (() => {
  const comuns = raioX.potencias_transformadores.filter((p) => p.transformadores >= MINIMO_COLUNA);
  const outras = raioX.potencias_transformadores.filter((p) => p.transformadores < MINIMO_COLUNA);
  const soma = outras.reduce((s, p) => s + p.transformadores, 0);
  return [
    ...comuns.map((p) => ({
      rotulo: decimal(p.kva),
      valor: p.transformadores,
      dica: `${decimal(p.kva)} kVA: ${inteiro(p.transformadores)} transformadores`,
    })),
    {
      rotulo: "outras",
      valor: soma,
      dica: `${outras.length} outras potências, de ${decimal(outras[0].kva)} a ${inteiro(outras.at(-1)!.kva)} kVA: ${inteiro(soma)} transformadores`,
    },
  ];
})();
const potenciaComum = [...raioX.potencias_transformadores].sort((a, b) => b.transformadores - a.transformadores)[0];

const faixas = raioX.faixas_uc_bt_por_transformador.map((f) => {
  const rotulo = f.ate === null ? `${f.de}+` : f.de === f.ate ? `${f.de}` : `${f.de}–${f.ate}`;
  return {
    rotulo,
    valor: f.transformadores,
    dica: `${f.ate === null ? `${f.de} ou mais` : f.de === f.ate ? "nenhum" : `de ${f.de} a ${f.ate}`} consumidores: ${inteiro(f.transformadores)} transformadores`,
  };
});

function perguntas(): Pergunta[] {
  const mt = km("MT");
  const subMaior = [...raioX.subestacoes].sort(
    (a, b) => (numero(b.consumidores_bt.qtd_uc) ?? 0) - (numero(a.consumidores_bt.qtd_uc) ?? 0),
  )[0];
  const opcoesSub = raioX.subestacoes.filter((s) => s.alimentadores > 0).map(nomeCurto);
  const opcoesKva = [...new Set([15, potenciaComum.kva, 112.5, 300])].sort((a, b) => a - b);
  const dif = Math.abs((mt.km_medido - mt.km_comp) / mt.km_comp) * 100;
  const opcoesDif = ["Menos de 1%", "Cerca de 10%", "Cerca de 30%", "O desenho mede o dobro"];
  const certaDif = dif < 1 ? 0 : dif < 20 ? 1 : dif < 60 ? 2 : 3;

  return [
    {
      id: "estimar-km-mt",
      tipo: "estimativa",
      enunciado: `Chute: quantos km de rede de média tensão a ${distribuidora} tem?`,
      valor: Math.round(mt.km_comp),
      min: 10,
      max: 100000,
      unidade: "km",
      explicacao: (
        <p>
          São {decimal(mt.km_comp)} km, somando a coluna <code>COMP</code> dos {inteiro(mt.trechos)} trechos da{" "}
          <code>SSDMT</code> <Fonte de="manual" onde="Anexo I, SSDMT, p. 82" />.
        </p>
      ),
    },
    {
      id: "estimar-uc-trafo",
      tipo: "estimativa",
      enunciado: "Chute: quantos consumidores de baixa tensão um transformador típico atende (a mediana)?",
      valor: t.mediana_uc_bt_por_transformador,
      min: 1,
      max: 1000,
      unidade: "consumidores",
      explicacao: (
        <p>
          A mediana é {decimal(t.mediana_uc_bt_por_transformador)}: metade dos {inteiro(t.transformadores)}{" "}
          transformadores atende menos que isso. Contagem das <code>UCBT_tab</code> por <code>UNI_TR_MT</code>{" "}
          <Fonte de="raioX" />.
        </p>
      ),
    },
    {
      id: "potencia-comum",
      tipo: "escolha",
      enunciado: "Qual é a potência de transformador mais comum na rede?",
      opcoes: opcoesKva.map((k) => `${decimal(k)} kVA`),
      certa: opcoesKva.indexOf(potenciaComum.kva),
      explicacao: (
        <p>
          {decimal(potenciaComum.kva)} kVA, em {inteiro(potenciaComum.transformadores)} transformadores. A coluna{" "}
          <code>POT_NOM</code> da <code>UNTRMT</code> já vem em kVA <Fonte de="manual" onde="Anexo I, UNTRMT, p. 104" />.
        </p>
      ),
    },
    {
      id: "sub-mais-consumidores",
      tipo: "escolha",
      enunciado: "Qual subestação alimenta mais consumidores de baixa tensão?",
      opcoes: opcoesSub,
      certa: opcoesSub.indexOf(nomeCurto(subMaior)),
      explicacao: (
        <p>
          A {nomeCurto(subMaior)}, com {contagemTexto(subMaior.consumidores_bt.qtd_uc)} unidades. Cada{" "}
          <code>UCBT_tab</code> guarda o alimentador (<code>CTMT</code>), e cada alimentador guarda a subestação (
          <code>SUB</code>) <Fonte de="manual" onde="Anexo I, UCBT, p. 43, e CTMT, p. 113" />.
        </p>
      ),
    },
    {
      id: "dois-jeitos",
      tipo: "escolha",
      enunciado: "Somar a coluna COMP ou medir o desenho da rede: quanto os dois resultados diferem na média tensão?",
      opcoes: opcoesDif,
      certa: certaDif,
      explicacao: (
        <p>
          {decimal(dif, 2)}%: {decimal(mt.km_comp)} km pela coluna <code>COMP</code> e {decimal(mt.km_medido)} km
          medindo as linhas no elipsoide do SIRGAS 2000 <Fonte de="modulo10" onde="item 45" />.
        </p>
      ),
    },
  ];
}

export default function RaioX() {
  const PERGUNTAS = useMemo(perguntas, []);
  const [medida, setMedida] = useState(MEDIDAS[0]);
  const maiorMt = [...raioX.alimentadores].sort((a, b) => b.km_mt - a.km_mt)[0];
  const [escolhido, setEscolhido] = useState<Alimentador>(maiorMt);
  const subDoEscolhido = raioX.subestacoes.find((s) => s.subestacao === escolhido.subestacao)!;

  const numeros = [
    { valor: t.subestacoes, rotulo: "subestações", origem: "registros da SUB" },
    { valor: t.alimentadores, rotulo: "alimentadores", origem: "registros da CTMT" },
    { valor: Math.round(kmTotal), rotulo: "km de rede", origem: "COMP de SSDAT + SSDMT + SSDBT" },
    { valor: t.transformadores, rotulo: "transformadores", origem: "registros da UNTRMT" },
    { valor: t.consumidores_bt.qtd_uc, rotulo: "consumidores em BT", origem: "registros da UCBT_tab" },
  ];

  return (
    <article className="pagina-visual rx">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Raio-x da rede</p>
        <h1>A rede da {distribuidora}, somada camada por camada</h1>
        <p className="lide">
          Subestações, alimentadores, quilômetros de fio, transformadores e consumidores. Cada número é uma soma feita
          no arquivo, e cada um diz de onde veio.
        </p>
      </header>

      <ul className="rx-numeros">
        {numeros.map((n) => (
          <li key={n.rotulo}>
            <span className="rx-numero">
              <Contador valor={n.valor} />
            </span>
            <span className="rx-numero-rotulo">{n.rotulo}</span>
            <span className="rx-numero-origem">{n.origem}</span>
          </li>
        ))}
      </ul>

      <section className="bloco-visual">
        <h2>Da subestação ao alimentador</h2>
        <p className="lide">
          Cada raio é um alimentador saindo da sua subestação; quanto mais longo, mais km de rede de média tensão.
          {tensao && ` Os ${t.alimentadores} operam em ${tensao}.`} Toque num raio para ver a ficha.
        </p>
        <EstrelaAlimentadores escolhido={escolhido.alimentador} aoEscolher={setEscolhido} />
        <LegendaSubestacoes />
        <div
          key={escolhido.alimentador}
          className="rx-ficha"
          aria-live="polite"
          style={{ "--cor": corVar(escolhido.subestacao) } as React.CSSProperties}
        >
          <div className="rx-ficha-topo">
            <span className="rx-ficha-selo">{nomeCurto(subDoEscolhido)}</span>
            <p className="rx-ficha-titulo">{escolhido.nome}</p>
            <p className="rx-ficha-codigo">
              alimentador <code>{escolhido.alimentador}</code> · {escolhido.tensao}
            </p>
          </div>
          <dl>
            <div>
              <dt>Rede MT</dt>
              <dd>{decimal(escolhido.km_mt)} km</dd>
            </div>
            <div>
              <dt>Rede BT</dt>
              <dd>{decimal(escolhido.km_bt)} km</dd>
            </div>
            <div>
              <dt>Transformadores</dt>
              <dd>{inteiro(escolhido.transformadores)}</dd>
            </div>
            <div>
              <dt>Potência instalada</dt>
              <dd>{inteiro(escolhido.potencia_kva)} kVA</dd>
            </div>
            <div>
              <dt>Consumidores BT</dt>
              <dd>{contagemTexto(escolhido.consumidores_bt.qtd_uc)}</dd>
            </div>
            <div>
              <dt>Consumidores MT</dt>
              <dd>{contagemTexto(escolhido.consumidores_mt.qtd_uc)}</dd>
            </div>
          </dl>
        </div>
        <Origem>
          <code>CTMT.SUB</code> liga o alimentador à subestação; km = soma de <code>COMP</code> (metros) dos trechos da{" "}
          <code>SSDMT</code> e da <code>SSDBT</code> com o mesmo <code>CTMT</code>; transformadores e kVA = contagem e soma
          de <code>POT_NOM</code> da <code>UNTRMT</code> por <code>CTMT</code>; consumidores = registros da{" "}
          <code>UCBT_tab</code> e da <code>UCMT_tab</code> por <code>CTMT</code>.{" "}
          {tensao && (
            <>
              Tensão: código <code>TEN_NOM</code> traduzido pelo domínio TTEN{" "}
              <Fonte de="manual" onde={`Anexo II, p. ${raioX.paginas_manual.TTEN}`} />.{" "}
            </>
          )}
          <Fonte de="raioX" />
        </Origem>
      </section>

      <section className="bloco-visual">
        <h2>Alimentador por alimentador</h2>
        <p className="lide">Escolha a medida: o ranking se reordena e a cor continua sendo a da subestação.</p>
        <div className="rx-medidas" role="group" aria-label="Medida do ranking">
          {MEDIDAS.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === medida.id ? "ativo" : undefined}
              aria-pressed={m.id === medida.id}
              onClick={() => setMedida(m)}
            >
              {m.rotulo}
            </button>
          ))}
        </div>
        <LegendaSubestacoes />
        <RankingAlimentadores medida={medida} escolhido={escolhido.alimentador} aoEscolher={setEscolhido} />
        <p className="rx-nota">
          <strong>"menos de 3"</strong>: o grupo tem 1 ou 2 consumidores e o número não é mostrado, para não expor
          ninguém. <strong>"oculto"</strong>: o número é maior, mas fica escondido porque, subtraído do total da
          subestação, revelaria um grupo pequeno.
        </p>
        <details className="rx-tabela">
          <summary>Ver como tabela</summary>
          <div className="rx-tabela-rolagem">
            <table>
              <thead>
                <tr>
                  <th>Alimentador</th>
                  <th>Subestação</th>
                  <th>km MT</th>
                  <th>km BT</th>
                  <th>Transf.</th>
                  <th>kVA</th>
                  <th>UCs BT</th>
                  <th>UCs MT</th>
                </tr>
              </thead>
              <tbody>
                {raioX.alimentadores.map((a) => (
                  <tr key={a.alimentador}>
                    <td>
                      <code>{a.alimentador}</code>
                    </td>
                    <td>{a.subestacao}</td>
                    <td>{decimal(a.km_mt)}</td>
                    <td>{decimal(a.km_bt)}</td>
                    <td>{inteiro(a.transformadores)}</td>
                    <td>{inteiro(a.potencia_kva)}</td>
                    <td>{contagemTexto(a.consumidores_bt.qtd_uc)}</td>
                    <td>{contagemTexto(a.consumidores_mt.qtd_uc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>

      <section className="bloco-visual">
        <h2>Dois jeitos de medir a rede</h2>
        <p className="lide">
          Cada trecho de rede traz o próprio comprimento, em metros, na coluna <code>COMP</code>{" "}
          <Fonte de="manual" onde="Anexo I, SSDMT, p. 82" />. E traz o desenho, em coordenadas geográficas (graus){" "}
          <Fonte de="modulo10" onde="item 45" />. Medindo o desenho sobre o elipsoide, os dois jeitos quase coincidem.
        </p>
        <DoisJeitos />
        <Origem>
          soma de <code>COMP</code> por camada, e o comprimento geodésico de cada linha (elipsoide GRS80, o do SIRGAS
          2000), somado. A <code>SSDAT</code> não tem coluna <code>CTMT</code>: ela guarda o circuito de alta
          tensão (<code>CTAT</code>), por isso fica fora das somas por alimentador. <Fonte de="raioX" />
        </Origem>
      </section>

      <section className="bloco-visual">
        <h2>Transformadores</h2>
        <div className="duas-colunas rx-transformadores">
          <div>
            <h3>Quantos de cada potência</h3>
            <Colunas
              dados={potencias}
              rotuloEixo="potência nominal (kVA)"
              descricao="Número de transformadores por potência nominal"
            />
            <Origem>
              contagem da <code>UNTRMT</code> por <code>POT_NOM</code>, que já vem em kVA{" "}
              <Fonte de="manual" onde="Anexo I, UNTRMT, p. 104" />. Total: {inteiro(t.potencia_kva)} kVA.
            </Origem>
          </div>
          <div>
            <h3>Quantos consumidores cada um atende</h3>
            <Colunas
              dados={faixas}
              rotuloEixo="consumidores de BT por transformador"
              descricao="Número de transformadores por faixa de consumidores atendidos"
            />
            <Origem>
              registros da <code>UCBT_tab</code> contados por <code>UNI_TR_MT</code> e agrupados em faixas; o gráfico conta
              transformadores, nunca consumidores um a um <Fonte de="manual" onde="Anexo I, UCBT, p. 43" />.
            </Origem>
          </div>
        </div>
      </section>

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Chute primeiro, depois veja o número real.</p>
        <Quiz titulo="Teste: raio-x da rede" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["manual", "modulo10", "arquivo", "raioX"]} />
    </article>
  );
}
