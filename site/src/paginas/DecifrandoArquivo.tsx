import AbrindoPacote from "../componentes/AbrindoPacote";
import Certidao, { BlocoDeCodigo } from "../componentes/Certidao";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import NomeDecifrado from "../componentes/NomeDecifrado";
import { arquivo, catalogo } from "../dados";
import "./decifrando.css";

export default function DecifrandoArquivo() {
  const codigoPython = [
    "import pyogrio",
    "",
    `gdb = "${arquivo.conteudo_zip.pasta}"`,
    "for nome, geometria in pyogrio.list_layers(gdb):",
    "    print(nome, geometria)",
  ].join("\n");

  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Decifrando o arquivo</p>
        <h1>Um nome de arquivo conta quase tudo</h1>
        <p className="lide">Toque em cada parte do nome para ver o que ela diz.</p>
      </header>

      <NomeDecifrado />

      <section className="bloco-visual">
        <h2>Abrindo o pacote</h2>
        <p className="lide">Do zip baixado às camadas que um programa de mapas enxerga.</p>
        <AbrindoPacote />
      </section>

      <section className="bloco-visual duas-colunas">
        <div>
          <h2>A certidão do arquivo</h2>
          <p className="lide">De onde veio, quanto pesa e como provar que é o mesmo.</p>
          <Certidao />
        </div>

        <div>
          <h2>Abra você mesmo</h2>
          <p className="lide">
            Depois de extrair o zip, estas linhas de Python listam as {catalogo.total_camadas} camadas da pasta{" "}
            <code>.gdb</code>, do
            mesmo jeito que este projeto faz <Fonte de="pipeline" />.
          </p>
          <BlocoDeCodigo linguagem="Python" codigo={codigoPython} />
          <p className="nota">
            Precisa da biblioteca <code>pyogrio</code>, que já vem com o GDAL, a biblioteca que lê o formato File
            Geodatabase. No projeto, ela é instalada junto com o <code>geopandas</code>.
          </p>
        </div>
      </section>

      <ListaDeFontes fontes={["manual", "modulo10", "arquivo", "pipeline"]} />
    </article>
  );
}
