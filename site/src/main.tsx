import { lazy, type ReactNode, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import App from "./App";
import Camada from "./paginas/Camada";
import Camadas from "./paginas/Camadas";
import EmConstrucao from "./paginas/EmConstrucao";
import Inicio from "./paginas/Inicio";
import DecifrandoArquivo from "./paginas/DecifrandoArquivo";
import Ligacoes from "./paginas/Ligacoes";
import NaoEncontrada from "./paginas/NaoEncontrada";
import OQueEBdgd from "./paginas/OQueEBdgd";
import RaioX from "./paginas/RaioX";
import { SECOES } from "./secoes";

// O mapa carrega o MapLibre (pesado): só é baixado quando a página do mapa abre.
const Mapa = lazy(() => import("./paginas/Mapa"));
import "./estilos.css";
import "./visual.css";

// Seções que já têm página própria; as demais mostram "Em construção".
const PAGINAS_PRONTAS: Record<string, ReactNode> = {
  "o-que-e-bdgd": <OQueEBdgd />,
  "decifrando-o-arquivo": <DecifrandoArquivo />,
  camadas: <Camadas />,
  ligacoes: <Ligacoes />,
  "raio-x": <RaioX />,
  mapa: (
    <Suspense fallback={<p className="nota">Carregando o mapa…</p>}>
      <Mapa />
    </Suspense>
  ),
};

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    {/* basename = "/bdgd-raio-x/", o mesmo "base" do vite.config.ts */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Inicio />} />
          {SECOES.map((secao) => (
            <Route
              key={secao.caminho}
              path={secao.caminho}
              element={PAGINAS_PRONTAS[secao.caminho] ?? <EmConstrucao secao={secao} />}
            />
          ))}
          <Route path="camadas/:sigla" element={<Camada />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
