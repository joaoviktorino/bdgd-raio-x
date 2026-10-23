import { useEffect, useRef, useState } from "react";

/** Fica `true` (uma vez) quando o elemento aparece na tela. Usado para disparar animações ao rolar. */
export function useVisivel<T extends Element>(limiar = 0.25) {
  const ref = useRef<T>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento || visivel) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { threshold: limiar },
    );
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [limiar, visivel]);

  return { ref, visivel };
}

/** `true` se a pessoa pediu ao sistema para reduzir animações. */
export function preferePoucoMovimento(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
