import { distribuidora } from "../dados";
import { Fonte } from "./Fonte";
import { useVisivel } from "./useVisivel";

// Bases de apoio do SIG-R, conforme o Diagrama 1 e o item 8 do Módulo 10.
const BASES = [
  { sigla: "DDA", nome: "Dicionário de Dados ANEEL do SIG-R" },
  { sigla: "MCPSE e MCSE", nome: "Manuais de Controle Patrimonial e de Contabilidade do Setor Elétrico" },
  { sigla: "IBGE", nome: "Bases do Instituto Brasileiro de Geografia e Estatística" },
  { sigla: "CNAE", nome: "Classificação Nacional de Atividades Econômicas" },
  { sigla: "ANEEL", nome: "Outras bases de dados da ANEEL" },
];

// Quantidade ilustrativa de caixas; a posição da distribuidora de estudo é só visual.
const CAIXAS = 24;
const POSICAO_DESTAQUE = 9;

/** O SIG-R como uma caixa grande: bases de apoio de um lado, uma BDGD por distribuidora do outro. */
export default function DiagramaSigr() {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.35);

  return (
    <div ref={ref} className={`sigr ${visivel ? "montando" : ""}`}>
      <div className="sigr-moldura">
        <p className="sigr-titulo">SIG-R</p>
        <div className="sigr-corpo">
          <ul className="sigr-bases">
            {BASES.map((b, i) => (
              <li key={b.sigla} title={b.nome} style={{ ["--i" as string]: i }}>
                {b.sigla}
              </li>
            ))}
          </ul>
          <div className="sigr-bdgd">
            <p className="sigr-bdgd-titulo">BDGD</p>
            <ul className="sigr-distribuidoras" aria-label="Uma BDGD por distribuidora">
              {Array.from({ length: CAIXAS }, (_, i) => (
                <li
                  key={i}
                  className={i === POSICAO_DESTAQUE ? "sigr-destaque" : undefined}
                  style={{ ["--i" as string]: i }}
                >
                  {i === POSICAO_DESTAQUE ? distribuidora : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="nota">
        Redesenho do Diagrama 1 do Módulo 10 <Fonte de="modulo10" onde="itens 7 a 9, Diagrama 1" />. O número de
        caixas é ilustrativo: há uma BDGD para cada distribuidora.
      </p>
    </div>
  );
}
