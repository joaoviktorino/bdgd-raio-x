import { type ReactNode, useState } from "react";

import { arquivo } from "../dados";
import { dataPorExtenso, inteiro, lerDataHora } from "../formatos";
import { Fonte } from "./Fonte";

type Parte = {
  chave: string;
  texto: string;
  rotulo: string;
  status: "confirmado" | "provável";
  significado: string;
  detalhe: ReactNode;
};

const MODELOS = [
  { sigla: "M6", nome: "Modelo Antigo", base: "Módulos 2 e 6" },
  { sigla: "M10", nome: "Modelo Novo", base: "Módulo 10, Rev. 0" },
  { sigla: "V10", nome: "Modelo V1.0", base: "Manual, Rev. 1" },
  { sigla: "V11", nome: "Modelo V1.1", base: "versão atual" },
];

function montarPartes(): Parte[] {
  const p = arquivo.partes_do_nome;
  const geracao = lerDataHora(p.geracao);
  const zip = arquivo.conteudo_zip;
  return [
    {
      chave: "nome",
      texto: p.nome,
      rotulo: "distribuidora",
      status: "confirmado",
      significado: "Nova Palma, a UHENPAL",
      detalhe: (
        <p>
          O nome curto da distribuidora. No Manual, ela aparece como UHENPAL, com o mesmo código que vem logo
          depois no nome do arquivo <Fonte de="manual" onde="Anexo III, p. 214" />.
        </p>
      ),
    },
    {
      chave: "codigo",
      texto: String(p.codigo_aneel),
      rotulo: "código",
      status: "confirmado",
      significado: `Código ${p.codigo_aneel} no cadastro da ANEEL`,
      detalhe: (
        <p>
          É o código da distribuidora no Cadastro Institucional da ANEEL (SARI), usado a partir do modelo de
          dados do Módulo 10 <Fonte de="manual" onde="Anexo III, item 3.1, p. 213" />. No modelo antigo, a
          mesma Nova Palma tinha o código 63 <Fonte de="manual" onde="Anexo III, p. 214" />.
        </p>
      ),
    },
    {
      chave: "referencia",
      texto: p.data_referencia,
      rotulo: "data de referência",
      status: "confirmado",
      significado: `Retrato da rede em ${dataPorExtenso(p.data_referencia)}`,
      detalhe: (
        <p>
          A data do retrato. No envio anual, os dados são referenciados em 31 de dezembro do ano anterior e
          entregues até 1º de março <Fonte de="modulo10" onde="item 41.2" />.
        </p>
      ),
    },
    {
      chave: "modelo",
      texto: p.modelo,
      rotulo: "modelo de dados",
      status: "confirmado",
      significado: "Modelo de dados V1.1, o atual",
      detalhe: (
        <>
          <p>
            A versão do modelo de dados, ou seja, quais camadas e campos o arquivo tem. A V1.1 é a atual, com 23
            entidades geográficas e 20 não geográficas <Fonte de="manual" onde="Seção 2, item 2.4, p. 8" />.
          </p>
          <ol className="linha-do-tempo" aria-label="Versões do modelo de dados">
            {MODELOS.map((m) => (
              <li key={m.sigla} className={m.sigla === p.modelo ? "atual" : undefined}>
                <strong>{m.sigla}</strong>
                <span>{m.nome}</span>
                <small>{m.base}</small>
              </li>
            ))}
          </ol>
          <p className="nota">
            Nomes dos modelos conforme o glossário do Manual <Fonte de="manual" onde="Glossário, p. 5" />.
          </p>
        </>
      ),
    },
    {
      chave: "geracao",
      texto: p.geracao,
      rotulo: "data e hora",
      status: "provável",
      significado: `${dataPorExtenso(geracao.data)}, ${geracao.hora}`,
      detalhe: (
        <p>
          Uma data e hora, provavelmente da validação do arquivo pela ANEEL. O Manual não define o nome do
          arquivo publicado, mas usa um padrão igual para os arquivos que a validação gera:{" "}
          <code>[DIST]_[DATA_REF]_[MODELO]_[DATAHORA_VALIDACAO]</code>{" "}
          <Fonte de="manual" onde="Processo de Validação, item 3.2.1, p. 29" />.
        </p>
      ),
    },
    {
      chave: "formato",
      texto: ".gdb.zip",
      rotulo: "formato",
      status: "confirmado",
      significado: "File Geodatabase compactado",
      detalhe: (
        <p>
          Um arquivo compactado (.zip) que contém uma única pasta <code>.gdb</code>, o formato File
          Geodatabase, com {inteiro(zip.arquivos)} arquivos internos <Fonte de="arquivo" />. Abaixo, veja o
          que tem dentro.
        </p>
      ),
    },
  ];
}

/** O nome do arquivo partido em peças clicáveis, cada uma com seu significado. */
export default function NomeDecifrado() {
  const partes = montarPartes();
  const [ativa, setAtiva] = useState(partes[0].chave);
  const parte = partes.find((p) => p.chave === ativa)!;

  return (
    <div className="decifrador">
      <div className="nome-arquivo" role="group" aria-label="Partes do nome do arquivo">
        {partes.map((p, i) => (
          <span key={p.chave} className="peca-e-separador">
            {i > 0 && p.chave !== "formato" && <span className="separador">_</span>}
            <button
              type="button"
              className={`peca peca-${p.chave}`}
              style={{ ["--ordem" as string]: i }}
              aria-pressed={ativa === p.chave}
              onClick={() => setAtiva(p.chave)}
            >
              <span className="peca-texto">{p.texto}</span>
              <span className="peca-rotulo">{p.rotulo}</span>
            </button>
          </span>
        ))}
      </div>

      <div className={`cartao-parte peca-${parte.chave}`} aria-live="polite" key={parte.chave}>
        <div className="cartao-parte-topo">
          <h3>{parte.significado}</h3>
          <span className={`selo selo-${parte.status === "confirmado" ? "ok" : "talvez"}`}>
            {parte.status}
          </span>
        </div>
        {parte.detalhe}
      </div>
    </div>
  );
}
