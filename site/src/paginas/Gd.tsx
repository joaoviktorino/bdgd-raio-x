import { useMemo, useState } from "react";

import Contador from "../componentes/Contador";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { Colunas, corVar, LegendaSubestacoes } from "../componentes/RaioXGraficos";
import { useVisivel } from "../componentes/useVisivel";
import { inteiro } from "../formatos";
import { gd } from "../gd";
import { contagemTexto, decimal } from "../raioX";
import "./raiox.css";
import "./gd.css";

const t = gd.totais;
const bt = t.geradores_bt;
const mw = (kw: number) => decimal(kw / 1000, 1);

// Escala dos medidores: 0 a 250%, com a marca de 100% (GD igual à capacidade).
const ESCALA_MAX = 250;

/** Medidor em meio círculo: quanto da potência do transformador a GD instalada soma. */
function Medidor({ pct }: { pct: number }) {
  const r = 52;
  const ponto = (p: number) => {
    const a = Math.PI * (1 - Math.min(p, ESCALA_MAX) / ESCALA_MAX);
    return [60 + r * Math.cos(a), 62 - r * Math.sin(a)];
  };
  const [x, y] = ponto(pct);
  const [mx, my] = ponto(100);
  const [mx2, my2] = [60 + (mx - 60) * 1.18, 62 + (my - 62) * 1.18];
  return (
    <svg viewBox="0 -12 120 84" className={pct > 100 ? "gd-medidor acima" : "gd-medidor"} aria-hidden="true">
      <path className="gd-medidor-trilho" d={`M ${60 - r} 62 A ${r} ${r} 0 0 1 ${60 + r} 62`} />
      <path className="gd-medidor-valor" d={`M ${60 - r} 62 A ${r} ${r} 0 0 1 ${x} ${y}`} />
      <line className="gd-medidor-marca" x1={mx} y1={my} x2={mx2} y2={my2} />
      <text className="gd-medidor-100" x={mx2} y={my2 - 3}>
        100%
      </text>
    </svg>
  );
}

// Cabo desenhado: o condutor inteiro é a capacidade somada dos transformadores; a parte
// acesa, com a corrente correndo, é a GD de baixa tensão.
const CABO = { ponta: 70, x0: 100, x1: 960, y: 92, raio: 28 };

/** Um cabo cortado na ponta (fios de cobre à mostra); a GD preenche o condutor. */
function Cabo() {
  const { ref, visivel } = useVisivel<SVGSVGElement>(0.4);
  const { ponta, x0, x1, y, raio } = CABO;
  const largura = x1 - x0;
  const fim = x0 + (largura * bt.ug_razao_pct) / 100;
  const fios = [
    [0, 0], [-9, -6], [9, -6], [-9, 6], [9, 6], [0, -12], [0, 12], [-15, 0], [15, 0],
  ];
  return (
    <div className="gd-cabo-caixa">
      <svg
        ref={ref}
        viewBox="0 0 1000 190"
        className={visivel ? "gd-cabo visivel" : "gd-cabo"}
        role="img"
        aria-label={`Cabo: a GD de baixa tensão ocupa ${decimal(bt.ug_razao_pct)}% da capacidade somada dos transformadores`}
      >
        <defs>
          <clipPath id="gd-cabo-condutor">
            <rect x={x0} y={y - raio + 8} width={largura} height={2 * (raio - 8)} rx={raio - 8} />
          </clipPath>
        </defs>
        {/* capa do cabo */}
        <rect className="gd-cabo-capa" x={ponta} y={y - raio} width={x1 + 8 - ponta} height={2 * raio} rx={raio} />
        {/* condutor: trilho (capacidade) e parte acesa (GD) */}
        <rect className="gd-cabo-trilho" x={x0} y={y - raio + 8} width={largura} height={2 * (raio - 8)} rx={raio - 8} />
        <g clipPath="url(#gd-cabo-condutor)">
          <rect className="gd-cabo-gd" x={x0} y={y - raio + 8} width={fim - x0} height={2 * (raio - 8)} />
          <line className="gd-cabo-corrente" x1={x0} y1={y} x2={fim} y2={y} />
        </g>
        {/* ponta cortada: seção do cabo com os fios de cobre */}
        <circle className="gd-cabo-capa" cx={ponta} cy={y} r={raio} />
        <circle className="gd-cabo-isolante" cx={ponta} cy={y} r={raio - 6} />
        {fios.map(([dx, dy]) => (
          <circle key={`${dx},${dy}`} className="gd-cabo-fio" cx={ponta + dx} cy={y + dy} r={4.6} />
        ))}
        {/* régua de 0 a 100% */}
        {[0, 25, 50, 75, 100].map((p) => {
          const x = x0 + (largura * p) / 100;
          return (
            <g key={p}>
              <line className="gd-cabo-marca" x1={x} y1={y + raio + 6} x2={x} y2={y + raio + 14} />
              <text className="gd-cabo-escala" x={x} y={y + raio + 30}>
                {p}%
              </text>
            </g>
          );
        })}
        <line className="gd-cabo-seta" x1={fim} y1={y - raio - 4} x2={fim} y2={y - raio - 26} />
        <text className="gd-cabo-rotulo gd" x={fim} y={y - raio - 34}>
          GD: {mw(bt.ug_potencia_kw)} MW · {decimal(bt.ug_razao_pct)}%
        </text>
        <text className="gd-cabo-rotulo cap" x={x1} y={y - raio - 34}>
          capacidade: {mw(t.capacidade_kva)} MVA
        </text>
      </svg>
      <p className="gd-cabo-leitura">
        Se o cabo inteiro fosse a potência somada dos {inteiro(t.transformadores)} transformadores, a GD de baixa tensão
        instalada ocuparia <strong>{decimal(bt.ug_razao_pct)}%</strong> dele.
      </p>
    </div>
  );
}

