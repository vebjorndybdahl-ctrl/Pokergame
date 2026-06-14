const LOCALE = "nb-NO";

// Format a signed money amount, e.g. +120,00 kr / -45,50 kr / 0,00 kr
export function formatMoney(amount: number, currency = "kr"): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  const abs = Math.abs(amount).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${abs} ${currency}`;
}

// Format a plain (unsigned) money amount, e.g. 120,00 kr
export function formatAmount(amount: number, currency = "kr"): string {
  const abs = amount.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${abs} ${currency}`;
}

// Tailwind text color for a net result.
export function netColor(amount: number): string {
  if (amount > 0) return "text-emerald-400";
  if (amount < 0) return "text-red-400";
  return "text-zinc-400";
}

// "lør. 14. juni 2026" from a YYYY-MM-DD string, without timezone drift.
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
