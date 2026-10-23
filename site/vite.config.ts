import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// O site é publicado em https://joaoviktorino.github.io/bdgd-raio-x/
export default defineConfig({
  base: "/bdgd-raio-x/",
  plugins: [react()],
  server: {
    // Permite importar os JSON de ../dados/processados/ (fora da pasta do site).
    fs: { allow: [".."] },
  },
});