function RankingGd() {
  const [ordem, setOrdem] = useState<"razao" | "potencia">("razao");
  const valor = (g: (typeof gd.alimentadores)[number]) =>
    ordem === "razao" ? g.geradores_bt.ug_razao_pct : g.geradores_bt.ug_potencia_kw;
  const linhas = gd.alimentadores
    .filter((a) => a.geradores_bt.qtd_ug !== 0)
    .sort((a, b) => (valor(b) ?? -1) - (valor(a) ?? -1));
  const max = Math.max(...linhas.map((a) => valor(a) ?? 0));
  return (
    <>
      <div className="rx-medidas" role="group" aria-label="Medida do ranking">
        {(
          [
            ["razao", "GD / capacidade (%)"],
            ["potencia", "Potência de GD (kW)"],
          ] as const
        ).map(([id, rotulo]) => (
          <button key={id} type="button" className={ordem === id ? "ativo" : undefined} aria-pressed={ordem === id} onClick={() => setOrdem(id)}>
            {rotulo}
          </button>
        ))}
      </div>
      <LegendaSubestacoes />
      <ol className="rx-ranking" aria-label="Alimentadores com GD">
        {linhas.map((a) => {
          const v = valor(a);
          const g = a.geradores_bt;
          return (
            <li key={a.alimentador}>
              <span className="rx-ranking-linha" title={`${a.nome}: ${contagemTexto(g.qtd_ug)} geradores`}>
                <span className="rx-ranking-nome">{a.alimentador}</span>
                <span className="rx-ranking-trilho">
                  {v !== null && v > 0 && (
                    <span className="rx-ranking-barra" style={{ width: `${(v / max) * 100}%`, background: corVar(a.subestacao) }} />
                  )}
                </span>
                <span className="rx-ranking-valor">
                  {v === null ? contagemTexto(g.qtd_ug) : ordem === "razao" ? `${decimal(v)}%` : `${inteiro(v)} kW`}
                  {v !== null && <small> · {contagemTexto(g.qtd_ug)} ger.</small>}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </>
  );
}

const faixas = gd.faixas_razao_transformadores.map((f) => ({
  rotulo: f.ate === null ? `${f.de}%+` : `${f.de}–${f.ate}%`,
  valor: f.transformadores,
  dica: `GD de ${f.ate === null ? `${f.de}% ou mais` : `${f.de}% a ${f.ate}%`} da capacidade: ${inteiro(f.transformadores)} transformadores`,
}));
const acimaDe100 = gd.faixas_razao_transformadores.filter((f) => f.de >= 100).reduce((s, f) => s + f.transformadores, 0);

function perguntas(): Pergunta[] {
  return [
    {
      id: "estimar-mw",
      tipo: "estimativa",
      enunciado: `Chute: quantos megawatts de GD estão instalados na baixa tensão da distribuidora?`,
      valor: Math.round(bt.ug_potencia_kw / 100) / 10,
      min: 0.1,
      max: 1000,
      unidade: "MW",
      explicacao: (
        <p>
          {mw(bt.ug_potencia_kw)} MW, somando a coluna <code>POT_INST</code> (em kW) dos {inteiro(bt.qtd_ug)} registros da{" "}
          <code>UGBT_tab</code> <Fonte de="manual" onde="Anexo I, UGBT, p. 61" />.
        </p>
      ),
    },
    {
      id: "estimar-trafos-gd",
      tipo: "estimativa",
      enunciado: `Dos ${inteiro(t.transformadores)} transformadores, quantos têm pelo menos um gerador ligado?`,
      valor: t.transformadores_com_gd,
      min: 1,
      max: t.transformadores,
      unidade: "transformadores",
      explicacao: (
        <p>
          {inteiro(t.transformadores_com_gd)} transformadores ({decimal((100 * t.transformadores_com_gd) / t.transformadores, 0)}%),
          contando os valores distintos de <code>UNI_TR_MT</code> na <code>UGBT_tab</code> <Fonte de="gd" />.
        </p>
      ),
    },
    {
      id: "significado-120",
      tipo: "escolha",
      enunciado: "Um transformador tem razão GD / capacidade de 120%. O que isso diz?",
      opcoes: [
        "A GD instalada nele soma mais que a potência nominal dele",
        "Ele está sobrecarregado agora",
        "A rede dele não aceita mais nenhum gerador",
        "Os consumidores dele geram mais do que consomem",
      ],
      certa: 0,
      explicacao: (
        <p>
          Só isso: a soma de <code>POT_INST</code> passa a potência nominal. Se há sobrecarga ou espaço para mais GD depende
          de quanto se gera e se consome ao mesmo tempo, da tensão e de outros estudos.
        </p>
      ),
    },
    {
      id: "diz-ou-nao",
      tipo: "classificar",
      enunciado: "A razão GD / capacidade diz isto, ou não diz?",
      grupos: ["Diz", "Não diz"],
      itens: [
        { rotulo: "Onde a GD está mais concentrada", grupo: 0 },
        { rotulo: "Quanto a GD gera em cada hora", grupo: 1 },
        { rotulo: "Se cabe mais GD sem obra", grupo: 1 },
        { rotulo: "GD instalada perto da potência do transformador", grupo: 0 },
      ],
      explicacao: (
        <p>
          A razão compara potências instaladas e nominais. Quanto se gera hora a hora e quanto ainda cabe pedem medição e
          estudo de capacidade de hospedagem.
        </p>
      ),
    },
    {
      id: "pot-eqtrmt",
      tipo: "escolha",
      enunciado: "Na camada EQTRMT, como vem a potência nominal (POT_NOM)?",
      opcoes: ["Como código do domínio TPOTAPRT", "Em kVA, número decimal", "Em kW", "Em MVA"],
      certa: 0,
      explicacao: (
        <p>
          Como código, traduzido em kVA pela tabela TPOTAPRT <Fonte de="manual" onde={`Anexo I, EQTRMT, p. 126; Anexo II, p. ${gd.paginas_manual.TPOTAPRT}`} />.
          Já na <code>UNTRMT</code>, a <code>POT_NOM</code> vem direto em kVA.
        </p>
      ),
    },
  ];
}

export default function Gd() {
  const PERGUNTAS = useMemo(perguntas, []);
  const numeros = [
    { valor: bt.qtd_ug, rotulo: "geradores em BT", origem: "registros da UGBT_tab" },
    { valor: t.transformadores_com_gd, rotulo: "transformadores com GD", origem: "UNI_TR_MT distintos na UGBT_tab" },
    { valor: t.geradores_mt.qtd_ug, rotulo: "geradores em MT", origem: `registros da UGMT_tab · ${mw(t.geradores_mt.ug_potencia_kw)} MW` },
  ];

  return (
    <article className="pagina-visual rx gd">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">GD × capacidade</p>
        <h1>Quanto da rede a geração distribuída já ocupa</h1>
        <p className="lide">
          Os geradores de baixa tensão entram na rede pelos transformadores de distribuição. Aqui a potência instalada de GD é somada por
          transformador e por alimentador e comparada com a potência deles.
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
        <h2>A rede inteira, num cabo só</h2>
        <Cabo />
        <p className="rx-origem">
          <span>De onde vem:</span> GD = soma de <code>POT_INST</code> (kW) da <code>UGBT_tab</code>{" "}
          <Fonte de="manual" onde="Anexo I, UGBT, p. 61" />; capacidade = soma da <code>POT_NOM</code> dos{" "}
          {inteiro(t.equipamentos_eqtrmt)} equipamentos da <code>EQTRMT</code>, traduzida em kVA pelo domínio TPOTAPRT{" "}
          <Fonte de="manual" onde={`Anexo II, p. ${gd.paginas_manual.TPOTAPRT}`} />. Conferida com a <code>POT_NOM</code> da{" "}
          <code>UNTRMT</code>: bate em {inteiro(t.transformadores - t.capacidade_diferente_da_untrmt)} dos{" "}
          {inteiro(t.transformadores)} transformadores. <Fonte de="gd" />
        </p>
      </section>

      <section className="bloco-visual">
        <h2>Alimentador por alimentador</h2>
        <p className="lide">
          A GD de cada alimentador comparada com a potência somada dos transformadores dele. Só aparecem os alimentadores com
          algum gerador.
        </p>
        <RankingGd />
        <p className="rx-nota">
          <strong>"menos de 3"</strong>: 1 ou 2 geradores, sem potência mostrada. <strong>"oculto"</strong>: escondido para
          que um grupo pequeno não saia por subtração do total.
        </p>
        <p className="rx-origem">
          <span>De onde vem:</span> <code>POT_INST</code> e contagem da <code>UGBT_tab</code> por <code>CTMT</code>; capacidade
          dos transformadores com o mesmo <code>CTMT</code>. <Fonte de="gd" />
        </p>
      </section>

      <section className="bloco-visual">
        <h2>Transformador por transformador</h2>
        <div className="duas-colunas">
          <div>
            <p className="lide">
              Dos {inteiro(t.transformadores_com_gd)} transformadores com GD, {inteiro(t.transformadores_com_3_ou_mais)} têm 3
              ou mais geradores. Só eles entram aqui: os outros {inteiro(t.transformadores_com_gd - t.transformadores_com_3_ou_mais)}{" "}
              mostrariam a potência de 1 ou 2 unidades geradoras.
            </p>
            <Colunas dados={faixas} rotuloEixo="GD instalada / potência do transformador" descricao="Transformadores por faixa de razão GD / capacidade" />
            <p className="rx-origem">
              <span>De onde vem:</span> <code>UGBT_tab</code> somada por <code>UNI_TR_MT</code>, dividida pela capacidade do
              transformador. {inteiro(acimaDe100)} passam de 100%. <Fonte de="gd" />
            </p>
          </div>
          <div>
            <h3 className="gd-subtitulo">O que a razão diz, e o que não diz</h3>
            <div className="gd-significa">
              <div className="sim">
                <p className="gd-significa-titulo">Diz</p>
                <ul>
                  <li>Quanto a GD <em>instalada</em> soma perto da potência <em>nominal</em> do transformador.</li>
                  <li>Onde a GD está mais concentrada na rede.</li>
                </ul>
              </div>
              <div className="nao">
                <p className="gd-significa-titulo">Não diz</p>
                <ul>
                  <li>Quanto se gera de fato: <code>POT_INST</code> é a potência instalada, não a geração hora a hora.</li>
                  <li>Se há sobrecarga: o consumo no mesmo instante abate parte da geração.</li>
                  <li>Se cabe mais GD: isso é um estudo de capacidade de hospedagem (tensão, cabos, proteção).</li>
                  <li>kW e kVA não são a mesma coisa: a comparação supõe fator de potência 1.</li>
                </ul>
              </div>
            </div>
            <p className="rx-nota">Leitura deste projeto, a partir das definições dos campos no Manual.</p>
          </div>
        </div>
      </section>

      <section className="bloco-visual">
        <h2>Os de maior razão</h2>
        <p className="lide">Transformadores com 3 ou mais geradores, ordenados pela GD instalada sobre a potência.</p>
        <ul className="gd-cartoes">
          {gd.maiores_razoes.map((m) => (
            <li key={m.transformador}>
              <Medidor pct={m.ug_razao_pct} />
              <p className="gd-cartao-pct">{decimal(m.ug_razao_pct, 0)}%</p>
              <p className="gd-cartao-codigo">
                <code>{m.transformador}</code> · {m.alimentador}
              </p>
              <p className="gd-cartao-detalhe">
                {inteiro(m.qtd_ug)} geradores · {decimal(m.ug_potencia_kw)} kW em {decimal(m.capacidade_kva)} kVA
              </p>
            </li>
          ))}
        </ul>
        <p className="rx-origem">
          <span>De onde vem:</span> os 3 primeiros foram recalculados direto no <code>.gdb</code> pelo teste do pipeline. A
          lista pula transformadores que deixariam 1 ou 2 geradores de fora no mesmo alimentador. <Fonte de="gd" />
        </p>
      </section>

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Chute, classifique e veja o que a razão quer dizer.</p>
        <Quiz titulo="Teste: GD × capacidade" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["manual", "arquivo", "gd"]} />
    </article>
  );
}
