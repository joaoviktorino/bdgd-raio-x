import type { ReactNode } from "react";

import { arquivo } from "../dados";
import { dataPorExtenso, lerDataHora } from "../formatos";
import { Fonte } from "./Fonte";
import { useVisivel } from "./useVisivel";

type Marco = { data: string; titulo: string; texto: ReactNode; provavel?: boolean };

const DIA = 86_400_000;

/** Linha do tempo em escala real: do retrato da rede ao download do arquivo. */
export default function LinhaPrazos() {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.4);
  const referencia = arquivo.partes_do_nome.data_referencia;
  const anoSeguinte = Number(referencia.slice(0, 4)) + 1;
  const validacao = lerDataHora(arquivo.partes_do_nome.geracao).data;

  const marcos: Marco[] = [
    {
      data: referencia,
      titulo: "O retrato",
      texto: (
        <>
          A rede como estava neste dia <Fonte de="modulo10" onde="item 41.2" />
        </>
      ),
    },
    {
      data: `${anoSeguinte}-03-01`,
      titulo: "Prazo de envio",
      texto: (
        <>
          Até 1º de março do ano seguinte <Fonte de="modulo10" onde="item 41.2" />
        </>
      ),
    },
    {
      data: validacao,
      titulo: "Validação",
      provavel: true,
      texto: (
        <>
          Data e hora no nome do arquivo, provavelmente da validação{" "}
          <Fonte de="manual" onde="Processo de Validação, item 3.2.1, p. 29" />. Só a base validada é publicada{" "}
          <Fonte de="modulo10" onde="item 48" />
        </>
      ),
    },
    {
      data: arquivo.data_download,
      titulo: "Download",
      texto: (
        <>
          Quando este projeto baixou o arquivo <Fonte de="arquivo" />
        </>
      ),
    },
  ];

  const inicio = Date.parse(marcos[0].data);
  const fim = Date.parse(marcos[marcos.length - 1].data);
  const dias = Math.round((fim - inicio) / DIA);

  return (
    <div ref={ref} className={`prazos ${visivel ? "em-curso" : ""}`}>
      <ol className="prazos-trilho">
        {marcos.map((m, i) => (
          <li
            key={m.titulo}
            className={`prazo ${m.provavel ? "provavel" : ""} ${i % 2 ? "abaixo" : "acima"}`}
            style={{
              ["--pos" as string]: (Date.parse(m.data) - inicio) / (fim - inicio),
              ["--i" as string]: i,
            }}
          >
            <span className="prazo-ponto" aria-hidden="true" />
            <div className="prazo-texto">
              <time dateTime={m.data}>{dataPorExtenso(m.data)}</time>
              <strong>
                {m.titulo}
                {m.provavel && <span className="selo selo-talvez">provável</span>}
              </strong>
              <span>{m.texto}</span>
            </div>
          </li>
        ))}
      </ol>
      <p className="nota">
        Escala real: {dias} dias entre o retrato da rede e o download. O envio ordinário é anual{" "}
        <Fonte de="modulo10" onde="item 41.1" />.
      </p>
    </div>
  );
}
