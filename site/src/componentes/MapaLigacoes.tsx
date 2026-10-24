import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";

import { type CamadaExplorador, type Explorador, formaDe } from "../explorador";
import { inteiro } from "../formatos";
import { Fonte } from "./Fonte";

// Tamanho do canvas (unidades do SVG).
const L = 1880;
const A = 1120;

// Posição de cada entidade sobre o desenho (centro da etiqueta). É uma ilustração:
// as posições seguem o lugar físico de cada coisa, não coordenadas reais.
const POSICOES: Record<string, [number, number]> = {
  ARAT: [240, 132],
  CONJ: [1050, 172],
  // alta tensão
  UNREAT: [220, 482],
  UCAT: [300, 202],
  SSDAT: [380, 482],
  CTAT: [300, 562],
  UNCRAT: [460, 332],
  UGAT: [520, 694],
  UNSEAT: [590, 384],
  // subestação
  SUB: [705, 272],
  BAR: [880, 300],
  BAY: [742, 384],
  UNTRAT: [700, 452],
  EQTRAT: [905, 432],
  // média tensão
  CTMT: [1020, 542],
  SSDMT: [1112, 542],
  UNSEMT: [1060, 414],
  EQSE: [1060, 364],
  UNREMT: [1170, 414],
  EQRE: [1170, 364],
  UGMT: [1265, 232],
  UNCRMT: [1120, 712],
  EQCR: [1120, 764],
  UCMT: [1245, 802],
  EQTRM: [1360, 762],
  PONNOT: [1335, 542],
  SEGCON: [1180, 884],
  // transformação e baixa tensão
  UNTRMT: [1420, 402],
  EQTRMT: [1420, 342],
  UNSEBT: [1505, 414],
  SSDBT: [1608, 414],
  UNCRBT: [1772, 414],
  RAMLIG: [1515, 522],
  EQME: [1515, 600],
  UCBT: [1655, 668],
  UGBT: [1792, 546],
  PIP: [1565, 884],
  // fichas de energia e do envio
  BE: [330, 1052],
  EP: [480, 1052],
  PT: [630, 1052],
  PNT: [780, 1052],
  CRVCRG: [960, 1052],
  BASE: [1160, 1052],
};

const ZONAS = [
  { nome: "Transmissão", sub: "fora da BDGD", x0: 0, x1: 160 },
  { nome: "Alta tensão", x0: 160, x1: 640 },
  { nome: "Subestação", x0: 640, x1: 960 },
  { nome: "Média tensão", x0: 960, x1: 1380 },
  { nome: "Transformação", x0: 1380, x1: 1460 },
  { nome: "Baixa tensão", x0: 1460, x1: 1880 },
];

type Aresta = { de: string; para: string; campos: string[] };

function largura(c: CamadaExplorador) {
  const reg = typeof c.registros === "number" ? inteiro(c.registros) : c.registros;
  return Math.max(c.sigla.length * 9.2, reg.length * 6.2) + 22;
}

/** Curva levemente arqueada de A até B, parando antes da etiqueta de destino. */
function curva([x1, y1]: [number, number], [x2, y2]: [number, number]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.hypot(dx, dy) || 1;
  const recuo = Math.min(26, d / 3);
  const xf = x2 - (dx / d) * recuo;
  const yf = y2 - (dy / d) * recuo;
  const cx = (x1 + xf) / 2 - (dy / d) * d * 0.12;
  const cy = (y1 + yf) / 2 + (dx / d) * d * 0.12;
  return `M${x1} ${y1} Q${cx} ${cy} ${xf} ${yf}`;
}

