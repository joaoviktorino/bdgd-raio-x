import { useMemo, useState } from "react";
import { Link } from "react-router";

import FioLigacao from "../componentes/FioLigacao";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { acharCamada, catalogo, registrosNumero } from "../dados";
import { type CamadaExplorador, formaDe, NOME_FORMA, useExplorador } from "../explorador";
import { inteiro } from "../formatos";
import "./camadas.css";

type Filtro = "todas" | "geograficas" | "fichas" | "vazias";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "geograficas", rotulo: "Com desenho" },
  { id: "fichas", rotulo: "Fichas (sem desenho)" },
  { id: "vazias", rotulo: "Vazias" },
];

// Uma frase por grupo, para situar quem lê (os grupos são os da Seção 2 do Manual).
const SOBRE_GRUPO: Record<string, string> = {
  "Áreas de Interesse": "Os contornos: área de atuação, conjuntos e subestações.",
  Rede: "Os caminhos da energia: trechos de rede, postes, circuitos e ramais.",
  Equipamento: "O que está instalado na rede: transformadores, chaves, reguladores, medidores.",
  Usuário: "Quem consome e quem gera, sempre somados neste site.",
  Energia: "Balanços, perdas e curvas de carga.",
  "Metadado BDGD": "A ficha do próprio envio.",
};

const n = (sigla: string) => registrosNumero(acharCamada(sigla));

/** Registros para calcular; uma camada mascarada ("menos de 3") conta como 1. */
const quantidade = (c: CamadaExplorador) => (typeof c.registros === "number" ? c.registros : 1);

function perguntas(): Pergunta[] {
  const vazias = catalogo.camadas_vazias;
  const opcoesVazias = [...new Set([0, vazias, vazias + 5, 20])].sort((a, b) => a - b);
  return [
    {
      id: "onde-potencia-gd",
      tipo: "escolha",
      enunciado: "Em qual camada fica a potência instalada de uma geração distribuída em baixa tensão?",
      opcoes: ["UNTRMT", "UGBT_tab", "CTMT", "UCBT_tab"],
      certa: 1,
      explicacao: (
        <p>
          Na <code>UGBT_tab</code>, coluna <code>POT_INST</code>, em kW <Fonte de="manual" onde="Anexo I, UGBT, p. 61" />.
        </p>
      ),
    },
    {
      id: "coluna-alimentador",
      tipo: "escolha",
      enunciado: "Qual coluna da UCBT liga a unidade consumidora ao seu alimentador?",
      opcoes: ["SUB", "UNI_TR_MT", "CTMT", "PAC"],
      certa: 2,
      explicacao: (
        <p>
          A coluna <code>CTMT</code> guarda o código do circuito de média tensão, o alimentador. A{" "}
          <code>UNI_TR_MT</code> liga ao transformador <Fonte de="manual" onde="Anexo I, UCBT, p. 43" />.
        </p>
      ),
    },
    {
      id: "estimar-alimentadores",
      tipo: "estimativa",
      enunciado: `Chute: quantos alimentadores (circuitos de média tensão) a distribuidora tem?`,
      valor: n("CTMT"),
      min: 1,
      max: 1000,
      unidade: "alimentadores",
      explicacao: (
        <p>
          São {inteiro(n("CTMT"))} registros na <code>CTMT</code> <Fonte de="arquivo" onde="camada CTMT" />. Cada um
          sai de uma subestação e se espalha em milhares de trechos de rede.
        </p>
      ),
    },
    {
      id: "liga-ou-valor",
      tipo: "classificar",
      enunciado: "Estas colunas ligam a outra camada ou guardam um valor próprio?",
      grupos: ["Liga a outra camada", "Valor próprio"],
      itens: [
        { rotulo: "UCBT.CTMT", grupo: 0 },
        { rotulo: "UGBT.POT_INST", grupo: 1 },
        { rotulo: "UNTRMT.CTMT", grupo: 0 },
        { rotulo: "SSDMT.COMP", grupo: 1 },
        { rotulo: "UCBT.UNI_TR_MT", grupo: 0 },
        { rotulo: "UNTRMT.POT_NOM", grupo: 1 },
      ],
      explicacao: (
        <p>
          As que ligam são do tipo "Vinculado": guardam o código de outra camada. <code>POT_INST</code> (kW),{" "}
          <code>COMP</code> (m) e o <code>POT_NOM</code> da UNTRMT (kVA) são números próprios{" "}
          <Fonte de="manual" onde="Anexo I, p. 43, 61, 82 e 104" />.
        </p>
      ),
    },
    {
      id: "estimar-transformadores",
      tipo: "estimativa",
      enunciado: `Chute: quantos transformadores de média para baixa tensão a distribuidora tem?`,
      valor: n("UNTRMT"),
      min: 10,
      max: 100_000,
      unidade: "transformadores",
      explicacao: (
        <p>
          São {inteiro(n("UNTRMT"))} registros na <code>UNTRMT</code> <Fonte de="arquivo" onde="camada UNTRMT" />, em
          média {inteiro(Math.round(n("UCBT") / n("UNTRMT")))} unidades consumidoras de baixa tensão por transformador.
        </p>
      ),
    },
    {
      id: "quantas-vazias",
      tipo: "escolha",
      enunciado: `Das ${catalogo.total_camadas} camadas do arquivo, quantas estão vazias?`,
      opcoes: opcoesVazias.map(String),
      certa: opcoesVazias.indexOf(vazias),
      explicacao: (
        <p>
          São {vazias} <Fonte de="arquivo" onde="catálogo de camadas" />. Use o filtro "Vazias", acima, para ver quais
          são e se também vieram vazias nas outras distribuidoras comparadas.
        </p>
      ),
    },
  ];
}

