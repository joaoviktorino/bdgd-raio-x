import { useEffect, useState } from "react";

type Escolha = "auto" | "claro" | "escuro";

const PROXIMA: Record<Escolha, Escolha> = { auto: "claro", claro: "escuro", escuro: "auto" };
const NOME: Record<Escolha, string> = { auto: "automático (segue o sistema)", claro: "claro", escuro: "escuro" };

// Ícones de traço: meio sol (automático), sol (claro) e lua (escuro).
const ICONE: Record<Escolha, string> = {
  auto: "M12 3a9 9 0 1 0 0 18z M12 3a9 9 0 0 1 0 18",
  claro:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4",
  escuro: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
};

const sistemaEscuro = () => matchMedia("(prefers-color-scheme: dark)").matches;

function aplicar(escolha: Escolha) {
  const escuro = escolha === "escuro" || (escolha === "auto" && sistemaEscuro());
  document.documentElement.dataset.tema = escuro ? "escuro" : "claro";
  document.documentElement.dataset.temaEscolha = escolha;
  try {
    localStorage.setItem("bdgd-tema", escolha);
  } catch {
    // navegador sem armazenamento (ex.: janela anônima com bloqueio): vale só nesta visita
  }
}

/** Botão do cabeçalho que alterna o tema: automático → claro → escuro. */
export default function BotaoTema() {
  const [escolha, setEscolha] = useState<Escolha>(
    () => (document.documentElement.dataset.temaEscolha as Escolha | undefined) ?? "auto",
  );

  // No automático, acompanha o sistema se ele mudar com a página aberta.
  useEffect(() => {
    if (escolha !== "auto") return;
    const consulta = matchMedia("(prefers-color-scheme: dark)");
    const mudou = () => aplicar("auto");
    consulta.addEventListener("change", mudou);
    return () => consulta.removeEventListener("change", mudou);
  }, [escolha]);

  const proxima = PROXIMA[escolha];
  return (
    <button
      type="button"
      className="botao-tema"
      onClick={() => {
        aplicar(proxima);
        setEscolha(proxima);
      }}
      title={`Tema: ${NOME[escolha]}. Clique para ${NOME[proxima]}.`}
      aria-label={`Tema: ${NOME[escolha]}. Clique para mudar para ${NOME[proxima]}.`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={ICONE[escolha]} />
      </svg>
      <span className="botao-tema-rotulo">{escolha === "auto" ? "Auto" : escolha === "claro" ? "Claro" : "Escuro"}</span>
    </button>
  );
}
