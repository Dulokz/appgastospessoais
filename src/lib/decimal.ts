import Decimal from "decimal.js";

// Configuração global de precisão para operações financeiras
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export { Decimal };

export function toDecimal(value: number | string | Decimal | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(value);
}

export function formatCurrencyBRL(value: number | string | Decimal | null | undefined): string {
  const dec = toDecimal(value);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dec.toNumber());
}

export function formatPercent(value: number | string | Decimal | null | undefined): string {
  const dec = toDecimal(value);
  return `${dec.toFixed(2)}%`;
}
