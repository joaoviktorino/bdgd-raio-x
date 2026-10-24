// Ícones de traço, no estilo dos pictogramas Norven (linha grossa e geométrica),
// em duas cores: o traço principal no destaque e o detalhe em lilás.
const DESENHOS = {
  documento: ["M7 3h7l5 5v13H7z M14 3v5h5", "M10 13h6 M10 17h6"],
  "quebra-cabeca": ["M4 9h4a2 2 0 1 1 4 0h4v4a2 2 0 1 1 0 4v4H4v-4a2 2 0 1 0 0-4z", ""],
  camadas: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5 M3 17.5l9 5 9-5"],
  rede: ["M4 6h4v4H4z M16 4h4v4h-4z M16 16h4v4h-4z", "M8 8l8-2 M8 8l8 10"],
  ligacoes: [
    "M5 5a2 2 0 1 0 0 .1z M19 5a2 2 0 1 0 0 .1z M12 19a2 2 0 1 0 0 .1z M5 15a2 2 0 1 0 0 .1z",
    "M7 5h10 M6 7l5 10 M18 7l-5 10 M7 15h3",
  ],
  mapa: ["M12 21s-6-6.2-6-11a6 6 0 1 1 12 0c0 4.8-6 11-6 11z", "M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"],
  sol: [
    "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
    "M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4.2 4.2l2.1 2.1 M17.7 17.7l2.1 2.1 M4.2 19.8l2.1-2.1 M17.7 6.3l2.1-2.1",
  ],
  baixar: ["M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4", "M12 3v12 M7 10l5 5 5-5"],
  livro: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z M4 19V5", "M8 7h7 M8 11h5"],
} as const;

export type NomeIcone = keyof typeof DESENHOS;

export default function Icone({ nome }: { nome: NomeIcone }) {
  const [principal, detalhe] = DESENHOS[nome];
  return (
    <svg className="icone" viewBox="0 0 24 24" aria-hidden="true">
      <path d={principal} />
      {detalhe && <path className="icone-detalhe" d={detalhe} />}
    </svg>
  );
}
