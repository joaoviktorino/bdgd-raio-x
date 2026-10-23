import { type ReactNode, useState } from "react";

import { inteiro } from "../formatos";
import "./quiz.css";

type Base = { id: string; enunciado: ReactNode; explicacao: ReactNode };

export type Pergunta =
  | (Base & { tipo: "escolha"; opcoes: string[]; certa: number })
  | (Base & { tipo: "estimativa"; valor: number; min: number; max: number; unidade: string })
  | (Base & { tipo: "classificar"; grupos: [string, string]; itens: { rotulo: string; grupo: 0 | 1 }[] });

type Resposta = number | number[]; // escolha/estimativa: número; classificar: grupo de cada item

// Estimativa: controle de 0 a 1000 em escala logarítmica entre min e max.
const PASSOS = 1000;
const paraValor = (pos: number, min: number, max: number) => min * (max / min) ** (pos / PASSOS);
const paraPosicao = (v: number, min: number, max: number) => (Math.log(v / min) / Math.log(max / min)) * PASSOS;

/** Arredonda para 2 algarismos significativos: 14825 -> 15000. */
function redondo(v: number): number {
  const ordem = 10 ** Math.max(0, Math.floor(Math.log10(v)) - 1);
  return Math.round(v / ordem) * ordem;
}

/** Quantas vezes o palpite errou (sempre >= 1). */
const fator = (palpite: number, real: number) => Math.max(palpite / real, real / palpite);

function acertou(p: Pergunta, r: Resposta): boolean {
  if (p.tipo === "escolha") return r === p.certa;
  if (p.tipo === "estimativa") return fator(r as number, p.valor) <= 2;
  return p.itens.every((item, i) => (r as number[])[i] === item.grupo);
}

function respondida(p: Pergunta, r: Resposta | undefined): boolean {
  if (r === undefined) return false;
  if (p.tipo === "classificar") return (r as number[]).every((g) => g === 0 || g === 1);
  return true;
}

/** Quiz de uma página: uma pergunta por vez, com explicação e fonte depois de cada resposta. */
export default function Quiz({ titulo, perguntas }: { titulo: string; perguntas: Pergunta[] }) {
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, Resposta>>({});
  const [confirmadas, setConfirmadas] = useState<Record<string, boolean>>({});

  const terminou = indice >= perguntas.length;
  const pontos = perguntas.filter((p) => confirmadas[p.id] && acertou(p, respostas[p.id])).length;

  function reiniciar() {
    setIndice(0);
    setRespostas({});
    setConfirmadas({});
  }

  return (
    <section className="quiz" aria-label={titulo}>
      <div className="quiz-topo">
        <p className="quiz-titulo">{titulo}</p>
        <ol className="quiz-progresso" aria-label="Progresso">
          {perguntas.map((p, i) => {
            const estado = confirmadas[p.id] ? (acertou(p, respostas[p.id]) ? "certo" : "errado") : i === indice ? "atual" : "";
            return <li key={p.id} className={estado} aria-label={`Pergunta ${i + 1}${estado ? `: ${estado}` : ""}`} />;
          })}
        </ol>
      </div>

      {terminou ? (
        <Resultado pontos={pontos} total={perguntas.length} reiniciar={reiniciar} />
      ) : (
        <PerguntaAtual
          key={perguntas[indice].id}
          numero={indice + 1}
          total={perguntas.length}
          pergunta={perguntas[indice]}
          resposta={respostas[perguntas[indice].id]}
          confirmada={!!confirmadas[perguntas[indice].id]}
          responder={(r) => setRespostas((rs) => ({ ...rs, [perguntas[indice].id]: r }))}
          confirmar={() => setConfirmadas((cs) => ({ ...cs, [perguntas[indice].id]: true }))}
          avancar={() => setIndice((i) => i + 1)}
        />
      )}
    </section>
  );
}

