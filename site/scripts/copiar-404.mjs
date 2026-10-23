// O GitHub Pages devolve 404.html para endereços que não existem como arquivo
// (ex.: /bdgd-raio-x/camadas/UNTRMT). Com uma cópia do index.html ali, o
// próprio site abre e o roteador mostra a página certa.
import { copyFileSync } from "node:fs";

copyFileSync("dist/index.html", "dist/404.html");
console.log("dist/404.html criado a partir de dist/index.html");
