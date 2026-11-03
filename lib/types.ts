export const BUSINESSES = {
  "sam-studio": { name: "Sam Studio", prefix: "SS" },
  parlour: { name: "THRESH SALOON", prefix: "PL" },
} as const;
export type BusinessId = keyof typeof BUSINESSES;
export const isBusinessId = (v: string): v is BusinessId => v in BUSINESSES;
export const BUSINESS_STAFF: Record<BusinessId, readonly string[]> = {
  "sam-studio": ["Sam", "Riya"],
  parlour: ["Anita", "Meera", "Kiran"],
};

export type BillType = "normal" | "gst";
export type BillEntryBy = "owner" | "staff";
export type PayMethod = "cash" | "upi" | "card";
export type ItemType = "service" | "product" | "package" | "membership";

export interface BillItem {
  serviceId?: string; name: string; itemType: ItemType; hsn?: string;
  qty: number; price: number; discount: number; gstRate: number; staff?: string;
}
export interface CustomerSnap { id?: string; name: string; phone?: string; gstin?: string; state?: string }
export interface Totals {
  subtotal: number; discount: number; taxable: number; cgst: number; sgst: number; igst: number;
  tax: number; roundOff: number; total: number; taxByRate: Record<string, number>;
}
export interface Bill extends Totals {
  id: string; businessId: BusinessId; billType: BillType; billNumber: string; receiptNumber?: string; seq: number;
  customer: CustomerSnap; items: BillItem[]; paymentMethod: PayMethod; paidAmount: number; createdBy: BillEntryBy;
  createdByName?: string;
  createdByNames?: string[];
  status: "paid" | "partial" | "unpaid" | "cancelled"; interState: boolean;
  business: { name: string; gstin?: string; address?: string; state?: string; phone?: string };
  createdAt: number; dateKey: string; notes?: string;
}
export function receiptNumberForBill(bill: Pick<Bill, "businessId" | "receiptNumber" | "billNumber">) {
  const number = bill.receiptNumber ?? bill.billNumber;
  const match = /^(?:(?:SS|PL)-)?REC-(\d+)$/.exec(number);
  if (!match) return number;
  const sequence = match[1].replace(/^0+(?=\d)/, "").padStart(2, "0");
  return `${BUSINESSES[bill.businessId].prefix}-REC-${sequence}`;
}
export interface BillInput {
  businessId: BusinessId; billType: BillType; customer: CustomerSnap; items: BillItem[];
  paymentMethod: PayMethod; paidAmount: number; notes?: string; createdAt?: number; createdBy?: BillEntryBy;
  createdByName?: string; createdByNames?: string[];
  receiptNumber?: string; receiptReservationId?: string;
}
export interface Service {
  id: string; businessId: BusinessId; name: string; price: number; type: ItemType;
  hsn?: string; gstRate: number; active: boolean;
}
export interface Customer {
  id: string; businessId: BusinessId; name: string; phone?: string; gstin?: string; state?: string;
  totalSpent: number; billCount: number; lastVisit?: number | null; createdAt?: number; notes?: string;
}