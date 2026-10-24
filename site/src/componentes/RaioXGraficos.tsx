// Gráficos da página "Raio-x da rede". Cor categórica = subestação (ordem fixa);
// textos sempre na cor de texto; cada marca tem dica ao passar o mouse ou focar.
import { type ReactNode, useState } from "react";

import { inteiro } from "../formatos";
import {
  type Alimentador,
  contagemTexto,
  corDaSubestacao,
  decimal,
  nomeCurto,
  numero,
  raioX,
} from "../raioX";
import { useVisivel } from "./useVisivel";

export const corVar = (sigla: string) => {
  const i = corDaSubestacao(sigla);
  return i < 0 ? "var(--texto-suave)" : `var(--rx-cor-${i})`;
};

type Dica = { x: number; y: number; abaixo: boolean; conteudo: ReactNode } | null;

// Meia largura máxima da dica (18rem) e altura que ela precisa acima do ponteiro.
const MEIA_DICA = 150;
const ALTURA_DICA = 130;

/** Caixa de dica posicionada dentro de um contêiner com position: relative (e sem rolagem,
    para não ser cortada). Fica sempre dentro da largura do contêiner e, perto do topo,
    aparece abaixo do ponteiro. */
function useDica() {
  const [dica, setDica] = useState<Dica>(null);
  const mostrar = (e: React.PointerEvent | React.FocusEvent, conteudo: ReactNode) => {
    const caixa = (e.currentTarget as Element).closest(".rx-com-dica")!.getBoundingClientRect();
    const alvo = (e.currentTarget as Element).getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : alvo.left + alvo.width / 2) - caixa.left;
    const y = ("clientY" in e ? e.clientY : alvo.top) - caixa.top;
    const meia = Math.min(MEIA_DICA, caixa.width / 2);
    setDica({
      x: Math.min(Math.max(x, meia), caixa.width - meia),
      y,
      // Perto do topo do gráfico ou da tela, a dica vai para baixo do ponteiro.
      abaixo: y < ALTURA_DICA || y + caixa.top < ALTURA_DICA,
      conteudo,
    });
  };
  const caixa = dica && (
    <div className={dica.abaixo ? "rx-dica abaixo" : "rx-dica"} style={{ left: dica.x, top: dica.y }} role="status">
      {dica.conteudo}
    </div>
  );
  return { mostrar, esconder: () => setDica(null), caixa };
}

/** Legenda das subestações (cor + nome), usada por todos os gráficos coloridos. */
export function LegendaSubestacoes() {
  return (
    <ul className="rx-legenda">
      {raioX.subestacoes
        .filter((s) => s.alimentadores > 0)
        .map((s) => (
          <li key={s.subestacao}>
            <span className="rx-legenda-cor" style={{ background: corVar(s.subestacao) }} />
            {nomeCurto(s)}
          </li>
        ))}
    </ul>
  );
}

function FichaAlimentador({ a }: { a: Alimentador }) {
  return (
    <>
      <strong>{a.nome}</strong>
      <span>
        Código <code>{a.alimentador}</code> · {a.tensao}
      </span>
      <span>
        {decimal(a.km_mt)} km de MT · {decimal(a.km_bt)} km de BT
      </span>
      <span>
        {inteiro(a.transformadores)} transformadores · {inteiro(a.potencia_kva)} kVA
      </span>
      <span>
        {contagemTexto(a.consumidores_bt.qtd_uc)} UCs em BT · {contagemTexto(a.consumidores_mt.qtd_uc)} em MT
      </span>
    </>
  );
}

// --- Estrela: cada subestação com seus alimentadores como raios ---

const LARGURA = 1000;
const RAIO_MAX = 165;
const CY = RAIO_MAX + 25;

// Posição de cada raio. O mais longo aponta para cima; os demais seguem no sentido horário.
const MAX_KM = Math.max(...raioX.alimentadores.map((a) => a.km_mt));
const ESTRELAS = raioX.subestacoes.map((s, i) => {
  const cx = (LARGURA / raioX.subestacoes.length) * (i + 0.5);
  const meus = raioX.alimentadores.filter((a) => a.subestacao === s.subestacao).sort((a, b) => b.km_mt - a.km_mt);
  const raios = meus.map((a, j) => {
    const angulo = (j / meus.length) * Math.PI * 2 - Math.PI / 2;
    const r = 18 + (a.km_mt / MAX_KM) * (RAIO_MAX - 18);
    return { a, j, x: cx + Math.cos(angulo) * r, y: CY + Math.sin(angulo) * r };
  });
  return { s, cx, raios };
});
// Os nomes ficam logo abaixo do raio mais baixo, sem sobra de espaço.
const BASE = Math.max(CY + 14, ...ESTRELAS.flatMap((e) => e.raios.map((r) => r.y))) + 40;
const ALTURA = BASE + 32;

