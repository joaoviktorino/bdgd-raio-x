// Formatação de números e datas em português.

/** 6293535 -> "6,3 MB" (megabytes decimais, como mostram os portais e o Windows Explorer em "tamanho"). */
export function megabytes(bytes: number): string {
  return `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

export function inteiro(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** "2025-12-31" -> "31 de dezembro de 2025" */
export function dataPorExtenso(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** "20260823-1836" -> { data: "2026-08-23", hora: "18:36" } */
export function lerDataHora(compacto: string): { data: string; hora: string } {
  return {
    data: `${compacto.slice(0, 4)}-${compacto.slice(4, 6)}-${compacto.slice(6, 8)}`,
    hora: `${compacto.slice(9, 11)}:${compacto.slice(11, 13)}`,
  };
}
