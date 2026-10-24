import { useMemo } from "react";
import { Link } from "react-router";

import resumoJson from "../../../dados/processados/mapa_resumo.json";
import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import MapaRede from "../componentes/MapaRede";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { acharCamada, distribuidora, registrosTexto } from "../dados";
import { inteiro } from "../formatos";
import { decimal, raioX } from "../raioX";
import "./mapa.css";

const resumo = resumoJson as {
  tolerancia_graus: number;
  casas_decimais: number;
  area_km2: number;
  arquivos: { arquivo: string; feicoes: number; kb: number }[];
};

// 1 grau de latitude tem cerca de 111 km: tolerância em metros, arredondada.
const toleranciaMetros = Math.round(resumo.tolerancia_graus * 111_000);

function perguntas(): Pergunta[] {
  const mt = raioX.comprimentos.find((c) => c.rede === "MT")!;
  return [
    {
      id: "estimar-area",
      tipo: "estimativa",
      enunciado: `Chute: qual é o tamanho da área de atuação da ${distribuidora}, em km²?`,
      valor: Math.round(resumo.area_km2),
      min: 10,
      max: 100000,
      unidade: "km²",
      explicacao: (
        <p>
          {decimal(resumo.area_km2)} km², medidos sobre o elipsoide no polígono da camada <code>ARAT</code>{" "}
          <Fonte de="mapa" />. Dá cerca de {decimal(mt.km_comp / resumo.area_km2, 1)} km de rede de média tensão por km².
        </p>
      ),
    },
    {
      id: "por-que-sem-casas",
      tipo: "escolha",
      enunciado: "Por que este mapa não mostra os consumidores, se a BDGD sabe a qual transformador cada um se liga?",
      opcoes: [
        "A BDGD não guarda consumidores",
        "Para não expor dados de pessoas: aqui consumidores só aparecem somados",
        "Porque consumidores não têm coordenadas em nenhuma versão da BDGD",
        "Porque o mapa ficaria lento",
      ],
      certa: 1,
      explicacao: (
        <p>
          A <code>UCBT_tab</code> tem {registrosTexto(acharCamada("UCBT_tab"))} registros, cada um com{" "}
          <code>UNI_TR_MT</code> <Fonte de="manual" onde="Anexo I, UCBT, p. 43" />. Este site só mostra consumidores
          somados por alimentador, nunca um a um.
        </p>
      ),
    },
    {
      id: "coordenadas",
      tipo: "escolha",
      enunciado: "Em que sistema de coordenadas a BDGD entrega os desenhos da rede?",
      opcoes: ["SIRGAS 2000 geográfico", "WGS 84 / Pseudo-Mercator", "UTM fuso 23 Sul", "SAD 69"],
      certa: 0,
      explicacao: (
        <p>
          SIRGAS 2000, em latitude e longitude (EPSG:4674) <Fonte de="modulo10" onde="item 45" />. O mapa da tela é
          desenhado em Pseudo-Mercator, e o MapLibre faz a conversão.
        </p>
      ),
    },
    {
      id: "estimar-transformadores",
      tipo: "estimativa",
      enunciado: "Aproxime o mapa: quantos transformadores de distribuição a rede tem, ao todo?",
      valor: raioX.totais.transformadores,
      min: 10,
      max: 100000,
      unidade: "transformadores",
      explicacao: (
        <p>
          {inteiro(raioX.totais.transformadores)}, um ponto para cada registro da <code>UNTRMT</code>{" "}
          <Fonte de="arquivo" onde="camada UNTRMT" />.
        </p>
      ),
    },
  ];
}

export default function Mapa() {
  const PERGUNTAS = useMemo(perguntas, []);
  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Mapa da rede</p>
        <h1>A rede da {distribuidora} sobre o mapa</h1>
        <p className="lide">
          Área de atuação, subestações, linhas de alta, média e baixa tensão e transformadores, cada um desenhado a partir
          da sua camada. A cor da rede é a da subestação; escolha um alimentador para destacá-lo.
        </p>
      </header>

      <MapaRede />

      <section className="bloco-visual">
        <h2>O que entra e o que fica de fora</h2>
        <div className="duas-colunas">
          <div>
            <p>
              Os trechos de cada alimentador foram juntados numa só linha e simplificados (tolerância de cerca de{" "}
              {toleranciaMetros} m, coordenadas com {resumo.casas_decimais} casas decimais, cerca de 1 m). A rede de baixa
              tensão e os transformadores só são baixados quando você aproxima o mapa.
            </p>
            <ul className="nota">
              {resumo.arquivos.map((a) => (
                <li key={a.arquivo}>
                  <code>{a.arquivo}</code>: {inteiro(a.feicoes)} feições, {inteiro(a.kb)} KB
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p>
              <strong>Consumidores e geradores não aparecem</strong>, nem como pontos nem somados por transformador: a soma
              por transformador, subtraída do total do alimentador, poderia revelar grupos com 1 ou 2 unidades. Os números
              de consumidores ficam no <Link to="/raio-x">raio-x da rede</Link>, por alimentador.
            </p>
            <p className="nota">
              Desenhos em SIRGAS 2000 <Fonte de="modulo10" onde="item 45" />. Mapa de fundo: OpenFreeMap, com dados do
              OpenStreetMap.
            </p>
          </div>
        </div>
      </section>

      <section className="bloco-visual">
        <h2>Teste você mesmo</h2>
        <p className="lide">Use o mapa para pensar antes de responder.</p>
        <Quiz titulo="Teste: mapa da rede" perguntas={PERGUNTAS} />
      </section>

      <ListaDeFontes fontes={["modulo10", "manual", "arquivo", "mapa", "fundo"]} />
    </article>
  );
}
