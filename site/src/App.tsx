import { Link, NavLink, Outlet } from "react-router";

import { arquivo, dataBR } from "./dados";
import { SECOES, URL_REPOSITORIO } from "./secoes";

/** Moldura comum a todas as páginas: cabeçalho com menu, conteúdo e rodapé com a fonte. */
export default function App() {
  return (
    <div className="moldura">
      <header className="cabecalho">
        <Link to="/" className="marca">
          BDGD <span>Raio-X</span>
        </Link>
        <nav aria-label="Seções">
          <ul className="menu">
            {SECOES.map((secao) => (
              <li key={secao.caminho}>
                <NavLink to={`/${secao.caminho}`}>{secao.titulo}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="conteudo">
        <Outlet />
      </main>

      <footer className="rodape">
        <p>
          <strong>Fonte dos dados:</strong> {arquivo.fonte}, publicada pela ANEEL.
          Distribuidora {arquivo.distribuidora}, data de referência{" "}
          {dataBR(arquivo.partes_do_nome.data_referencia)}. Arquivo <code>{arquivo.arquivo}</code>.
        </p>
        <p>
          <strong>Licença dos dados:</strong>{" "}
          <a href="https://opendatacommons.org/licenses/odbl/1-0/">ODbL (Open Database License)</a>.
          Código e textos em <a href={URL_REPOSITORIO}>github.com/joaoviktorino/bdgd-raio-x</a>.
        </p>
      </footer>
    </div>
  );
}
