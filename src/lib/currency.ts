const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: string): Intl.NumberFormat {
  const key = `currency-${currency}`;
  if (!formatters.has(key)) {
    formatters.set(
      key,
      new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );
  }
  return formatters.get(key)!;
}

export function formatCurrency(amount: number, currency = "COP"): string {
  const fmt = getFormatter(currency);
  return fmt.format(amount);
}

export function formatNumber(n: number): string {
  return n.toLocaleString("es-CO");
}

export function parseAmount(value: string): number {
  return parseInt(value.replace(/\D/g, "")) || 0;
}
