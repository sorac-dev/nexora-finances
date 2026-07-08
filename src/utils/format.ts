import { formatCurrency, formatNumber } from "@/src/lib/currency";
export { formatCurrency, formatNumber };

export function fmt(n: number, currency = "COP"): string {
  return formatCurrency(n, currency);
}

export function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return Math.min(100, Math.round((a / b) * 100));
}
