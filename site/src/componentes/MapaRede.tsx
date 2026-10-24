// Mapa interativo da rede (MapLibre GL). Fundo do OpenFreeMap (livre, sem chave),
// rede e área da distribuidora dos GeoJSON gerados por pipeline/mapa.py.
// Unidades consumidoras e geradoras nunca aparecem no mapa.
import "maplibre-gl/dist/maplibre-gl.css";

import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";
// O MapLibre 6 roda o processamento dos dados num "worker" (arquivo à parte). O Vite
// empacota esse arquivo com o que ele importa e devolve o endereço final.
import urlWorker from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import urlBt from "../../../dados/processados/mapa_bt.geojson?url";
import urlRede from "../../../dados/processados/mapa_rede.geojson?url";
import urlTransformadores from "../../../dados/processados/mapa_transformadores.geojson?url";
import { inteiro } from "../formatos";
import { contagemTexto, decimal, nomeCurto, raioX, SUBESTACOES_COM_ALIMENTADOR } from "../raioX";

maplibregl.setWorkerUrl(urlWorker);

const ESTILO = {
  claro: "https://tiles.openfreemap.org/styles/positron",
  escuro: "https://tiles.openfreemap.org/styles/dark",
};

// A partir deste zoom a rede BT e os transformadores são baixados e desenhados.
const ZOOM_DETALHE = 12;

type GrupoCamada = { id: string; rotulo: string; sigla: string; camadas: string[]; amostra: string; detalhe?: boolean };

const GRUPOS: GrupoCamada[] = [
  { id: "arat", rotulo: "Área de atuação", sigla: "ARAT", camadas: ["arat-fundo", "arat-linha"], amostra: "area" },
  { id: "sub", rotulo: "Subestações", sigla: "SUB", camadas: ["sub-fundo", "sub-linha"], amostra: "sub" },
  { id: "at", rotulo: "Alta tensão", sigla: "SSDAT", camadas: ["at-linha"], amostra: "at" },
  { id: "mt", rotulo: "Média tensão", sigla: "SSDMT", camadas: ["mt-linha"], amostra: "mt" },
  { id: "bt", rotulo: "Baixa tensão", sigla: "SSDBT", camadas: ["bt-linha"], amostra: "bt", detalhe: true },
  { id: "tr", rotulo: "Transformadores", sigla: "UNTRMT", camadas: ["tr-ponto"], amostra: "tr", detalhe: true },
];

const CLICAVEIS = ["tr-ponto", "mt-linha", "bt-linha", "at-linha", "sub-fundo"];

type Escolha = { camada: string; props: Record<string, unknown> } | null;

