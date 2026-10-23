import type { ReactNode } from "react";

import { Fonte } from "./Fonte";

type Linha = { aspecto: string; concessao: ReactNode; permissao: ReactNode };

const LINHAS: Linha[] = [
  {
    aspecto: "Como",
    concessao: "Licitação, na modalidade concorrência ou diálogo competitivo",
    permissao: "Licitação",
  },
  {
    aspecto: "Para quem",
    concessao: "Pessoa jurídica ou consórcio de empresas",
    permissao: "Pessoa física ou jurídica",
  },
  {
    aspecto: "Duração",
    concessao: "Prazo determinado",
    permissao: "A título precário",
  },
  {
    aspecto: "Contrato",
    concessao: "—",
    permissao: "De adesão, revogável unilateralmente pelo poder concedente",
  },
];

/** As duas formas de delegar um serviço público, lado a lado. */
export default function ConcessaoPermissao() {
  return (
    <div className="outorgas">
      <div className="outorga outorga-c">
        <p className="outorga-letra" aria-hidden="true">
          C
        </p>
        <h3>Concessão</h3>
        <p className="nota">
          <Fonte de="lei8987" onde="art. 2º, II" />
        </p>
        <dl>
          {LINHAS.map((l) => (
            <div key={l.aspecto}>
              <dt>{l.aspecto}</dt>
              <dd>{l.concessao}</dd>
            </div>
          ))}
        </dl>
        <p className="outorga-exemplo">
          Nova Palma (UHENPAL): <code>C.062.RS.2001</code>
        </p>
      </div>

      <div className="outorga outorga-p">
        <p className="outorga-letra" aria-hidden="true">
          P
        </p>
        <h3>Permissão</h3>
        <p className="nota">
          <Fonte de="lei8987" onde="art. 2º, IV, e art. 40" />
        </p>
        <dl>
          {LINHAS.map((l) => (
            <div key={l.aspecto}>
              <dt>{l.aspecto}</dt>
              <dd>{l.permissao}</dd>
            </div>
          ))}
        </dl>
        <p className="outorga-exemplo">
          CERAL: <code>P.025.SC.2008</code>
        </p>
      </div>
    </div>
  );
}
