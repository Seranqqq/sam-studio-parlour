import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

type Rec = Record<string, number>;
export interface Agg {
  revenue: number; billCount: number; gstCount: number; normalCount: number; paid: number; unpaid: number;
  taxCollected: number; byMethod: Rec; byHour: Rec; byService: Rec; byStaff: Rec; byType: Rec;
  byGstRate: Rec; byPayType: Rec; days: { date: string; revenue: number; bills: number }[];
}
const NUMS = ["revenue", "billCount", "gstCount", "normalCount", "paid", "unpaid", "taxCollected"] as const;
const MAPS = ["byMethod", "byHour", "byService", "byStaff", "byType", "byGstRate", "byPayType"] as const;

export function aggregate(docs: any[]): Agg {
  const a: any = {};
  NUMS.forEach((k) => (a[k] = 0));
  MAPS.forEach((k) => (a[k] = {}));
  const byDay: Record<string, { date: string; revenue: number; bills: number }> = {};
  for (const d of docs) {
    NUMS.forEach((k) => (a[k] += d[k] ?? 0));
    MAPS.forEach((m) => { for (const [k, v] of Object.entries(d[m] ?? {})) a[m][k] = (a[m][k] ?? 0) + (v as number); });
    const x = (byDay[d.date] ??= { date: d.date, revenue: 0, bills: 0 });
    x.revenue += d.revenue ?? 0;
    x.bills += d.billCount ?? 0;
  }
  a.days = Object.values(byDay).sort((p, q) => p.date.localeCompare(q.date));
  return a;
}

// One read per day per business; never touches raw bills.
export async function loadSummaries(businessId: string, from: string, to: string) {
  const ids = businessId === "all" ? ["sam-studio", "parlour"] : [businessId];
  const snap = await getDocs(
    query(collection(db, "summaries"), where("businessId", "in", ids), where("date", ">=", from), where("date", "<=", to))
  );
  return aggregate(snap.docs.map((d) => d.data()));
}