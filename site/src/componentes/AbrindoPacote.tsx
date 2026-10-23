import { useEffect, useState } from "react";
import { Link } from "react-router";

import { arquivo, catalogo } from "../dados";
import { inteiro, megabytes } from "../formatos";
import { Fonte } from "./Fonte";
import { preferePoucoMovimento, useVisivel } from "./useVisivel";

// Forma de cada camada, pela geometria no arquivo.
function forma(geometria: string): "ponto" | "linha" | "poligono" | "tabela" {
  if (geometria.includes("Point")) return "ponto";
  if (geometria.includes("Line")) return "linha";
  if (geometria.includes("Polygon")) return "poligono";
  return "tabela";
}

const NOMES_FORMA = { ponto: "Ponto", linha: "Linha", poligono: "Polígono", tabela: "Tabela" };

// Cores dos arquivos internos, por extensão (as demais ficam neutras).
const EXTENSOES_DESTACADAS = [".gdbtable", ".gdbtablx", ".gdbindexes"];

/** Etapas: 0 = zip fechado, 1 = arquivos internos, 2 = camadas. */
export default function AbrindoPacote() {
  const { ref, visivel } = useVisivel<HTMLDivElement>();
  const [etapa, setEtapa] = useState(preferePoucoMovimento() ? 2 : -1);
  const [rodada, setRodada] = useState(0);
  const zip = arquivo.conteudo_zip;

  useEffect(() => {
    if (!visivel || preferePoucoMovimento()) return;
    setEtapa(0);
    const tempos = [setTimeout(() => setEtapa(1), 900), setTimeout(() => setEtapa(2), 3000)];
    return () => tempos.forEach(clearTimeout);
  }, [visivel, rodada]);

  // Um quadradinho por arquivo interno, na ordem das extensões.
  const arquivosInternos = Object.entries(zip.arquivos_por_extensao).flatMap(([ext, n]) =>
    Array.from({ length: n }, () => ext),
  );

  const maior = Math.max(...catalogo.camadas.map((c) => c.registros));
  const camadas = [...catalogo.camadas].sort((a, b) => b.registros - a.registros);
  const porForma = camadas.reduce<Record<string, number>>((acc, c) => {
    const f = c.registros === 0 ? "vazia" : forma(c.geometria);
    acc[f] = (acc[f] ?? 0) + 1;
    return acc;
  }, {});
  const tabelasInternas = (zip.arquivos_por_extensao[".gdbtable"] ?? 0) - catalogo.total_camadas;

  return (
    <div ref={ref} className={`pacote etapa-${etapa}`}>
      <ol className="pacote-etapas">
        <li className="pacote-etapa etapa-zip">
          <div className="caixa-zip" aria-hidden="true">
            <span className="tampa" />
            <span className="corpo">ZIP</span>
          </div>
          <p className="etapa-numero">{megabytes(arquivo.tamanho_bytes)}</p>
          <p className="etapa-legenda">o arquivo baixado</p>
        </li>

        <li className="pacote-etapa etapa-arquivos">
          <div className="pasta-gdb" aria-hidden="true">
            {arquivosInternos.map((ext, i) => (
              <span
                key={i}
                className={`arquivo-interno ${EXTENSOES_DESTACADAS.includes(ext) ? `ext-${ext.slice(1)}` : "ext-outra"}`}
                style={{ ["--i" as string]: i }}
              />
            ))}
          </div>
          <p className="etapa-numero">
            {inteiro(zip.arquivos)} arquivos · {megabytes(zip.tamanho_descompactado_bytes)}
          </p>
          <p className="etapa-legenda">
            dentro, uma pasta <code>.gdb</code> <Fonte de="arquivo" />
          </p>
          <ul className="legenda-ext">
            {Object.entries(zip.arquivos_por_extensao).map(([ext, n]) => (
              <li key={ext}>
                <span className={`marcador ${EXTENSOES_DESTACADAS.includes(ext) ? `ext-${ext.slice(1)}` : "ext-outra"}`} />
                <code>{ext}</code> {n}
              </li>
            ))}
          </ul>
        </li>

        <li className="pacote-etapa etapa-camadas">
          <div className="mosaico">
            {camadas.map((c, i) => {
              const lado = c.registros === 0 ? 14 : 18 + 58 * Math.sqrt(c.registros / maior);
              return (
                <Link
                  key={c.nome}
                  to={`/camadas/${c.nome}`}
                  className={`bloco forma-${c.registros === 0 ? "vazia" : forma(c.geometria)}`}
                  style={{ ["--lado" as string]: `${lado}px`, ["--i" as string]: i }}
                  title={`${c.nome}: ${inteiro(c.registros)} registros`}
                  aria-label={`${c.nome}, ${inteiro(c.registros)} registros`}
                />
              );
            })}
          </div>
          <p className="etapa-numero">{catalogo.total_camadas} camadas</p>
          <p className="etapa-legenda">
            o que um programa de SIG enxerga <Fonte de="arquivo" onde="catálogo de camadas" />
          </p>
          <ul className="legenda-formas">
            {(["ponto", "linha", "poligono", "tabela", "vazia"] as const).map((f) => (
              <li key={f}>
                <span className={`marcador forma-${f}`} />
                {f === "vazia" ? "Vazia" : NOMES_FORMA[f]} {porForma[f] ?? 0}
              </li>
            ))}
          </ul>
        </li>
      </ol>

      <p className="nota">
        Cada bloco é uma camada, com área proporcional ao número de registros; passe o mouse para ver o nome e
        clique para abrir. São {zip.arquivos_por_extensao[".gdbtable"]} arquivos <code>.gdbtable</code> para{" "}
        {catalogo.total_camadas} camadas: pela conta, {tabelasInternas} tabelas são internas do próprio formato e
        não aparecem como camada (leitura nossa).
      </p>

      {!preferePoucoMovimento() && (
        <button type="button" className="botao-secundario" onClick={() => setRodada((r) => r + 1)}>
          Rever a animação
        </button>
      )}
    </div>
  );
}
