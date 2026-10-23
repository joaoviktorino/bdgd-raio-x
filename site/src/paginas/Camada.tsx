import { Link, useParams } from "react-router";

import { acharCamada, registrosTexto } from "../dados";
import { URL_REPOSITORIO } from "../secoes";

/** Página de uma camada (ex.: /camadas/UNTRMT). Por enquanto, só confirma que ela existe. */
export default function Camada() {
  const { sigla = "" } = useParams();
  const camada = acharCamada(sigla);

  if (!camada) {
    return (
      <section>
        <h1>Camada não encontrada</h1>
        <p>
          O arquivo não tem uma camada chamada <code>{sigla}</code>. Veja a lista em{" "}
          <Link to="/camadas">Camadas</Link>.
        </p>
      </section>
    );
  }

  return (
    <section>
      <p className="trilha">
        <Link to="/camadas">Camadas</Link> / {camada.nome}
      </p>
      <h1>{camada.nome}</h1>
      <p>
        {camada.geometria === "tabela" ? "Tabela sem geometria" : `Geometria: ${camada.geometria}`},{" "}
        {registrosTexto(camada)} registros, {camada.colunas.length} colunas.
      </p>
      <p className="aviso">
        A descrição completa desta camada está em construção na{" "}
        <a href={`${URL_REPOSITORIO}/issues/9`}>issue #9</a>.
      </p>
    </section>
  );
}
