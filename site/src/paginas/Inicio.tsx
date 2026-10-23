import { Link } from "react-router";

import { arquivo, catalogo, dataBR } from "../dados";
import { SECOES } from "../secoes";

export default function Inicio() {
  return (
    <>
      <section className="abertura">
        <h1>Entenda a BDGD com dados reais</h1>
        <p>
          A Base de Dados Geográfica da Distribuidora (BDGD) é o retrato que cada distribuidora de
          energia envia à ANEEL todo ano: rede, equipamentos, consumidores e geração distribuída.
          Este site explica o que há dentro dela usando o arquivo de uma distribuidora pequena, a{" "}
          {arquivo.distribuidora}, com data de referência {dataBR(arquivo.partes_do_nome.data_referencia)}.
        </p>
        <p className="destaque">
          O arquivo tem <strong>{catalogo.total_camadas} camadas</strong>. Cada número mostrado aqui
          diz de qual camada e coluna veio.
        </p>
      </section>

      <ul className="cartoes">
        {SECOES.map((secao) => (
          <li key={secao.caminho}>
            <Link to={`/${secao.caminho}`} className="cartao">
              <h2>{secao.titulo}</h2>
              <p>{secao.resumo}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
