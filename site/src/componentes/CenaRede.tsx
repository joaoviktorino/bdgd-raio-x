import { type ReactNode, useState } from "react";
import { Link } from "react-router";

import { acharCamada, registrosTexto } from "../dados";
import { Fonte } from "./Fonte";
import { useVisivel } from "./useVisivel";

type Elemento = {
  sigla: string;
  apelido: string;
  nome: string; // nome oficial da entidade (Manual, Anexo I)
  tipo: "geografica" | "nao_geografica";
  forma?: "Ponto" | "Linha" | "Polígono";
  oQueE: ReactNode;
  nota?: ReactNode;
};

const ELEMENTOS: Elemento[] = [
  {
    sigla: "SSDAT",
    apelido: "Rede de alta tensão",
    nome: "Segmento de Rede Alta Tensão",
    tipo: "geografica",
    forma: "Linha",
    oQueE: (
      <>
        Os trechos da rede de alta tensão, que trazem a energia até a subestação{" "}
        <Fonte de="modulo10" onde="Tabela 3" />.
      </>
    ),
  },
  {
    sigla: "UCAT",
    apelido: "Indústria em alta tensão",
    nome: "Unidade Consumidora de Alta Tensão",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        Unidade consumidora ligada direto na alta tensão, como uma grande indústria{" "}
        <Fonte de="modulo10" onde="Tabela 1" />.
      </>
    ),
    nota: (
      <>
        Quando uma camada de unidades tem 1 ou 2 registros, este site mostra só "menos de 3", para não expor
        ninguém <Fonte de="arquivo" onde="camada UCAT_tab" />.
      </>
    ),
  },
  {
    sigla: "SUB",
    apelido: "Subestação",
    nome: "Subestação",
    tipo: "geografica",
    forma: "Polígono",
    oQueE: (
      <>
        A área do terreno ocupado pela subestação <Fonte de="modulo10" onde="Tabela 4" />.
      </>
    ),
  },
  {
    sigla: "UNTRAT",
    apelido: "Transformador da subestação",
    nome: "Unidade Transformadora de Alta Tensão",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        O transformador que baixa a alta tensão para a média. Dentro da subestação, a posição pode ser o ponto
        central dela <Fonte de="modulo10" onde="Tabela 2 e item 25" />.
      </>
    ),
  },
  {
    sigla: "SSDMT",
    apelido: "Rede de média tensão",
    nome: "Segmento de Rede Média Tensão",
    tipo: "geografica",
    forma: "Linha",
    oQueE: (
      <>
        Cada trecho de rede entre duas estruturas de suporte consecutivas, o vão{" "}
        <Fonte de="modulo10" onde="Tabela 3" />.
      </>
    ),
  },
  {
    sigla: "PONNOT",
    apelido: "Postes",
    nome: "Ponto Notável",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        As estruturas de suporte da rede <Fonte de="modulo10" onde="Tabela 3" />, como postes e torres, entre
        outros tipos de ponto <Fonte de="manual" onde="Anexo II, domínio TPONNOT, p. 161" />.
      </>
    ),
  },
  {
    sigla: "UNTRMT",
    apelido: "Transformador",
    nome: "Unidade Transformadora de Média Tensão",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        O local onde o transformador está instalado <Fonte de="modulo10" onde="Tabela 2" />.
      </>
    ),
  },
  {
    sigla: "SSDBT",
    apelido: "Rede de baixa tensão",
    nome: "Segmento de Rede de Baixa Tensão",
    tipo: "geografica",
    forma: "Linha",
    oQueE: (
      <>
        Os trechos de rede de baixa tensão, também entre estruturas de suporte{" "}
        <Fonte de="modulo10" onde="Tabela 3" />.
      </>
    ),
  },
  {
    sigla: "UCBT",
    apelido: "Consumidor",
    nome: "Unidade Consumidora de Baixa Tensão",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        A localização da unidade consumidora <Fonte de="modulo10" onde="Tabela 1" />.
      </>
    ),
    nota: (
      <>
        No Manual ela tem localização e logradouro <Fonte de="manual" onde="Anexo I, p. 42–43" />, mas no
        arquivo publicado vem como tabela, sem os dois <Fonte de="arquivo" onde="camada UCBT_tab" />. Aqui,
        consumidores só aparecem somados.
      </>
    ),
  },
  {
    sigla: "UGBT",
    apelido: "Geração no telhado",
    nome: "Unidade Geradora de Baixa Tensão",
    tipo: "geografica",
    forma: "Ponto",
    oQueE: (
      <>
        A localização da unidade geradora, como um sistema solar no telhado{" "}
        <Fonte de="modulo10" onde="Tabela 1" />.
      </>
    ),
    nota: (
      <>
        Também vem como tabela, sem localização, no arquivo publicado <Fonte de="arquivo" onde="camada UGBT_tab" />.
      </>
    ),
  },
  {
    sigla: "CTMT",
    apelido: "Ficha do alimentador",
    nome: "Circuito de Média Tensão",
    tipo: "nao_geografica",
    oQueE: (
      <>
        Os dados do circuito (o alimentador): tensão, energia e perdas <Fonte de="modulo10" onde="Tabela 7" />.
        Não tem desenho próprio: cada trecho de rede guarda o código do seu circuito{" "}
        <Fonte de="manual" onde="Anexo I, SSDMT, campo CTMT, p. 81" />.
      </>
    ),
  },
  {
    sigla: "EQTRMT",
    apelido: "Ficha do transformador",
    nome: "Equipamento Transformador de Média Tensão",
    tipo: "nao_geografica",
    oQueE: (
      <>
        Os dados técnicos do equipamento instalado no ponto do transformador. É o exemplo que o próprio
        Manual dá: a unidade transformadora (o ponto no mapa) é caracterizada pelo equipamento transformador
        (a ficha) <Fonte de="manual" onde="Seção 2, item 2.2, p. 8" />.
      </>
    ),
  },
];

