import { Link } from "react-router";

import { type CamadaExplorador, type Explorador, acharNoExplorador, formaDe } from "../explorador";
import { inteiro } from "../formatos";
import { Fonte } from "./Fonte";
import { useVisivel } from "./useVisivel";

type No = { sigla: string; apelido: string };

// A cadeia principal de chaves da BDGD e as redes penduradas nela.
const CADEIA: No[] = [
  { sigla: "SUB", apelido: "subestação" },
  { sigla: "CTMT", apelido: "alimentador" },
  { sigla: "UNTRMT", apelido: "transformador" },
];
const FOLHAS: No[] = [
  { sigla: "UCBT", apelido: "consumidores BT" },
  { sigla: "UGBT", apelido: "geradores BT" },
];
const PENDURADAS: { sigla: string; apelido: string; em: string }[] = [
  { sigla: "SSDMT", apelido: "rede MT", em: "CTMT" },
  { sigla: "SSDBT", apelido: "rede BT", em: "UNTRMT" },
];

/** Coluna da camada `filha` que guarda o código da camada `mae` (ex.: UCBT.UNI_TR_MT -> UNTRMT). */
function colunaDaLigacao(exp: Explorador, filha: string, mae: string): string | undefined {
  const m = acharNoExplorador(exp, mae);
  const f = acharNoExplorador(exp, filha);
  return m?.ligada_por.find((l) => l.camada === f?.nome)?.campo;
}

function Cartao({ camada, apelido }: { camada?: CamadaExplorador; apelido: string }) {
  if (!camada) return null;
  return (
    <Link to={`/camadas/${camada.nome}`} className={`fio-no forma-borda-${formaDe(camada.geometria)}`}>
      <span className="fio-sigla">{camada.sigla}</span>
      <span className="fio-apelido">{apelido}</span>
      <span className="fio-registros">
        {typeof camada.registros === "number" ? inteiro(camada.registros) : camada.registros}
      </span>
    </Link>
  );
}

function Conector({ coluna, filha }: { coluna?: string; filha: string }) {
  return (
    <span className="fio-conector" title={coluna ? `Na ${filha}, a coluna ${coluna} guarda o código desta ligação` : undefined}>
      <span className="fio-linha" aria-hidden="true" />
      {coluna && <code className="fio-coluna">{coluna}</code>}
    </span>
  );
}

/** Diagrama das chaves de ligação: SUB → CTMT → UNTRMT → UCBT/UGBT, com as redes MT e BT penduradas. */
export default function FioLigacao({ exp }: { exp: Explorador }) {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.3);
  const c = (s: string) => acharNoExplorador(exp, s);

  return (
    <div ref={ref} className={`fio ${visivel ? "ligado" : ""}`}>
      <div className="fio-trilho">
        {CADEIA.map((no, i) => (
          <div key={no.sigla} className="fio-etapa" style={{ ["--i" as string]: i }}>
            {i > 0 && <Conector coluna={colunaDaLigacao(exp, no.sigla, CADEIA[i - 1].sigla)} filha={no.sigla} />}
            <div className="fio-coluna-no">
              <Cartao camada={c(no.sigla)} apelido={no.apelido} />
              {PENDURADAS.filter((p) => p.em === no.sigla).map((p) => (
                <div key={p.sigla} className="fio-pendurada">
                  <Conector coluna={colunaDaLigacao(exp, p.sigla, p.em)} filha={p.sigla} />
                  <Cartao camada={c(p.sigla)} apelido={p.apelido} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="fio-etapa fio-folhas" style={{ ["--i" as string]: CADEIA.length }}>
          {FOLHAS.map((f) => (
            <div key={f.sigla} className="fio-folha">
              <Conector coluna={colunaDaLigacao(exp, f.sigla, "UNTRMT")} filha={f.sigla} />
              <Cartao camada={c(f.sigla)} apelido={f.apelido} />
            </div>
          ))}
        </div>
      </div>
      <p className="nota">
        Cada seta é uma coluna que guarda o código da camada anterior: um campo do tipo "Vinculado"{" "}
        <Fonte de="manual" onde="Anexo I" />. Números da {exp.distribuidora} <Fonte de="arquivo" />.
      </p>
    </div>
  );
}
