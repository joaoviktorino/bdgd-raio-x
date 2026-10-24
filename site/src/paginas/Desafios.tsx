import { useEffect, useState } from "react";
import { Link } from "react-router";

import Icone from "../componentes/Icone";
import { apagarPlacar, EVENTO, lerPlacar } from "../placar";
import { SECOES } from "../secoes";
import "./desafios.css";

const COM_TESTE = SECOES.filter((s) => s.pronta && s.teste);

/** Anel de progresso (0 a 1). */
function Anel({ fracao, rotulo }: { fracao: number; rotulo: string }) {
  const r = 52;
  const volta = 2 * Math.PI * r;
  return (
    <svg className="desafios-anel" viewBox="0 0 128 128" role="img" aria-label={rotulo}>
      <circle className="desafios-anel-trilho" cx="64" cy="64" r={r} />
      <circle
        className="desafios-anel-valor"
        cx="64"
        cy="64"
        r={r}
        strokeDasharray={`${volta * fracao} ${volta}`}
        transform="rotate(-90 64 64)"
      />
      <text x="64" y="70">
        {Math.round(fracao * 100)}%
      </text>
    </svg>
  );
}

export default function Desafios() {
  const [placar, setPlacar] = useState(lerPlacar);

  // Atualiza quando um teste termina nesta aba ou em outra.
  useEffect(() => {
    const atualizar = () => setPlacar(lerPlacar());
    window.addEventListener(EVENTO, atualizar);
    window.addEventListener("storage", atualizar);
    return () => {
      window.removeEventListener(EVENTO, atualizar);
      window.removeEventListener("storage", atualizar);
    };
  }, []);

  const feitos = COM_TESTE.filter((s) => placar[s.caminho]);
  const gabaritados = feitos.filter((s) => placar[s.caminho].melhor === placar[s.caminho].total);

  return (
    <article className="pagina-visual desafios">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Desafios</p>
        <h1>Seu progresso nos testes</h1>
        <p className="lide">
          Cada página termina com um teste. Aqui fica a sua melhor marca em cada um, guardada só neste navegador: sem conta,
          sem servidor, e ninguém mais vê.
        </p>
      </header>

      <section className="desafios-resumo">
        <Anel fracao={feitos.length / COM_TESTE.length} rotulo={`${feitos.length} de ${COM_TESTE.length} testes feitos`} />
        <div>
          <p className="desafios-resumo-numero">
            {feitos.length} de {COM_TESTE.length} testes feitos
          </p>
          <p>
            {gabaritados.length > 0
              ? `${gabaritados.length} gabaritado${gabaritados.length > 1 ? "s" : ""}.`
              : "Nenhum gabaritado ainda."}
          </p>
        </div>
      </section>

      <ul className="desafios-lista">
        {COM_TESTE.map((s) => {
          const r = placar[s.caminho];
          const fracao = r ? r.melhor / r.total : 0;
          return (
            <li key={s.caminho} className={r ? (fracao === 1 ? "gabaritado" : "feito") : "pendente"}>
              <span className="desafios-icone">
                <Icone nome={s.icone} />
              </span>
              <div className="desafios-texto">
                <p className="desafios-titulo">{s.titulo}</p>
                <div className="desafios-barra" aria-hidden="true">
                  <span style={{ width: `${fracao * 100}%` }} />
                </div>
                <p className="desafios-marca">
                  {r ? `Melhor: ${r.melhor} de ${r.total} · ${r.vezes} ${r.vezes > 1 ? "vezes" : "vez"}` : "Ainda não feito"}
                </p>
              </div>
              <Link className="botao-secundario" to={`/${s.caminho}`}>
                {r ? "Refazer" : "Fazer o teste"}
              </Link>
            </li>
          );
        })}
      </ul>

      {feitos.length > 0 && (
        <p className="desafios-apagar">
          <button type="button" className="botao-secundario" onClick={apagarPlacar}>
            Apagar meu placar
          </button>
        </p>
      )}
    </article>
  );
}
