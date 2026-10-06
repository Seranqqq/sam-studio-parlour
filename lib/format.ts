export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const fmtDateTime = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export function dateParts(ms: number) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(new Date(ms));
  const g = (t: string) => f.find((p) => p.type === t)!.value;
  return { dateKey: `${g("year")}-${g("month")}-${g("day")}`, hour: String(Number(g("hour")) % 24) };
}

export function addDays(key: string, n: number) {
  const d = new Date(key + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Preset = "today" | "7d" | "month" | "custom";
export function rangeFor(p: Preset, cf: string, ct: string) {
  const t = dateParts(Date.now()).dateKey;
  if (p === "today") return { from: t, to: t };
  if (p === "7d") return { from: addDays(t, -6), to: t };
  if (p === "month") return { from: t.slice(0, 8) + "01", to: t };
  return { from: cf || t, to: ct || t };
}