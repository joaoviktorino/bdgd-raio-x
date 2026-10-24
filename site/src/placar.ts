// Placar dos testes, guardado só no navegador de quem joga (localStorage): sem conta,
// sem servidor. Se o navegador bloquear o armazenamento, o site funciona sem placar.

export type Resultado = { melhor: number; ultimo: number; total: number; vezes: number; data: string };
export type Placar = Record<string, Resultado>;

const CHAVE = "bdgd-placar";
export const EVENTO = "bdgd-placar";

export function lerPlacar(): Placar {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as Placar;
  } catch {
    return {};
  }
}

/** Guarda o resultado de um teste (id = caminho da página) e avisa quem estiver ouvindo. */
export function gravarResultado(id: string, pontos: number, total: number) {
  const placar = lerPlacar();
  const antes = placar[id];
  placar[id] = {
    melhor: Math.max(pontos, antes?.total === total ? antes.melhor : 0),
    ultimo: pontos,
    total,
    vezes: (antes?.vezes ?? 0) + 1,
    data: new Date().toISOString().slice(0, 10),
  };
  try {
    localStorage.setItem(CHAVE, JSON.stringify(placar));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function apagarPlacar() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    return;
  }
  window.dispatchEvent(new Event(EVENTO));
}
