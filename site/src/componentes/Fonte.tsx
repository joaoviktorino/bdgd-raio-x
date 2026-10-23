import { type ChaveReferencia, REFERENCIAS } from "../referencias";

/** Etiqueta de fonte ao lado de uma afirmação, ex.: [Módulo 10, item 41.2]. */
export function Fonte({ de, onde }: { de: ChaveReferencia; onde?: string }) {
  const ref = REFERENCIAS[de];
  return (
    <a className="fonte" href={ref.url} title={ref.titulo}>
      [{ref.curto}
      {onde ? `, ${onde}` : ""}]
    </a>
  );
}

/** Lista completa das fontes usadas numa página. */
export function ListaDeFontes({ fontes }: { fontes: ChaveReferencia[] }) {
  return (
    <section className="fontes">
      <h2>Fontes</h2>
      <ul>
        {fontes.map((chave) => (
          <li key={chave}>
            <a href={REFERENCIAS[chave].url}>{REFERENCIAS[chave].titulo}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
