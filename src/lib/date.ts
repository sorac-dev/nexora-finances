const MS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const MONTHS_FULL = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function pad(n: number) { return String(n).padStart(2, "0"); }

/** "7 de Julio de 2026 (7:24 AM)" */
export function fmtDateFull(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return String(date);
  const h = d.getHours(), m = pad(d.getMinutes()), ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${d.getDate()} de ${MONTHS_FULL[d.getMonth()]} de ${d.getFullYear()} (${h12}:${m} ${ampm})`;
}

/** "1 Jul 2026" — professional, consistent everywhere */
export function fmtDate(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return String(date);
  return `${d.getDate()} ${MS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "1 Jul" — short version */
export function fmtDateShort(date: Date | string): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date.includes("T") ? date : date + "T00:00:00") : date;
  if (isNaN(d.getTime())) return String(date);
  return `${d.getDate()} ${MS[d.getMonth()]}`;
}

export function formatDate(date: Date | string): string { return fmtDate(date); }
export function formatDateShort(date: Date | string): string { return fmtDateShort(date); }

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("es-CO", { month: "long", year: "numeric" });
}

export function getMonthDays(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function daysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(date: Date): boolean {
  return date < new Date() && !isSameDay(date, new Date());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
