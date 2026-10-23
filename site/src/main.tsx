import { type ReactNode, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import App from "./App";
import Camada from "./paginas/Camada";
import EmConstrucao from "./paginas/EmConstrucao";
import Inicio from "./paginas/Inicio";
import DecifrandoArquivo from "./paginas/DecifrandoArquivo";
import NaoEncontrada from "./paginas/NaoEncontrada";
import OQueEBdgd from "./paginas/OQueEBdgd";
import { SECOES } from "./secoes";
import "./estilos.css";

// Seções que já têm página própria; as demais mostram "Em construção".
const PAGINAS_PRONTAS: Record<string, ReactNode> = {
  "o-que-e-bdgd": <OQueEBdgd />,
  "decifrando-o-arquivo": <DecifrandoArquivo />,
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