export function EstrelaAlimentadores({
  escolhido,
  aoEscolher,
}: {
  escolhido: string | null;
  aoEscolher: (a: Alimentador) => void;
}) {
  const { ref, visivel } = useVisivel<SVGSVGElement>(0.3);
  const { mostrar, esconder, caixa } = useDica();

  return (
    <div className="rx-com-dica">
      <div className="rx-estrela">
      <svg
        ref={ref}
        viewBox={`0 0 ${LARGURA} ${ALTURA}`}
        className={visivel ? "rx-estrela-svg visivel" : "rx-estrela-svg"}
        role="group"
        aria-label="Subestações e seus alimentadores; o comprimento de cada raio é proporcional aos km de rede de média tensão"
      >
        {ESTRELAS.map(({ s, cx, raios }) => {
          const cy = CY;
          return (
            <g key={s.subestacao}>
              {raios.map(({ a, j, x, y }) => {
                const ativo = escolhido === a.alimentador;
                return (
                  <g
                    key={a.alimentador}
                    className={ativo ? "rx-raio ativo" : "rx-raio"}
                    style={{ "--cor": corVar(s.subestacao), "--atraso": `${j * 50}ms` } as React.CSSProperties}
                    tabIndex={0}
                    role="button"
                    aria-label={`${a.nome}: ${decimal(a.km_mt)} km de média tensão`}
                    onPointerMove={(e) => mostrar(e, <FichaAlimentador a={a} />)}
                    onPointerLeave={esconder}
                    onFocus={(e) => mostrar(e, <FichaAlimentador a={a} />)}
                    onBlur={esconder}
                    onClick={() => aoEscolher(a)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && aoEscolher(a)}
                  >
                    <line className="rx-raio-alvo" x1={cx} y1={cy} x2={x} y2={y} />
                    <line className="rx-raio-linha" x1={cx} y1={cy} x2={x} y2={y} pathLength={1} />
                    <circle className="rx-raio-ponta" cx={x} cy={y} r={ativo ? 7 : 5} />
                  </g>
                );
              })}
              <circle className="rx-hub" cx={cx} cy={cy} r={14} style={{ stroke: corVar(s.subestacao) }} />
              <text className="rx-hub-sigla" x={cx} y={BASE}>
                {s.subestacao}
              </text>
              <text className="rx-hub-sub" x={cx} y={BASE + 20}>
                {s.alimentadores > 0 ? `${s.alimentadores} alimentadores` : "nenhum alimentador de MT"}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      {caixa}
    </div>
  );
}

// --- Ranking de alimentadores com troca de medida ---

type Medida = {
  id: string;
  rotulo: string;
  valor: (a: Alimentador) => number | null;
  texto: (a: Alimentador) => string;
};

export const MEDIDAS: Medida[] = [
  { id: "km_mt", rotulo: "km de MT", valor: (a) => a.km_mt, texto: (a) => `${decimal(a.km_mt)} km` },
  { id: "km_bt", rotulo: "km de BT", valor: (a) => a.km_bt, texto: (a) => `${decimal(a.km_bt)} km` },
  {
    id: "transformadores",
    rotulo: "Transformadores",
    valor: (a) => a.transformadores,
    texto: (a) => inteiro(a.transformadores),
  },
  {
    id: "potencia_kva",
    rotulo: "Potência (kVA)",
    valor: (a) => a.potencia_kva,
    texto: (a) => `${inteiro(a.potencia_kva)} kVA`,
  },
  {
    id: "uc_bt",
    rotulo: "Consumidores BT",
    valor: (a) => numero(a.consumidores_bt.qtd_uc),
    texto: (a) => contagemTexto(a.consumidores_bt.qtd_uc),
  },
];

export function RankingAlimentadores({
  medida,
  escolhido,
  aoEscolher,
}: {
  medida: Medida;
  escolhido: string | null;
  aoEscolher: (a: Alimentador) => void;
}) {
  const { mostrar, esconder, caixa } = useDica();
  const linhas = [...raioX.alimentadores].sort((a, b) => (medida.valor(b) ?? -1) - (medida.valor(a) ?? -1));
  const max = Math.max(...linhas.map((a) => medida.valor(a) ?? 0));

  return (
    <div className="rx-com-dica">
      <ol className="rx-ranking" aria-label={`Alimentadores por ${medida.rotulo}`}>
        {linhas.map((a) => {
          const v = medida.valor(a);
          return (
            <li key={a.alimentador} className={escolhido === a.alimentador ? "ativo" : undefined}>
              <button
                type="button"
                className="rx-ranking-linha"
                onClick={() => aoEscolher(a)}
                onPointerMove={(e) => mostrar(e, <FichaAlimentador a={a} />)}
                onPointerLeave={esconder}
                onBlur={esconder}
              >
                <span className="rx-ranking-nome">{a.alimentador}</span>
                <span className="rx-ranking-trilho">
                  {v !== null && v > 0 && (
                    <span
                      className="rx-ranking-barra"
                      style={{ width: `${(v / max) * 100}%`, background: corVar(a.subestacao) }}
                    />
                  )}
                </span>
                <span className="rx-ranking-valor">{medida.texto(a)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {caixa}
    </div>
  );
}

// --- Dois jeitos de medir: COMP somado × desenho medido ---

export function DoisJeitos() {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.4);
  const max = Math.max(...raioX.comprimentos.map((c) => Math.max(c.km_comp, c.km_medido)));
  return (
    <div ref={ref} className={visivel ? "rx-medir visivel" : "rx-medir"}>
      <ul className="rx-medir-legenda">
        <li>
          <span className="rx-medir-amostra comp" /> soma da coluna <code>COMP</code>
        </li>
        <li>
          <span className="rx-medir-amostra medido" /> desenho medido no elipsoide
        </li>
      </ul>
      {raioX.comprimentos.map((c) => {
        const dif = ((c.km_medido - c.km_comp) / c.km_comp) * 100;
        return (
          <div key={c.camada} className="rx-medir-linha">
            <p className="rx-medir-nome">
              Rede {c.rede} <code>{c.camada}</code>
              <span>{inteiro(c.trechos)} trechos</span>
            </p>
            <div className="rx-medir-barras">
              {(["comp", "medido"] as const).map((jeito) => {
                const valor = jeito === "comp" ? c.km_comp : c.km_medido;
                const largura = (valor / max) * 100;
                // Barra curta demais para caber o número: o rótulo vai para fora, à direita.
                return (
                  <span
                    key={jeito}
                    className={largura < 18 ? `rx-medir-barra ${jeito} rotulo-fora` : `rx-medir-barra ${jeito}`}
                    style={{ width: `${largura}%` }}
                  >
                    <span>{decimal(valor)} km</span>
                  </span>
                );
              })}
            </div>
            <p className="rx-medir-dif">
              {dif > 0 ? "+" : "−"}
              {decimal(Math.abs(dif), 2)}%
            </p>
          </div>
        );
      })}
    </div>
  );
}

// --- Colunas simples (uma série): histogramas de transformadores ---

export function Colunas({
  dados,
  rotuloEixo,
  descricao,
}: {
  dados: { rotulo: string; valor: number; dica: string }[];
  rotuloEixo: string;
  descricao: string;
}) {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.3);
  const { mostrar, esconder, caixa } = useDica();
  const max = Math.max(...dados.map((d) => d.valor));
  const maior = dados.find((d) => d.valor === max);
  return (
    <div ref={ref} className={visivel ? "rx-com-dica rx-colunas visivel" : "rx-com-dica rx-colunas"}>
      <div className="rx-colunas-area" role="list" aria-label={descricao}>
        {dados.map((d, i) => (
          <div
            key={d.rotulo}
            role="listitem"
            className="rx-coluna"
            tabIndex={0}
            aria-label={d.dica}
            onPointerMove={(e) => mostrar(e, d.dica)}
            onPointerLeave={esconder}
            onFocus={(e) => mostrar(e, d.dica)}
            onBlur={esconder}
          >
            <span className="rx-coluna-pilha">
              <span className="rx-coluna-valor">{d === maior ? inteiro(d.valor) : ""}</span>
              <span
                className="rx-coluna-barra"
                style={{ height: `${(d.valor / max) * 85}%`, "--atraso": `${i * 40}ms` } as React.CSSProperties}
              />
            </span>
            <span className="rx-coluna-rotulo">{d.rotulo}</span>
          </div>
        ))}
      </div>
      <p className="rx-colunas-eixo">{rotuloEixo}</p>
      {caixa}
    </div>
  );
}
