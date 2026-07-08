export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Nexora Finance";
export const APP_VERSION = "1.0.0";
export const APP_DESCRIPTION = "Control financiero personal — simple, elegante, inteligente.";

export const CURRENCIES = ["COP", "USD", "MXN", "EUR"] as const;
export const COUNTRIES = ["Colombia", "México", "Chile", "España"] as const;
export const THEMES = ["dark", "light"] as const;
export const LANGUAGES = ["es", "en"] as const;

export const ACCOUNT_TYPES = ["efectivo", "cuenta_bancaria", "nequi", "daviplata", "otro"] as const;
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  cuenta_bancaria: "Cuenta Bancaria",
  nequi: "Nequi",
  daviplata: "Daviplata",
  otro: "Otro",
};

export const TRANSACTION_TYPES = ["income", "expense"] as const;
export const FREQUENCIES = ["weekly", "monthly", "annual"] as const;
export const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  annual: "Anual",
};

export const DEFAULT_CATEGORIES = [
  { name: "Comida", icon: "🍔", color: "#FF9F43", type: "expense" },
  { name: "Transporte", icon: "🚗", color: "#5AC8FA", type: "expense" },
  { name: "Entretenimiento", icon: "🎬", color: "#BF5AF2", type: "expense" },
  { name: "Compras", icon: "🛒", color: "#FF6B81", type: "expense" },
  { name: "Salud", icon: "🏥", color: "#34C759", type: "expense" },
  { name: "Servicios", icon: "⚡", color: "#FFD60A", type: "expense" },
  { name: "Educación", icon: "📚", color: "#0A84FF", type: "expense" },
  { name: "Viajes", icon: "✈️", color: "#8B5CF6", type: "expense" },
  { name: "Hogar", icon: "🏠", color: "#30D5C8", type: "expense" },
  { name: "Otros", icon: "📦", color: "#8E8E93", type: "expense" },
  { name: "Salario", icon: "DollarSign", color: "#34C759", type: "income" },
  { name: "Extras", icon: "Plus", color: "#0A84FF", type: "income" },
] as const;

export const BUDGET_COLORS = {
  Hogar: "#30D5C8",
  Ahorro: "#34C759",
  Transporte: "#5AC8FA",
  Entretenimiento: "#BF5AF2",
  Comida: "#FF9F43",
  Libre: "#FF6B81",
} as Record<string, string>;

export const ALERT_TONES: Record<string, { color: string; bg: string }> = {
  info: { color: "#5AC8FA", bg: "rgba(90,200,250,0.1)" },
  warn: { color: "#FF9F43", bg: "rgba(255,159,67,0.1)" },
  urgent: { color: "#FF6B6B", bg: "rgba(255,107,107,0.1)" },
};

export const DEBOUNCE_MS = 300;
export const PAGE_SIZE = 20;
export const MAX_LOGIN_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
