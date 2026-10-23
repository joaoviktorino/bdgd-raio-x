import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import App from "./App";
import Camada from "./paginas/Camada";
import EmConstrucao from "./paginas/EmConstrucao";
import Inicio from "./paginas/Inicio";
import NaoEncontrada from "./paginas/NaoEncontrada";
import { SECOES } from "./secoes";
import "./estilos.css";

createRoot(document.getElementById("raiz")!).render(
  <StrictMode>
    {/* basename = "/bdgd-raio-x/", o mesmo "base" do vite.config.ts */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<App />}>
          <Route index element={<Inicio />} />
          {SECOES.map((secao) => (
            <Route key={secao.caminho} path={secao.caminho} element={<EmConstrucao secao={secao} />} />
          ))}
          <Route path="camadas/:sigla" element={<Camada />} />
          <Route path="*" element={<NaoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