const tema = () => (document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro");
const vazio = { type: "FeatureCollection" as const, features: [] };

/** Lê as cores do CSS (mudam com o tema) para passar ao MapLibre, que não entende var(). */
function cores(el: HTMLElement) {
  const css = getComputedStyle(el);
  const v = (nome: string) => css.getPropertyValue(nome).trim();
  return {
    subs: SUBESTACOES_COM_ALIMENTADOR.map((_, i) => v(`--mr-cor-${i}`)),
    at: v("--mr-at"),
    area: v("--mr-area"),
    sub: v("--mr-sub"),
    tr: v("--mr-tr"),
    fundo: v("--superficie"),
    neutra: v("--texto-suave"),
  };
}

function corPorSubestacao(c: ReturnType<typeof cores>) {
  const pares = SUBESTACOES_COM_ALIMENTADOR.flatMap((s, i) => [s, c.subs[i]]);
  return ["match", ["get", "subestacao"], ...pares, c.neutra] as unknown as maplibregl.ExpressionSpecification;
}

function adicionarCamadas(mapa: maplibregl.Map, el: HTMLElement, dados: Record<string, unknown>) {
  const c = cores(el);
  const porSub = corPorSubestacao(c);
  mapa.addSource("rede", { type: "geojson", data: dados.rede ?? vazio } as maplibregl.GeoJSONSourceSpecification);
  mapa.addSource("bt", { type: "geojson", data: dados.bt ?? vazio } as maplibregl.GeoJSONSourceSpecification);
  mapa.addSource("tr", { type: "geojson", data: dados.tr ?? vazio } as maplibregl.GeoJSONSourceSpecification);
  const de = (camada: string) => ["==", ["get", "camada"], camada] as maplibregl.FilterSpecification;

  mapa.addLayer({ id: "arat-fundo", type: "fill", source: "rede", filter: de("ARAT"),
    paint: { "fill-color": c.area, "fill-opacity": 0.06 } });
  mapa.addLayer({ id: "arat-linha", type: "line", source: "rede", filter: de("ARAT"),
    paint: { "line-color": c.area, "line-width": 2, "line-dasharray": [3, 2], "line-opacity": 0.8 } });
  mapa.addLayer({ id: "bt-linha", type: "line", source: "bt", minzoom: ZOOM_DETALHE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": porSub, "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 2],
      "line-opacity": 0.55 } });
  mapa.addLayer({ id: "mt-linha", type: "line", source: "rede", filter: de("SSDMT"),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": porSub, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.2, 15, 3.5] } });
  mapa.addLayer({ id: "at-linha", type: "line", source: "rede", filter: de("SSDAT"),
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": c.at, "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 15, 5],
      "line-dasharray": [2, 1] } });
  mapa.addLayer({ id: "sub-fundo", type: "fill", source: "rede", filter: de("SUB"),
    paint: { "fill-color": c.sub, "fill-opacity": 0.35 } });
  mapa.addLayer({ id: "sub-linha", type: "line", source: "rede", filter: de("SUB"),
    paint: { "line-color": c.sub, "line-width": 2 } });
  mapa.addLayer({ id: "tr-ponto", type: "circle", source: "tr", minzoom: ZOOM_DETALHE + 1,
    paint: {
      "circle-color": c.tr,
      "circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "potencia_kva"]], 2, 2.5, 30, 9],
      "circle-stroke-color": c.fundo,
      "circle-stroke-width": 1.2,
    } });
}

/** Retângulo que envolve uma feição (para enquadrar o alimentador escolhido). */
function limites(coordenadas: unknown, caixa = new maplibregl.LngLatBounds()): maplibregl.LngLatBounds {
  const lista = coordenadas as unknown[];
  if (typeof lista[0] === "number") caixa.extend(lista as [number, number]);
  else lista.forEach((c) => limites(c, caixa));
  return caixa;
}