// Posições dos postes e das casas no desenho.
const POSTES = [
  [210, 205], [295, 205], [470, 205], [600, 135], [770, 135],
  [220, 245], [330, 245], [640, 320], [740, 320],
];
const CASAS = [
  [325, 150], [435, 150], [645, 75], [755, 75], [505, 370], [615, 370],
];

/** Ilustração interativa de uma rede de distribuição, com a entidade da BDGD de cada elemento. */
export default function CenaRede() {
  const { ref, visivel } = useVisivel<HTMLDivElement>(0.3);
  const [ativo, setAtivo] = useState("UNTRMT");
  const elemento = ELEMENTOS.find((e) => e.sigla === ativo)!;
  const camada = acharCamada(elemento.sigla);

  const alvo = (sigla: string, extra = "") => ({
    className: `alvo ${extra} ${ativo === sigla ? "ativo" : ""}`,
    role: "button",
    tabIndex: 0,
    "aria-label": ELEMENTOS.find((e) => e.sigla === sigla)!.apelido,
    "aria-pressed": ativo === sigla,
    onClick: () => setAtivo(sigla),
    onKeyDown: (ev: React.KeyboardEvent) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        setAtivo(sigla);
      }
    },
  });

  return (
    <div ref={ref} className={`cena ${visivel ? "desenhando" : ""}`}>
      <div className="cena-desenho">
        <svg viewBox="0 0 840 400" role="group" aria-label="Rede de distribuição ilustrada">
          {/* fichas não geográficas e suas ligações */}
          <g {...alvo("CTMT", "alvo-ficha")}>
            <line className="ligacao" x1="235" y1="86" x2="250" y2="205" />
            <rect className="ficha" x="150" y="38" width="190" height="48" rx="8" />
            <text className="ficha-texto" x="245" y="60">CTMT</text>
            <text className="ficha-sub" x="245" y="76">ficha do alimentador</text>
          </g>
          <g {...alvo("EQTRMT", "alvo-ficha")}>
            <line className="ligacao" x1="700" y1="200" x2="700" y2="147" />
            <rect className="ficha" x="600" y="200" width="200" height="48" rx="8" />
            <text className="ficha-texto" x="700" y="222">EQTRMT</text>
            <text className="ficha-sub" x="700" y="238">ficha do transformador</text>
          </g>

          {/* rede de alta tensão chegando à subestação, com uma indústria ligada nela */}
          <g {...alvo("SSDAT")}>
            <path className="rede-at" pathLength={1} d="M83 0 V 176" />
            <path className="rede-at" pathLength={1} d="M83 78 H 46 V 102" />
            <path className="toque" d="M83 0 V 176 M83 78 H 46 V 102" />
          </g>
          <g {...alvo("UCAT")}>
            <g transform="translate(46 140)">
              <path className="industria" d="M-22 0 V-26 L-11 -18 V-26 L0 -18 V-38 H8 V-18 L18 -26 V0 Z" />
            </g>
          </g>

          {/* subestação e o transformador dentro dela */}
          <g {...alvo("SUB")}>
            <rect className="sub" x="24" y="176" width="118" height="96" rx="6" />
            <text className="rotulo-desenho" x="83" y="292">subestação</text>
          </g>
          <g {...alvo("UNTRAT")}>
            <circle className="sub-simbolo" cx="72" cy="224" r="13" />
            <circle className="sub-simbolo" cx="94" cy="224" r="13" />
          </g>

          {/* rede de média tensão (dois alimentadores) */}
          <g {...alvo("SSDMT")}>
            <path className="rede-mt" pathLength={1} d="M142 205 H 470 L 540 135 H 810" />
            <path className="rede-mt" pathLength={1} d="M142 245 H 420 L 490 320 H 800" />
            <path className="toque" d="M142 205 H 470 L 540 135 H 810 M142 245 H 420 L 490 320 H 800" />
          </g>

          {/* rede de baixa tensão */}
          <g {...alvo("SSDBT")}>
            <path className="rede-bt" pathLength={1} d="M380 205 V 150 M325 150 H 435" />
            <path className="rede-bt" pathLength={1} d="M700 135 V 75 M645 75 H 755" />
            <path className="rede-bt" pathLength={1} d="M560 320 V 370 M505 370 H 615" />
            <path className="toque" d="M380 205 V 150 M325 150 H 435 M700 135 V 75 M645 75 H 755 M560 320 V 370 M505 370 H 615" />
          </g>

          {/* postes */}
          <g {...alvo("PONNOT")}>
            {POSTES.map(([x, y], i) => (
              <rect key={i} className="poste" x={x - 4} y={y - 4} width="8" height="8" style={{ ["--i" as string]: i }} />
            ))}
          </g>

          {/* casas (unidades consumidoras) */}
          <g {...alvo("UCBT")}>
            {CASAS.map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`}>
                <path className="casa" d="M-13 0 V-15 L0 -27 L13 -15 V0 Z" style={{ ["--i" as string]: i }} />
              </g>
            ))}
          </g>

          {/* painel solar num telhado (unidade geradora) */}
          <g {...alvo("UGBT")}>
            <path className="solar" d="M745 52 L 758 45 L 768 52 L 755 59 Z" />
            <path className="solar-grade" d="M751 48.5 L761 55.5 M749.5 55 L762 48" />
          </g>

          {/* transformadores */}
          <g {...alvo("UNTRMT")}>
            {[[380, 205], [700, 135], [560, 320]].map(([x, y], i) => (
              <circle key={i} className="trafo" cx={x} cy={y} r="11" style={{ ["--i" as string]: i }} />
            ))}
          </g>
        </svg>

        <div className="cena-botoes" role="group" aria-label="Elementos da rede">
          {ELEMENTOS.map((e) => (
            <button
              key={e.sigla}
              type="button"
              className={`chip tipo-${e.tipo}`}
              aria-pressed={ativo === e.sigla}
              onClick={() => setAtivo(e.sigla)}
            >
              {e.apelido}
            </button>
          ))}
        </div>
      </div>

      <aside className="cena-painel" aria-live="polite" key={elemento.sigla}>
        <p className="cena-sigla">
          <code>{elemento.sigla}</code>
        </p>
        <h3>{elemento.nome}</h3>
        <p className="cena-selos">
          {elemento.tipo === "geografica" ? (
            <span className="selo selo-ok">Geográfica · {elemento.forma}</span>
          ) : (
            <span className="selo selo-neutro">Não geográfica · tabela</span>
          )}
        </p>
        <p>{elemento.oQueE}</p>
        {elemento.nota && <p className="nota">{elemento.nota}</p>}
        {camada && (
          <p className="cena-contagem">
            <strong>{registrosTexto(camada)}</strong> registros no arquivo{" "}
            <Fonte de="arquivo" onde={`camada ${camada.nome}`} />
            <br />
            <Link to={`/camadas/${camada.nome}`}>Ver a camada {camada.nome} →</Link>
          </p>
        )}
        <p className="nota">
          Nome da entidade conforme o Manual <Fonte de="manual" onde="Anexo I" />.
        </p>
      </aside>
    </div>
  );
}
