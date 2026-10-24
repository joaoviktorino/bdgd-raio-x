import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O site é publicado em https://joaoviktorino.github.io/bdgd-raio-x/
export default defineConfig({
  base: "/bdgd-raio-x/",
  plugins: [react()],
  // O worker do MapLibre é um módulo ES.
  worker: { format: "es" },
  // O pedaço do mapa (MapLibre, ~290 kB comprimido) só carrega na página do mapa.
  build: { chunkSizeWarningLimit: 1200 },
  server: {
    // Permite importar os JSON de ../dados/processados/ (fora da pasta do site).
    fs: { allow: [".."] },
  },
});