/** Desenho de fundo: o sistema elétrico, da transmissão às casas. Só ilustração (sem dados). */
function Fundo() {
  const postes = (pts: [number, number][]) =>
    pts.map(([x, y], i) => <rect key={i} className="mf-poste" x={x - 3} y={y - 3} width="6" height="6" />);
  const casa = (x: number, y: number, solar = false) => (
    <g transform={`translate(${x} ${y})`}>
      <path className="mf-casa" d="M-20 0 V-24 L0 -42 L20 -24 V0 Z" />
      <rect className="mf-janela" x="-7" y="-18" width="14" height="10" />
      {solar && <path className="mf-solar" d="M2 -40 L18 -26 L24 -32 L8 -46 Z" />}
    </g>
  );
  const chave = (x: number, y: number) => (
    <g className="mf-simbolo" transform={`translate(${x} ${y})`}>
      <circle r="3" cx="-9" />
      <circle r="3" cx="9" />
      <path d="M-9 0 L7 -10" />
    </g>
  );
  const regulador = (x: number, y: number) => (
    <g className="mf-simbolo" transform={`translate(${x} ${y})`}>
      <circle r="11" />
      <path d="M-7 6 L7 -6 M3 -6 H7 V-2" />
    </g>
  );
  const capacitor = (x: number, y: number, para: "cima" | "baixo") => {
    const s = para === "cima" ? -1 : 1;
    return (
      <g className="mf-simbolo">
        <path d={`M${x} ${y} V${y + s * 22} M${x - 12} ${y + s * 22} H${x + 12} M${x - 12} ${y + s * 30} H${x + 12}`} />
      </g>
    );
  };
  const trafo = (x: number, y: number) => (
    <g className="mf-simbolo mf-trafo" transform={`translate(${x} ${y})`}>
      <circle r="13" cy="-8" />
      <circle r="13" cy="8" />
    </g>
  );

  // Caminho principal da energia (para a animação): torre → AT → subestação → alimentador A → trafo → BT.
  const principal =
    "M80 430 H660 V320 H800 V417 M800 443 V560 H960 V460 H1420 M1420 460 H1830";

  return (
    <g className="mapa-fundo" aria-hidden="true">
      {/* faixas das zonas */}
      {ZONAS.map((z, i) => (
        <g key={z.nome}>
          <rect className={`mf-zona ${i % 2 ? "par" : ""}`} x={z.x0} y={0} width={z.x1 - z.x0} height={980} />
          <text className="mf-zona-nome" x={(z.x0 + z.x1) / 2} y={44}>
            {z.nome}
          </text>
          {z.sub && (
            <text className="mf-zona-sub" x={(z.x0 + z.x1) / 2} y={64}>
              {z.sub}
            </text>
          )}
        </g>
      ))}

      {/* contornos: área de atuação e conjunto */}
      <rect className="mf-contorno" x={150} y={100} width={1715} height={860} rx={28} />
      <rect className="mf-contorno mf-conj" x={970} y={145} width={880} height={795} rx={24} />

      {/* transmissão: torre treliçada */}
      <path className="mf-torre" d="M60 520 L80 330 L100 520 M66 470 H94 M70 420 H90 M74 380 H86 M50 360 H110 M58 400 H102 M66 470 L90 420 M94 470 L70 420" />

      {/* alta tensão */}
      <path className="mf-at" d="M80 360 V430 H660" />
      {postes([[150, 430], [380, 430]])}
      {regulador(220, 430)}
      <path className="mf-at" d="M300 430 V300" />
      <path className="mf-industria" d="M262 300 V262 L280 274 V262 L298 274 V244 H312 V274 L338 258 V300 Z" />
      {capacitor(460, 430, "cima")}
      <path className="mf-at" d="M520 430 V600" />
      <path className="mf-usina" d="M490 650 V616 H550 V650 Z M498 650 C510 640 530 660 542 650" />
      {chave(590, 430)}

      {/* subestação: cerca, barramentos, bays e transformador AT/MT */}
      <rect className="mf-sub" x={640} y={240} width={300} height={400} rx={10} />
      <path className="mf-at" d="M660 430 V320" />
      <path className="mf-barra" d="M660 320 H920" />
      <path className="mf-bay" d="M742 320 V352 M860 320 V352" />
      <path className="mf-at" d="M800 320 V417" />
      {trafo(800, 430)}
      <path className="mf-mt" d="M800 443 V560" />
      <path className="mf-barra" d="M700 560 H940" />

      {/* média tensão: alimentador A (até o transformador de poste) e alimentador B */}
      <path className="mf-mt" d="M940 560 H960 V460 H1420" />
      <path className="mf-mt" d="M920 560 V620 H1300" />
      {postes([[1000, 460], [1110, 460], [1220, 460], [1335, 460], [1000, 620], [1180, 620], [1300, 620]])}
      {chave(1060, 460)}
      {regulador(1170, 460)}
      <path className="mf-mt" d="M1265 460 V320" />
      <g className="mf-fazenda-solar">
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${1222 + i * 30} 316 L${1246 + i * 30} 296 L${1262 + i * 30} 296 L${1238 + i * 30} 316 Z`} />
        ))}
      </g>
      {capacitor(1120, 620, "baixo")}
      <path className="mf-mt" d="M1245 620 V740" />
      <path className="mf-industria" d="M1212 772 V744 L1226 752 V744 L1240 752 V732 H1252 V752 L1278 742 V772 Z" />

      {/* transformador de poste MT/BT */}
      {trafo(1420, 460)}

      {/* baixa tensão: rede, ramais, casas, medidor, painel solar e iluminação pública */}
      <path className="mf-bt" d="M1433 460 H1830 M1640 460 V780 H1830" />
      {postes([[1505, 460], [1580, 460], [1700, 460], [1770, 460], [1640, 620], [1640, 780]])}
      {chave(1505, 460)}
      {capacitor(1772, 460, "baixo")}
      <path className="mf-ramal" d="M1580 460 L1580 560 M1720 460 L1720 560 M1770 780 L1770 850" />
      {casa(1580, 600)}
      <rect className="mf-medidor" x={1592} y={570} width={10} height={14} rx={2} />
      {casa(1720, 600, true)}
      {casa(1770, 890)}
      <path className="mf-poste-luz" d="M1600 780 V838 M1600 838 H1622" />
      <circle className="mf-luz" cx={1622} cy={843} r={5} />

      {/* energia correndo pelo caminho principal */}
      <path className="mf-energia" d={principal} pathLength={1000} />

      {/* faixa das fichas de energia e do envio */}
      <rect className="mf-faixa" x={150} y={995} width={1715} height={110} rx={18} />
      <text className="mf-faixa-nome" x={176} y={1022}>
        Fichas de energia, perdas e do envio (sem lugar no desenho)
      </text>
    </g>
  );
}

/** Canvas com todas as entidades e ligações sobre o desenho do sistema elétrico. */
export default function MapaLigacoes({ exp }: { exp: Explorador }) {
  const navegar = useNavigate();
  const caixa = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [foco, setFoco] = useState<string | null>(null);
  const arraste = useRef<{ x: number; y: number; sx: number; sy: number; moveu: boolean } | null>(null);
  const ultimoToque = useRef(false);

  const camadas = useMemo(() => exp.camadas.filter((c) => POSICOES[c.sigla]), [exp]);
  const porNome = useMemo(() => new Map(exp.camadas.map((c) => [c.nome, c])), [exp]);

  const arestas = useMemo(() => {
    const mapa = new Map<string, Aresta>();
    for (const c of camadas) {
      for (const col of c.colunas) {
        for (const alvo of col.liga_a ?? []) {
          const destino = porNome.get(alvo);
          if (!destino || destino.nome === c.nome || !POSICOES[destino.sigla]) continue;
          const chave = `${c.sigla}>${destino.sigla}`;
          const a = mapa.get(chave) ?? { de: c.sigla, para: destino.sigla, campos: [] };
          a.campos.push(col.campo);
          mapa.set(chave, a);
        }
      }
    }
    return [...mapa.values()];
  }, [camadas, porNome]);

  const vizinhos = useMemo(() => {
    if (!foco) return null;
    const s = new Set([foco]);
    arestas.forEach((a) => {
      if (a.de === foco) s.add(a.para);
      if (a.para === foco) s.add(a.de);
    });
    return s;
  }, [foco, arestas]);

  // Zoom inicial: cabe na largura, mas sem ficar ilegível (no celular, arrasta-se).
  const ajustar = () => {
    const w = caixa.current?.clientWidth ?? L;
    setZoom(Math.max(0.5, Math.min(1, w / L)));
  };
  useEffect(ajustar, []);

  const focado = foco ? camadas.find((c) => c.sigla === foco) : undefined;
  const saem = foco ? arestas.filter((a) => a.de === foco) : [];
  const chegam = foco ? arestas.filter((a) => a.para === foco) : [];

  function abrir(c: CamadaExplorador) {
    if (arraste.current?.moveu) return; // foi um arraste, não um clique
    // No toque, o primeiro toque só destaca; o segundo abre.
    if (ultimoToque.current && foco !== c.sigla) {
      setFoco(c.sigla);
      return;
    }
    navegar(`/camadas/${c.nome}`);
  }

  function comecarArraste(e: PointerEvent<HTMLDivElement>) {
    ultimoToque.current = e.pointerType === "touch";
    if (e.pointerType !== "mouse" || !caixa.current) return;
    arraste.current = { x: e.clientX, y: e.clientY, sx: caixa.current.scrollLeft, sy: caixa.current.scrollTop, moveu: false };
  }
  function moverArraste(e: PointerEvent<HTMLDivElement>) {
    const a = arraste.current;
    if (!a || !caixa.current) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) a.moveu = true;
    caixa.current.scrollLeft = a.sx - dx;
    caixa.current.scrollTop = a.sy - dy;
  }
  function terminarArraste() {
    // mantém "moveu" até o clique ser processado, depois limpa
    setTimeout(() => (arraste.current = null), 0);
  }

  return (
    <div className="mapa">
      <div className="mapa-controles" role="group" aria-label="Zoom do mapa">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))} aria-label="Diminuir">
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} aria-label="Aumentar">
          +
        </button>
        <button type="button" onClick={ajustar}>
          Ajustar
        </button>
        <span className="mapa-dica">Arraste para mover · passe o mouse numa entidade para ver as ligações</span>
      </div>

      <div
        ref={caixa}
        className={`mapa-caixa ${foco ? "com-foco" : ""}`}
        onPointerDown={comecarArraste}
        onPointerMove={moverArraste}
        onPointerUp={terminarArraste}
        onPointerLeave={terminarArraste}
      >
        <svg
          viewBox={`0 0 ${L} ${A}`}
          width={L * zoom}
          height={A * zoom}
          role="group"
          aria-label="Mapa de ligações entre as entidades da BDGD"
        >
          <defs>
            <marker id="mapa-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" className="mapa-seta" />
            </marker>
          </defs>

          <Fundo />

          <g className="mapa-arestas">
            {arestas.map((a) => {
              const ativa = foco && (a.de === foco || a.para === foco);
              return (
                <path
                  key={`${a.de}>${a.para}`}
                  className={`mapa-aresta ${ativa ? "ativa" : ""}`}
                  d={curva(POSICOES[a.de], POSICOES[a.para])}
                  markerEnd="url(#mapa-seta)"
                >
                  <title>{`${a.de}.${a.campos.join(", ")} → ${a.para}`}</title>
                </path>
              );
            })}
          </g>

          <g className="mapa-nos">
            {camadas.map((c) => {
              const [x, y] = POSICOES[c.sigla];
              const w = largura(c);
              const forma = c.vazia ? "vazia" : formaDe(c.geometria);
              const estado = vizinhos ? (c.sigla === foco ? "focado" : vizinhos.has(c.sigla) ? "vizinho" : "apagado") : "";
              return (
                <g
                  key={c.nome}
                  className={`mapa-no forma-${forma} ${c.tipo === "nao_geografica" ? "ficha" : ""} ${c.vazia ? "vazio" : ""} ${estado}`}
                  transform={`translate(${x} ${y})`}
                  role="link"
                  tabIndex={0}
                  aria-label={`${c.nome}, ${c.nome_oficial}. Abrir a camada.`}
                  onMouseEnter={() => setFoco(c.sigla)}
                  onMouseLeave={() => !ultimoToque.current && setFoco(null)}
                  onFocus={() => setFoco(c.sigla)}
                  onBlur={() => setFoco(null)}
                  onClick={() => abrir(c)}
                  onKeyDown={(ev) => ev.key === "Enter" && navegar(`/camadas/${c.nome}`)}
                >
                  <rect x={-w / 2} y={-19} width={w} height={38} rx={10} />
                  <text className="mapa-no-sigla" y={-2}>
                    {c.sigla}
                  </text>
                  <text className="mapa-no-registros" y={12}>
                    {typeof c.registros === "number" ? inteiro(c.registros) : c.registros}
                  </text>
                  <title>{`${c.nome_oficial} (${c.nome})`}</title>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mapa-painel" aria-live="polite">
        {focado ? (
          <>
            <p>
              <code>{focado.nome}</code> · {focado.nome_oficial} ·{" "}
              {typeof focado.registros === "number" ? inteiro(focado.registros) : focado.registros} registros na{" "}
              {exp.distribuidora}
            </p>
            <p className="nota">
              Aponta para {saem.length} {saem.length === 1 ? "camada" : "camadas"}
              {saem.length > 0 && `: ${saem.map((a) => a.para).join(", ")}`}. Recebe ligação de {chegam.length}.
            </p>
            <Link to={`/camadas/${focado.nome}`}>Abrir a camada {focado.nome} →</Link>
          </>
        ) : (
          <p className="nota">
            {camadas.length} entidades e {arestas.length} ligações. Passe o mouse (ou toque) numa entidade para acender
            as ligações dela; clique (ou toque de novo) para abrir a camada.
          </p>
        )}
      </div>

      <ul className="mapa-legenda">
        <li>
          <span className="marcador forma-ponto" /> Ponto
        </li>
        <li>
          <span className="marcador forma-linha" /> Linha
        </li>
        <li>
          <span className="marcador forma-poligono" /> Polígono
        </li>
        <li>
          <span className="marcador mapa-legenda-ficha" /> Ficha sem desenho
        </li>
        <li>
          <span className="marcador forma-vazia" /> Vazia na {exp.distribuidora}
        </li>
        <li>Seta: a camada de origem guarda o código da camada de destino</li>
      </ul>
      <p className="nota">
        Ligações: campos do tipo "Vinculado" do Manual <Fonte de="manual" onde="Anexo I" />; registros do arquivo{" "}
        <Fonte de="arquivo" />. O desenho de fundo é uma ilustração da ordem física da rede, sem escala nem coordenadas
        reais.
      </p>
    </div>
  );
}
