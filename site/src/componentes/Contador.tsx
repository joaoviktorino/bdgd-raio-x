import { useEffect, useState } from "react";

import { inteiro } from "../formatos";
import { preferePoucoMovimento, useVisivel } from "./useVisivel";

/** Número que sobe de 0 até o valor quando aparece na tela. */
export default function Contador({ valor, duracao = 1400 }: { valor: number; duracao?: number }) {
  const { ref, visivel } = useVisivel<HTMLSpanElement>(0.5);
  const [atual, setAtual] = useState(preferePoucoMovimento() ? valor : 0);

  useEffect(() => {
    if (!visivel || preferePoucoMovimento()) return;
    const inicio = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / duracao);
      setAtual(Math.round(valor * (1 - (1 - t) ** 3)));
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [visivel, valor, duracao]);

  return (
    <span ref={ref} aria-label={inteiro(valor)}>
      {inteiro(atual)}
    </span>
  );
}
