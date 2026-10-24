import { useState } from "react";
import { Link, useParams } from "react-router";

import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import {
  type CamadaExplorador,
  COLUNAS_IDENTIFICADORAS,
  type Explorador,
  NOME_FORMA,
  acharNoExplorador,
  formaDe,
  useExplorador,
} from "../explorador";
import { inteiro } from "../formatos";
import "./camadas.css";

const textoRegistros = (c: CamadaExplorador) =>
  typeof c.registros === "number" ? inteiro(c.registros) : c.registros;

function Ligacoes({ c, exp }: { c: CamadaExplorador; exp: Explorador }) {
  const saem = c.colunas.flatMap((col) =>
    (col.liga_a ?? []).filter((alvo) => alvo !== c.nome).map((alvo) => ({ campo: col.campo, alvo })),
  );
  const chegam = c.ligada_por;
  if (!saem.length && !chegam.length) {
    return <p className="nota">Esta camada não se liga a outras por colunas do tipo "Vinculado".</p>;
  }
  const existe = (nome: string) => Boolean(acharNoExplorador(exp, nome));
  return (
    <div className="hub">
      <div className="hub-lado">
        <p className="hub-titulo">Apontam para ela ({chegam.length})</p>
        <ul>
          {chegam.map((l) => (
            <li key={`${l.camada}.${l.campo}`}>
              {existe(l.camada) ? <Link to={`/camadas/${l.camada}`}>{l.camada}</Link> : <span>{l.camada}</span>}
              <code>.{l.campo}</code>
            </li>
          ))}
        </ul>
      </div>
      <div className="hub-centro" aria-hidden="true">
        <span className={`hub-no forma-borda-${formaDe(c.geometria)}`}>{c.nome}</span>
      </div>
      <div className="hub-lado">
        <p className="hub-titulo">Ela aponta para ({saem.length})</p>
        <ul>
          {saem.map(({ campo, alvo }) => (
            <li key={`${campo}-${alvo}`}>
              <code>{campo}</code>
              <span aria-hidden="true">→</span>
              {existe(alvo) ? <Link to={`/camadas/${alvo}`}>{alvo}</Link> : <span>{alvo}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Colunas({ c }: { c: CamadaExplorador }) {
  const [termo, setTermo] = useState("");
  const t = termo.toUpperCase();
  const colunas = c.colunas.filter(
    (col) => !t || col.campo.toUpperCase().includes(t) || col.descricao.toUpperCase().includes(t),
  );
  const deUnidades = c.grupo === "Usuário";
  return (
    <>
      <input
        type="search"
        className="explorador-busca"
        placeholder={`Procure entre as ${c.colunas.length} colunas`}
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        aria-label="Procurar coluna"
      />
      <div className="tabela-rolavel">
        <table className="tabela-colunas">
          <thead>
            <tr>
              <th>Coluna</th>
              <th>O que guarda</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {colunas.map((col) => (
              <tr key={col.campo} className={col.no_arquivo ? undefined : "fora-do-arquivo"}>
                <td>
                  <code>{col.campo}</code>
                </td>
                <td>
                  {col.descricao}{" "}
                  <span className="coluna-selos">
                    {!col.no_arquivo && <span className="selo selo-talvez">só no Manual</span>}
                    {deUnidades && COLUNAS_IDENTIFICADORAS.has(col.campo) && (
                      <span className="selo selo-neutro">identifica a unidade</span>
                    )}
                  </span>
                </td>
                <td>
                  <span className="coluna-tipo">{col.tipo}</span>
                  {col.liga_a && (
                    <span className="coluna-detalhe">
                      liga a{" "}
                      {col.liga_a.map((alvo, i) => (
                        <span key={alvo}>
                          {i > 0 && ", "}
                          <Link to={`/camadas/${alvo}`}>{alvo}</Link>
                        </span>
                      ))}
                    </span>
                  )}
                  {col.dominio && <span className="coluna-detalhe">códigos {col.dominio}</span>}
                  <span className="coluna-detalhe">
                    <Fonte de="manual" onde={`p. ${col.pagina}`} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {c.colunas_so_no_arquivo.length > 0 && (
        <p className="nota">
          No arquivo, mas não no Manual: {c.colunas_so_no_arquivo.map((x) => <code key={x}>{x} </code>)}
          <Fonte de="arquivo" onde={`camada ${c.nome}`} />
        </p>
      )}
      {deUnidades && (
        <p className="nota">
          Colunas marcadas como "identifica a unidade" servem só para somar e ligar camadas: este site nunca mostra
          valores delas.
        </p>
      )}
    </>
  );
}

export default function Camada() {
  const { sigla = "" } = useParams();
  const exp = useExplorador();

  if (!exp) return <p className="nota">Carregando a camada…</p>;

  const c = acharNoExplorador(exp, sigla);
  if (!c) {
    return (
      <section>
        <h1>Camada não encontrada</h1>
        <p>
          O arquivo não tem uma camada chamada <code>{sigla}</code>. Veja a lista em <Link to="/camadas">Camadas</Link>.
        </p>
      </section>
    );
  }

  const forma = formaDe(c.geometria);
  const irmas = exp.grupos.find((g) => g.nome === c.grupo)!.camadas;
  const pos = irmas.indexOf(c.nome);
  const anterior = irmas[pos - 1];
  const proxima = irmas[pos + 1];

  return (
    <article className="pagina-visual camada-pagina" key={c.nome}>
      <p className="trilha">
        <Link to="/camadas">Camadas</Link> / {c.grupo} / {c.nome}
      </p>

      <header className={`camada-topo forma-borda-${c.vazia ? "vazia" : forma}`}>
        <div>
          <p className="camada-sigla">
            <code>{c.nome}</code>
          </p>
          <h1>{c.nome_oficial}</h1>
          <p className="camada-selos">
            <span className="selo selo-neutro">{c.grupo}</span>
            {c.tipo === "geografica" ? (
              <span className="selo selo-ok">Com desenho · {NOME_FORMA[forma]}</span>
            ) : (
              <span className="selo selo-neutro">Ficha sem desenho</span>
            )}
          </p>
        </div>
        <div className="camada-numero">
          <strong>{textoRegistros(c)}</strong>
          <span>
            registros na {exp.distribuidora} <Fonte de="arquivo" onde={`camada ${c.nome}`} />
          </span>
        </div>
      </header>

      <p className="lide camada-descricao">
        {c.descricao} <Fonte de="manual" onde={`Seção 2, p. ${c.pagina_lista}`} />
      </p>
      <p className="nota">
        Ficha completa da entidade no Manual: Anexo I, a partir da p. {c.pagina_entidade}{" "}
        <Fonte de="manual" onde={`Anexo I, p. ${c.pagina_entidade}`} />.
      </p>

      {c.vazia && (
        <p className="aviso camada-vazia">
          Esta camada veio <strong>vazia</strong> no arquivo da {exp.distribuidora}
          {c.vazia_em_todas_as_comparadas
            ? `, e também nas outras ${exp.distribuidoras_comparadas - 1} distribuidoras comparadas na escolha da distribuidora de estudo: nenhuma delas declarou registros nesta camada.`
            : ". A estrutura existe no modelo, mas a distribuidora não declarou nenhum registro."}
        </p>
      )}

      <section className="bloco-visual">
        <h2>Com quem ela se liga</h2>
        <Ligacoes c={c} exp={exp} />
      </section>

      <section className="bloco-visual">
        <h2>As colunas</h2>
        <Colunas c={c} />
      </section>

      <nav className="camada-navegacao" aria-label="Outras camadas do grupo">
        {anterior ? <Link to={`/camadas/${anterior}`}>← {anterior}</Link> : <span />}
        {proxima ? <Link to={`/camadas/${proxima}`}>{proxima} →</Link> : <span />}
      </nav>

      <ListaDeFontes fontes={["manual", "arquivo"]} />
    </article>
  );
}
