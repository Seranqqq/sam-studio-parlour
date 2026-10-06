import type { BillItem, BillType, Totals } from "./types";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(items: BillItem[], billType: BillType, interState: boolean): Totals {
  let subtotal = 0, discount = 0, tax = 0;
  const taxByRate: Record<string, number> = {};
  for (const it of items) {
    const gross = it.qty * it.price;
    const taxable = Math.max(gross - it.discount, 0);
    subtotal += gross;
    discount += gross - taxable;
    if (billType === "gst") {
      const t = (taxable * it.gstRate) / 100;
      tax += t;
      const k = String(it.gstRate);
      taxByRate[k] = (taxByRate[k] ?? 0) + t;
    }
  }
  subtotal = r2(subtotal); discount = r2(discount); tax = r2(tax);
  const taxable = r2(subtotal - discount);
  const cgst = interState ? 0 : r2(tax / 2);
  const sgst = interState ? 0 : r2(tax - cgst);
  const igst = interState ? tax : 0;
  const raw = taxable + tax;
  const total = Math.round(raw);
  for (const k of Object.keys(taxByRate)) taxByRate[k] = r2(taxByRate[k]);
  return { subtotal, discount, taxable, cgst, sgst, igst, tax, roundOff: r2(total - raw), total, taxByRate };
}

export const statusFor = (total: number, paid: number): "paid" | "partial" | "unpaid" =>
  paid >= total ? "paid" : paid > 0 ? "partial" : "unpaid";