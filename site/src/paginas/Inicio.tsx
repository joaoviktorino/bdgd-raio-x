import { Link } from "react-router";

import Contador from "../componentes/Contador";
import { Fonte } from "../componentes/Fonte";
import Icone from "../componentes/Icone";
import { acharCamada, arquivo, catalogo, dataBR, registrosNumero } from "../dados";
import { SECOES } from "../secoes";
import "./inicio.css";

const registros = (sigla: string) => registrosNumero(acharCamada(sigla));

const NUMEROS = [
  { valor: catalogo.total_camadas, rotulo: "camadas no arquivo", camada: undefined },
  { valor: registros("UCBT"), rotulo: "unidades consumidoras de baixa tensão", camada: "UCBT_tab" },
  { valor: registros("SSDMT"), rotulo: "trechos de rede de média tensão", camada: "SSDMT" },
  { valor: registros("UGBT"), rotulo: "unidades geradoras de baixa tensão", camada: "UGBT_tab" },
];

// Linhas decorativas do topo: uma rede estilizada com "energia" correndo.
const LINHAS_FUNDO = [
  "M-20 180 C 120 160, 200 60, 340 80 S 560 200, 720 120 S 900 40, 1040 70",
  "M-20 240 C 150 230, 260 150, 420 170 S 640 260, 800 210 S 960 150, 1040 170",
  "M-20 120 C 90 110, 180 30, 300 30 S 520 110, 660 60 S 880 10, 1040 20",
];

export default function Inicio() {
  return (
    <div className="pagina-visual inicio">
      <section className="heroi">
        <svg className="heroi-fundo" viewBox="0 0 1020 280" preserveAspectRatio="none" aria-hidden="true">
          {LINHAS_FUNDO.map((d, i) => (
            <g key={i}>
              <path className="fio" d={d} />
              <path className="energia" d={d} pathLength={1000} style={{ ["--i" as string]: i }} />
            </g>
          ))}
        </svg>
        <div className="heroi-texto">
          <p className="sobretitulo">BDGD Raio-X</p>
          <h1>Entenda a BDGD olhando para uma rede de verdade</h1>
          <p className="lide">
            A base que cada distribuidora entrega à ANEEL, explicada com o arquivo da {arquivo.distribuidora},
            referência {dataBR(arquivo.partes_do_nome.data_referencia)}. Cada número diz de onde veio.
          </p>
          <Link to="/o-que-e-bdgd" className="botao-principal heroi-botao">
            Começar pela BDGD →
          </Link>
        </div>
      </section>

      <ul className="numeros">
        {NUMEROS.map((n) => (
          <li key={n.rotulo}>
            <strong>
              <Contador valor={n.valor} />
            </strong>
            <span>{n.rotulo}</span>
            <small>
              <Fonte de="arquivo" onde={n.camada ? `camada ${n.camada}` : "catálogo de camadas"} />
            </small>
          </li>
        ))}
      </ul>

      <section className="jornada">
        <h2>A jornada</h2>
        <ol className="etapas">
          {SECOES.map((secao, i) => (
            <li key={secao.caminho} style={{ ["--i" as string]: i }}>
              <Link to={`/${secao.caminho}`} className={`etapa ${secao.pronta ? "pronta" : "futura"}`}>
                <span className="etapa-indice">{String(i + 1).padStart(2, "0")}</span>
                <Icone nome={secao.icone} />
                <h3>{secao.titulo}</h3>
                <p>{secao.resumo}</p>
                <span className="etapa-selos">
                  {secao.pronta ? (
                    <span className="selo selo-ok">pronta</span>
                  ) : (
                    <span className="selo selo-neutro">em construção</span>
                  )}
                  {secao.teste && <span className="selo selo-talvez">com teste</span>}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
