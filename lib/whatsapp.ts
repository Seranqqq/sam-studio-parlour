import { inr } from "./format";
import type { Bill } from "./types";

// 10-digit Indian numbers get +91; others keep their country code
export function waLink(phone: string | undefined, text: string) {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  const q = `text=${encodeURIComponent(text)}`;
  return d ? `https://wa.me/${d}?${q}` : `https://wa.me/?${q}`;
}

export function waMessage(b: Bill, url: string) {
  const due = b.total - b.paidAmount;
  const paidLine =
    b.status === "cancelled" ? "This bill is cancelled."
    : due > 0 ? `Paid ${inr(b.paidAmount)}, balance due ${inr(due)}.`
    : "Paid in full. Thank you!";
  return [
    `Hello ${b.customer.name},`,
    `Thank you for choosing ${b.business.name}.`,
    `${b.billType === "gst" ? "Tax invoice" : "Bill"} ${b.billNumber}: total ${inr(b.total)}.`,
    paidLine,
    `View or download your bill: ${url}`,
  ].join("\n");
}