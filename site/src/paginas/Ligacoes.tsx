import { useMemo } from "react";

import { Fonte, ListaDeFontes } from "../componentes/Fonte";
import MapaLigacoes from "../componentes/MapaLigacoes";
import Quiz, { type Pergunta } from "../componentes/Quiz";
import { type Explorador, useExplorador } from "../explorador";
import "./ligacoes.css";

function perguntas(exp: Explorador): Pergunta[] {
  const pares = exp.camadas.flatMap((c) => c.liga_a.map((alvo) => `${c.nome}>${alvo}`));
  const recebe = new Map<string, number>();
  exp.camadas.forEach((c) => c.liga_a.forEach((alvo) => recebe.set(alvo, (recebe.get(alvo) ?? 0) + 1)));
  const ranking = [...recebe.entries()].sort((a, b) => b[1] - a[1]);
  const [campea, vezes] = ranking[0];
  const outras = ranking.slice(3, 6).map(([nome]) => nome);
  const opcoesCampea = [campea, ...outras].sort();

  const so = (nome: string) => exp.camadas.find((c) => c.nome === nome)!;
  const candidatas = ["SUB", "CONJ", "SEGCON", "UCBT_tab", "CTMT", "UNTRMT"].filter((n) => so(n));
  const itens = candidatas.map((n) => ({ rotulo: n, grupo: (so(n).liga_a.length > 0 ? 0 : 1) as 0 | 1 }));

  return [
    {
      id: "estimar-ligacoes",
      tipo: "estimativa",
      enunciado: "Chute: quantas ligações (de uma camada para outra) existem entre as 43 camadas?",
      valor: pares.length,
      min: 10,
      max: 2000,
      unidade: "ligações",
      explicacao: (
        <p>
          São {pares.length} pares "camada → camada", contados a partir dos campos do tipo "Vinculado"{" "}
          <Fonte de="manual" onde="Anexo I" />.
        </p>
      ),
    },
    {
      id: "mais-procurada",
      tipo: "escolha",
      enunciado: "Qual camada recebe ligação do maior número de outras camadas?",
      opcoes: opcoesCampea,
      certa: opcoesCampea.indexOf(campea),
      explicacao: (
        <p>
          A <code>{campea}</code>, apontada por {vezes} camadas. Quase todo elemento da rede guarda o código dela
          <Fonte de="manual" onde="Anexo I" />.
        </p>
      ),
    },
    {
      id: "ugbt-transformador",
      tipo: "escolha",
      enunciado: "A unidade geradora de baixa tensão (UGBT) guarda o código de qual destas camadas?",
      opcoes: ["BAR", "UNTRMT", "EQTRMT", "RAMLIG"],
      certa: 1,
      explicacao: (
        <p>
          Do transformador de média tensão, pela coluna <code>UNI_TR_MT</code>. É assim que se soma a geração
          distribuída por transformador <Fonte de="manual" onde="Anexo I, UGBT, p. 61" />.
        </p>
      ),
    },
    {
      id: "aponta-ou-recebe",
      tipo: "classificar",
      enunciado: "Estas camadas apontam para outras, ou só recebem ligações?",
      grupos: ["Apontam para outras", "Só recebem"],
      itens,
      explicacao: (
        <p>
          Subestação, conjunto e segmento condutor são "pontos de chegada": as outras camadas guardam o código delas,
          mas elas não guardam o de ninguém <Fonte de="manual" onde="Anexo I" />.
        </p>
      ),
    },
    {
      id: "onde-fica-eqtrat",
      tipo: "escolha",
      enunciado: "No desenho, onde fica o equipamento transformador de alta tensão (EQTRAT)?",
      opcoes: ["Na rede de baixa tensão", "Na subestação", "No poste da média tensão", "Na transmissão"],
      certa: 1,
      explicacao: (
        <p>
          Na subestação: ele caracteriza a unidade transformadora de alta tensão, e equipamentos dentro de
          subestações podem ser posicionados no ponto central dela <Fonte de="modulo10" onde="Tabela 2 e item 25" />.
        </p>
      ),
    },
  ];
}

export default function Ligacoes() {
  const exp = useExplorador();
  const PERGUNTAS = useMemo(() => (exp ? perguntas(exp) : []), [exp]);

  return (
    <article className="pagina-visual">
      <header className="pagina-visual-topo">
        <p className="sobretitulo">Mapa de ligações</p>
        <h1>Todas as entidades, no lugar onde a rede as coloca</h1>
        <p className="lide">
          Da transmissão às casas: cada etiqueta é uma camada da BDGD sobre o que ela representa, e cada seta é uma
          coluna que guarda o código de outra camada <Fonte de="manual" onde="Anexo I" />.
        </p>
      </header>

      {exp ? <MapaLigacoes exp={exp} /> : <p className="nota">Carregando o mapa…</p>}

      {exp && (
        <section className="bloco-visual">
          <h2>Teste você mesmo</h2>
          <p className="lide">Quem se liga a quem, e onde cada coisa fica.</p>
          <Quiz titulo="Teste: ligações" perguntas={PERGUNTAS} />
        </section>
      )}

      <ListaDeFontes fontes={["manual", "modulo10", "arquivo"]} />
    </article>
  );
}
