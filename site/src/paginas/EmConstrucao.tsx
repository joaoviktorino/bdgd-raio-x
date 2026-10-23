import { type Secao, URL_REPOSITORIO } from "../secoes";

/** Página provisória de uma seção, com link para a issue que vai construí-la. */
export default function EmConstrucao({ secao }: { secao: Secao }) {
  return (
    <section>
      <h1>{secao.titulo}</h1>
      <p>{secao.resumo}</p>
      <p className="aviso">
        Em construção. Acompanhe na{" "}
        <a href={`${URL_REPOSITORIO}/issues/${secao.issue}`}>issue #{secao.issue}</a>.
      </p>
    </section>
  );
}
