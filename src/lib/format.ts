export const formatEuro = (value: number | null | undefined) =>
  value == null ? "—" : new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);

export const compactText = (value: string | null | undefined) => value?.trim() || "—";

export const gameCountLabel = (count: number) => `${count} ${count === 1 ? "jogo" : "jogos"}`;