export default function MapaRede() {
  const caixaRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<maplibregl.Map | null>(null);
  const dadosRef = useRef<Record<string, unknown>>({});
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>(
    Object.fromEntries(GRUPOS.map((g) => [g.id, true])),
  );
  const [destaque, setDestaque] = useState<string>("");
  const [escolha, setEscolha] = useState<Escolha>(null);
  const [zoom, setZoom] = useState(0);
  const [pronto, setPronto] = useState(false);

  // Cria o mapa uma vez; troca o fundo quando o tema muda.
  useEffect(() => {
    const el = caixaRef.current!;
    const mapa = new maplibregl.Map({
      container: el,
      style: ESTILO[tema()],
      center: [-47.9, -19.75],
      zoom: 9,
      attributionControl: { compact: true, customAttribution: 'Rede: <a href="https://dadosabertos-aneel.opendata.arcgis.com/">ANEEL, BDGD</a> (ODbL)' },
      cooperativeGestures: true,
      locale: {
        "CooperativeGesturesHandler.WindowsHelpText": "Use Ctrl + rolagem para aproximar o mapa",
        "CooperativeGesturesHandler.MacHelpText": "Use ⌘ + rolagem para aproximar o mapa",
        "CooperativeGesturesHandler.MobileHelpText": "Use dois dedos para mover o mapa",
      },
    });
    mapaRef.current = mapa;
    mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const aoCarregarEstilo = () => {
      adicionarCamadas(mapa, el, dadosRef.current);
      setPronto(true);
    };
    mapa.on("style.load", aoCarregarEstilo);

    fetch(urlRede)
      .then((r) => r.json())
      .then((rede) => {
        dadosRef.current.rede = rede;
        const area = rede.features.find((f: MapGeoJSONFeature) => f.properties.camada === "ARAT");
        const fonte = () => (mapa.getSource("rede") as GeoJSONSource | undefined)?.setData(rede);
        if (mapa.isStyleLoaded()) fonte();
        else mapa.once("idle", fonte);
        if (area) mapa.fitBounds(limites(area.geometry.coordinates), { padding: 24, duration: 0 });
      });

    // BT e transformadores só são baixados quando a pessoa aproxima o mapa.
    const aoMover = () => {
      setZoom(mapa.getZoom());
      if (mapa.getZoom() < ZOOM_DETALHE - 0.5 || dadosRef.current.pedido) return;
      dadosRef.current.pedido = true;
      ([["bt", urlBt], ["tr", urlTransformadores]] as const).forEach(([id, url]) =>
        fetch(url)
          .then((r) => r.json())
          .then((d) => {
            dadosRef.current[id] = d;
            (mapa.getSource(id) as GeoJSONSource | undefined)?.setData(d);
          }),
      );
    };
    mapa.on("moveend", aoMover);

    mapa.on("click", (e) => {
      const camadas = CLICAVEIS.filter((id) => mapa.getLayer(id));
      const [f] = mapa.queryRenderedFeatures(e.point, { layers: camadas });
      if (!f) return setEscolha(null);
      setEscolha({ camada: String(f.properties.camada), props: f.properties });
      if (f.properties.alimentador) setDestaque(String(f.properties.alimentador));
    });
    CLICAVEIS.forEach((id) => {
      mapa.on("mouseenter", id, () => (mapa.getCanvas().style.cursor = "pointer"));
      mapa.on("mouseleave", id, () => (mapa.getCanvas().style.cursor = ""));
    });

    const observador = new MutationObserver(() => {
      setPronto(false);
      mapa.setStyle(ESTILO[tema()]);
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });

    return () => {
      observador.disconnect();
      mapa.remove();
    };
  }, []);

  // Liga e desliga grupos de camadas.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !pronto) return;
    GRUPOS.forEach((g) =>
      g.camadas.forEach((id) => mapa.setLayoutProperty(id, "visibility", visiveis[g.id] ? "visible" : "none")),
    );
  }, [visiveis, pronto]);

  // Destaque de um alimentador: os demais ficam apagados.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !pronto) return;
    const opacidade = (cheia: number) =>
      destaque ? (["case", ["==", ["get", "alimentador"], destaque], cheia, 0.12] as maplibregl.ExpressionSpecification) : cheia;
    mapa.setPaintProperty("mt-linha", "line-opacity", opacidade(1));
    mapa.setPaintProperty("bt-linha", "line-opacity", opacidade(0.55));
    mapa.setPaintProperty("tr-ponto", "circle-opacity", opacidade(1));
    mapa.setPaintProperty("tr-ponto", "circle-stroke-opacity", opacidade(1));
  }, [destaque, pronto]);

  function escolherAlimentador(codigo: string) {
    setDestaque(codigo);
    const mapa = mapaRef.current;
    const rede = dadosRef.current.rede as { features: MapGeoJSONFeature[] } | undefined;
    const f = rede?.features.find((x) => x.properties.camada === "SSDMT" && x.properties.alimentador === codigo);
    if (!mapa || !f) return;
    setEscolha({ camada: "SSDMT", props: f.properties });
    mapa.fitBounds(limites((f.geometry as { coordinates: unknown }).coordinates), { padding: 40, maxZoom: 14 });
  }

  const longe = zoom > 0 && zoom < ZOOM_DETALHE;

  return (
    <div className="mr">
      <div className="mr-controles">
        <fieldset className="mr-camadas">
          <legend>Camadas</legend>
          {GRUPOS.map((g) => (
            <label key={g.id} className={g.detalhe && longe ? "longe" : undefined}>
              <input
                type="checkbox"
                checked={visiveis[g.id]}
                onChange={(e) => setVisiveis({ ...visiveis, [g.id]: e.target.checked })}
              />
              <span className={`mr-amostra ${g.amostra}`} aria-hidden="true" />
              {g.rotulo} <code>{g.sigla}</code>
              {g.detalhe && longe && <small>(aproxime)</small>}
            </label>
          ))}
        </fieldset>
        <label className="mr-destaque">
          Destacar alimentador
          <select value={destaque} onChange={(e) => (e.target.value ? escolherAlimentador(e.target.value) : setDestaque(""))}>
            <option value="">Todos</option>
            {raioX.subestacoes
              .filter((s) => s.alimentadores > 0)
              .map((s) => (
                <optgroup key={s.subestacao} label={nomeCurto(s)}>
                  {raioX.alimentadores
                    .filter((a) => a.subestacao === s.subestacao)
                    .map((a) => (
                      <option key={a.alimentador} value={a.alimentador}>
                        {a.alimentador}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
        </label>
      </div>

      <div className="mr-moldura">
        <div ref={caixaRef} className="mr-mapa" role="region" aria-label="Mapa da rede da distribuidora" />
      </div>

      <ul className="mr-legenda" aria-label="Cor da rede de média e baixa tensão por subestação">
        {raioX.subestacoes
          .filter((s) => s.alimentadores > 0)
          .map((s, i) => (
            <li key={s.subestacao}>
              <span className="mr-legenda-cor" style={{ background: `var(--mr-cor-${i})` }} />
              {nomeCurto(s)}
            </li>
          ))}
      </ul>

      <FichaEscolha escolha={escolha} aoFechar={() => { setEscolha(null); setDestaque(""); }} />
    </div>
  );
}

function FichaEscolha({ escolha, aoFechar }: { escolha: Escolha; aoFechar: () => void }) {
  if (!escolha) {
    return <p className="mr-dica">Clique numa linha, subestação ou transformador para ver os dados e a camada de origem.</p>;
  }
  const p = escolha.props;
  const alimentador = raioX.alimentadores.find((a) => a.alimentador === p.alimentador);
  const sub = raioX.subestacoes.find((s) => s.subestacao === (p.subestacao ?? alimentador?.subestacao));
  const indice = sub ? SUBESTACOES_COM_ALIMENTADOR.indexOf(sub.subestacao) : -1;
  const cor = indice >= 0 ? `var(--mr-cor-${indice})` : "var(--destaque)";

  let titulo = "";
  let itens: [string, string][] = [];
  if (escolha.camada === "UNTRMT") {
    titulo = `Transformador ${p.transformador}`;
    itens = [["Potência nominal", `${decimal(Number(p.potencia_kva))} kVA`], ["Alimentador", String(p.alimentador)]];
  } else if (escolha.camada === "SSDAT") {
    titulo = `Circuito de alta tensão ${p.circuito_at}`;
    itens = [["Comprimento", `${decimal(Number(p.km))} km`], ["Trechos", inteiro(Number(p.trechos))]];
  } else if (escolha.camada === "SUB" && sub) {
    titulo = sub.nome;
    itens = [["Alimentadores", inteiro(sub.alimentadores)], ["Transformadores", inteiro(sub.transformadores)],
      ["Potência instalada", `${inteiro(sub.potencia_kva)} kVA`], ["Consumidores BT", contagemTexto(sub.consumidores_bt.qtd_uc)]];
  } else if (alimentador) {
    titulo = alimentador.nome;
    itens = [
      [escolha.camada === "SSDBT" ? "Rede BT (este alimentador)" : "Rede MT", `${decimal(Number(p.km))} km`],
      ["Trechos desenhados", inteiro(Number(p.trechos))],
      ["Transformadores", inteiro(alimentador.transformadores)],
      ["Consumidores BT", contagemTexto(alimentador.consumidores_bt.qtd_uc)],
    ];
  }

  return (
    <div className="mr-ficha" style={{ "--cor": cor } as React.CSSProperties} aria-live="polite">
      <div className="mr-ficha-topo">
        <span className="mr-ficha-selo">camada {escolha.camada}</span>
        {sub && <span className="mr-ficha-sub">{nomeCurto(sub)}</span>}
        <button type="button" className="mr-fechar" onClick={aoFechar} aria-label="Fechar ficha">
          ×
        </button>
        <p className="mr-ficha-titulo">{titulo}</p>
      </div>
      <dl>
        {itens.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>{valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mr-ficha-origem">
        Desenho da camada <Link to={`/camadas/${escolha.camada}`}>{escolha.camada}</Link>
        {alimentador && escolha.camada !== "UNTRMT" && " · números do raio-x da rede"}.
      </p>
    </div>
  );
}
