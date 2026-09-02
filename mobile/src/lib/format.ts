const CURRENCY_SYMBOLS: Record<string, string> = {
  EGP: "E£",
  SAR: "﷼",
  EUR: "€",
  AED: "AED",
  RUB: "₽",
};

export const currencySymbol = (code?: string) => (code ? CURRENCY_SYMBOLS[code] ?? code : "$");

/** Groups thousands without forcing a locale-specific numeral system. */
export const formatNumber = (value: number | undefined | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return "0";
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const formatCurrency = (value: number | undefined | null, code?: string): string =>
  `${currencySymbol(code)} ${formatNumber(value)}`;

/**
 * Short price used on map pins, e.g. "3.5M EGP" or "457K EGP". Falls back to the
 * stored label when the numeric price is missing.
 */
export const formatCompactPrice = (
  value: number | undefined | null,
  code?: string,
  fallback = "",
): string => {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) return fallback;

  const suffix = code ? ` ${code}` : "";
  const trim = (amount: number) => Number(amount.toFixed(1)).toString();

  if (value >= 1_000_000_000) return `${trim(value / 1_000_000_000)}B${suffix}`;
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}M${suffix}`;
  if (value >= 1_000) return `${trim(value / 1_000)}K${suffix}`;
  return `${Math.round(value)}${suffix}`;
};

export const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} · ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
};

/** Server descriptions may contain HTML; strip it for plain-text rendering. */
export const stripHtml = (html?: string | null): string => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

export const initialsOf = (name?: string) =>
  (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