function combina(c: CamadaExplorador, termo: string): { ok: boolean; colunas: string[] } {
  if (!termo) return { ok: true, colunas: [] };
  const t = termo.toUpperCase();
  const colunas = c.colunas.filter((col) => col.campo.toUpperCase().includes(t)).map((col) => col.campo);
  const ok =
    c.nome.toUpperCase().includes(t) || c.nome_oficial.toUpperCase().includes(t) || colunas.length > 0;
  return { ok, colunas: colunas.slice(0, 3) };
}

function passaFiltro(c: CamadaExplorador, f: Filtro) {
  if (f === "geograficas") return c.tipo === "geografica";
  if (f === "fichas") return c.tipo === "nao_geografica";
  if (f === "vazias") return c.vazia;
  return true;
}

export default function Camadas() {
  const exp = useExplorador();
  const [termo, setTermo] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const PERGUNTAS = useMemo(perguntas, []);

  const maior = exp ? Math.max(...exp.camadas.map(quantidade)) : 1;
  const comprimento = (c: CamadaExplorador) => {
    const v = quantidade(c);
    return v === 0 ? 0 : Math.max(0.04, Math.log10(v + 1) / Math.log10(maior + 1));
  };

  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Camadas</p>
        <h1>
          As {catalogo.total_camadas} camadas do arquivo, por família
        </h1>
        <p className="lide">
          Cada camada é uma entidade do modelo da BDGD <Fonte de="manual" onde="Seção 2, item 2.4" />. Procure por
          nome ou coluna, e abra qualquer uma para ver o que ela guarda e com quem se liga.
        </p>
      </header>

      {!exp ? (
        <p className="nota">Carregando as camadas…</p>
      ) : (
        <>
          <section className="bloco-visual">
            <h2>O fio que liga tudo</h2>
            <p className="lide">
              Da subestação ao consumidor, cada camada guarda o código da anterior. É assim que se soma consumidor por
              alimentador ou geração por transformador.
            </p>
            <FioLigacao exp={exp} />
          </section>

          <section className="bloco-visual">
            <h2>Todas as camadas</h2>
            <div className="explorador-controles">
              <input
                type="search"
                className="explorador-busca"
                placeholder="Procure camada ou coluna (ex.: POT_INST, transformador)"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                aria-label="Procurar camada ou coluna"
              />
              <div className="explorador-filtros" role="group" aria-label="Filtrar camadas">
                {FILTROS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className="chip"
                    aria-pressed={filtro === f.id}
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.rotulo}
                  </button>
                ))}
              </div>
            </div>

            {exp.grupos.map((g) => {
              const camadas = g.camadas
                .map((nome) => exp.camadas.find((c) => c.nome === nome)!)
                .filter((c) => passaFiltro(c, filtro))
                .map((c) => ({ c, busca: combina(c, termo) }))
                .filter(({ busca }) => busca.ok);
              if (!camadas.length) return null;
              return (
                <div key={g.nome} className="explorador-grupo">
                  <div className="explorador-grupo-topo">
                    <h3>{g.nome}</h3>
                    <span className="nota">
                      {camadas.length} de {g.camadas.length} · {SOBRE_GRUPO[g.nome]}
                    </span>
                  </div>
                  <ul className="explorador-cartoes">
                    {camadas.map(({ c, busca }, i) => {
                      const forma = formaDe(c.geometria);
                      return (
                        <li key={c.nome} style={{ ["--i" as string]: i }}>
                          <Link to={`/camadas/${c.nome}`} className={`camada-cartao ${c.vazia ? "vazia" : ""}`}>
                            <span className="camada-cartao-topo">
                              <span className={`marcador forma-${c.vazia ? "vazia" : forma}`} aria-hidden="true" />
                              <code>{c.nome}</code>
                              <span className="camada-forma">{NOME_FORMA[forma]}</span>
                            </span>
                            <span className="camada-nome">{c.nome_oficial}</span>
                            <span className="camada-barra" aria-hidden="true">
                              <span style={{ ["--comprimento" as string]: comprimento(c) }} className={`forma-${forma}`} />
                            </span>
                            <span className="camada-registros">
                              {c.vazia
                                ? c.vazia_em_todas_as_comparadas
                                  ? `vazia nas ${exp.distribuidoras_comparadas} comparadas`
                                  : "vazia"
                                : `${typeof c.registros === "number" ? inteiro(c.registros) : c.registros} registros`}
                            </span>
                            {busca.colunas.length > 0 && (
                              <span className="camada-achados">
                                {busca.colunas.map((col) => (
                                  <code key={col}>{col}</code>
                                ))}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <p className="nota">
              Grupos, nomes e descrições conforme o Manual <Fonte de="manual" onde="Seção 2, item 2.4, p. 8–12" />;
              registros do arquivo <Fonte de="arquivo" onde="catálogo de camadas" />. A barra usa escala logarítmica,
              para caber de 1 a dezenas de milhares.
            </p>
          </section>
        </>
      )}

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Onde está cada informação, e quem se liga a quem.</p>
        <Quiz id="camadas" titulo="Teste: camadas" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["manual", "arquivo"]} />
    </article>
  );
}