function PerguntaAtual(props: {
  numero: number;
  total: number;
  pergunta: Pergunta;
  resposta: Resposta | undefined;
  confirmada: boolean;
  responder: (r: Resposta) => void;
  confirmar: () => void;
  avancar: () => void;
}) {
  const { pergunta: p, resposta: r, confirmada } = props;
  const certo = confirmada && acertou(p, r!);

  return (
    <div className="quiz-pergunta">
      <p className="quiz-numero">
        Pergunta {props.numero} de {props.total}
      </p>
      <h3>{p.enunciado}</h3>

      {p.tipo === "escolha" && (
        <div className="quiz-opcoes">
          {p.opcoes.map((opcao, i) => {
            const marca = confirmada ? (i === p.certa ? "certa" : i === r ? "errada" : "") : r === i ? "escolhida" : "";
            return (
              <button
                key={opcao}
                type="button"
                className={`quiz-opcao ${marca}`}
                aria-pressed={r === i}
                disabled={confirmada}
                onClick={() => props.responder(i)}
              >
                {opcao}
              </button>
            );
          })}
        </div>
      )}

      {p.tipo === "estimativa" && <Estimativa pergunta={p} resposta={r as number | undefined} confirmada={confirmada} responder={props.responder} />}

      {p.tipo === "classificar" && (
        <ul className="quiz-classificar">
          {p.itens.map((item, i) => {
            const escolhido = (r as number[] | undefined)?.[i];
            return (
              <li key={item.rotulo} className={confirmada ? (escolhido === item.grupo ? "certa" : "errada") : ""}>
                <code>{item.rotulo}</code>
                <span className="quiz-grupos">
                  {p.grupos.map((grupo, g) => (
                    <button
                      key={grupo}
                      type="button"
                      aria-pressed={escolhido === g}
                      disabled={confirmada}
                      onClick={() => {
                        const atual = [...((r as number[] | undefined) ?? p.itens.map(() => -1))];
                        atual[i] = g;
                        props.responder(atual);
                      }}
                    >
                      {grupo}
                    </button>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {confirmada ? (
        <div className={`quiz-retorno ${certo ? "certo" : "errado"}`} aria-live="polite">
          <p className="quiz-veredito">{certo ? "Acertou!" : "Não foi dessa vez."}</p>
          <div>{p.explicacao}</div>
          <button type="button" className="botao-principal" onClick={props.avancar}>
            {props.numero < props.total ? "Próxima pergunta" : "Ver resultado"}
          </button>
        </div>
      ) : (
        <button type="button" className="botao-principal" disabled={!respondida(p, r)} onClick={props.confirmar}>
          Confirmar
        </button>
      )}
    </div>
  );
}

function Estimativa(props: {
  pergunta: Extract<Pergunta, { tipo: "estimativa" }>;
  resposta: number | undefined;
  confirmada: boolean;
  responder: (r: Resposta) => void;
}) {
  const { pergunta: p, resposta, confirmada } = props;
  const palpite = resposta ?? redondo(Math.sqrt(p.min * p.max));
  const vezes = fator(palpite, p.valor);
  const veredito = vezes <= 1.25 ? "Na mosca!" : vezes <= 2 ? "Perto!" : `Longe: errou por ${vezes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} vezes.`;

  return (
    <div className="quiz-estimativa">
      <p className="quiz-palpite">
        <span>Seu palpite</span>
        <strong>{inteiro(palpite)}</strong> {p.unidade}
      </p>
      <input
        type="range"
        min={0}
        max={PASSOS}
        value={paraPosicao(palpite, p.min, p.max)}
        disabled={confirmada}
        aria-label="Seu palpite"
        aria-valuetext={`${inteiro(palpite)} ${p.unidade}`}
        onChange={(e) => props.responder(redondo(paraValor(Number(e.target.value), p.min, p.max)))}
      />
      <div className="quiz-escala" aria-hidden="true">
        <span>{inteiro(p.min)}</span>
        <span>{inteiro(p.max)}</span>
      </div>
      {confirmada && (
        <>
          <div className="quiz-regua" aria-label={`Valor real: ${inteiro(p.valor)} ${p.unidade}`}>
            <span className="regua-marca palpite" style={{ ["--pos" as string]: paraPosicao(palpite, p.min, p.max) / PASSOS }}>
              palpite
            </span>
            <span className="regua-marca real" style={{ ["--pos" as string]: paraPosicao(p.valor, p.min, p.max) / PASSOS }}>
              real: {inteiro(p.valor)}
            </span>
          </div>
          <p className="quiz-veredito-estimativa">{veredito}</p>
        </>
      )}
    </div>
  );
}

function Resultado({ pontos, total, reiniciar }: { pontos: number; total: number; reiniciar: () => void }) {
  const fracao = pontos / total;
  const mensagem =
    fracao === 1 ? "Gabaritou. Você já lê a BDGD melhor que muita gente." : fracao >= 0.6 ? "Muito bem! Quase lá." : "Bom começo. Explore a página de novo e tente outra vez.";
  return (
    <div className="quiz-resultado" aria-live="polite">
      <p className="quiz-placar">
        <strong>{pontos}</strong> de {total}
      </p>
      <p>{mensagem}</p>
      <button type="button" className="botao-secundario" onClick={reiniciar}>
        Refazer o teste
      </button>
    </div>
  );
}
