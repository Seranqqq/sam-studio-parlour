import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import type { BillItem, BusinessId, ItemType, PayMethod } from "../lib/types";

loadEnvConfig(process.cwd());

type Svc = { name: string; price: number; type: ItemType; hsn: string; gstRate: number };
const DATA: Record<BusinessId, { name: string; gstin: string; svcs: Svc[]; staff: string[] }> = {
  "sam-studio": {
    name: "Sam Studio", gstin: "27ABCDE1234F1Z5", staff: ["Sam", "Riya"],
    svcs: [
      { name: "Portrait Session", price: 3000, type: "service", hsn: "998383", gstRate: 18 },
      { name: "Wedding Package", price: 25000, type: "package", hsn: "998383", gstRate: 18 },
      { name: "Pre-wedding Shoot", price: 12000, type: "package", hsn: "998383", gstRate: 18 },
      { name: "Photo Album", price: 4500, type: "product", hsn: "4901", gstRate: 12 },
      { name: "Framed Print", price: 800, type: "product", hsn: "4911", gstRate: 12 },
    ],
  },
  parlour: {
    name: "Parlour", gstin: "27PQRST5678G1Z2", staff: ["Anita", "Meera", "Kiran"],
    svcs: [
      { name: "Haircut", price: 400, type: "service", hsn: "999721", gstRate: 18 },
      { name: "Facial", price: 1200, type: "service", hsn: "999721", gstRate: 18 },
      { name: "Hair Colour", price: 2500, type: "service", hsn: "999721", gstRate: 18 },
      { name: "Bridal Makeup", price: 8000, type: "package", hsn: "999721", gstRate: 18 },
      { name: "Gold Membership", price: 5000, type: "membership", hsn: "999721", gstRate: 18 },
    ],
  },
};
const NAMES = ["Asha", "Rahul", "Neha", "Vikram", "Pooja", "Arjun"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function main() {
  const { adminDb: db } = await import("../lib/admin");
  const { createBill, reserveReceiptNumber } = await import("../lib/billing");

  for (const id of Object.keys(DATA) as BusinessId[]) {
    const d = DATA[id];
    await db.doc(`businesses/${id}`).set({
      name: d.name, gstin: d.gstin, address: "12 Main Road, Pune", state: "Maharashtra",
      phone: "9876543210", defaultTaxRate: 18, counters: { normal: 0, gst: 0 },
    });
    const svcDocs: Array<{ id: string; name: string; price: number; type: ItemType; hsn: string; gstRate: number }> = [];
    for (const s of d.svcs) {
      const ref = db.collection("services").doc();
      await ref.set({ ...s, businessId: id, active: true });
      svcDocs.push({ id: ref.id, ...s });
    }
    const custs: { id: string; name: string; phone: string; state: string }[] = [];
    for (let i = 0; i < NAMES.length; i++) {
      const ref = db.collection("customers").doc();
      const c = { name: NAMES[i], phone: `90000000${i}${id === "parlour" ? 1 : 2}`, gstin: "", state: i === 0 ? "Karnataka" : "Maharashtra" };
      await ref.set({ ...c, businessId: id, totalSpent: 0, billCount: 0, lastVisit: null, createdAt: Date.now() });
      custs.push({ id: ref.id, ...c });
    }
    // oldest first so bill numbers are chronological
    for (let day = 20; day >= 0; day--) {
      for (let n = 0; n < 1 + Math.floor(Math.random() * 2); n++) {
        const items: BillItem[] = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => {
          const s = pick(svcDocs);
          return { serviceId: s.id, name: s.name, itemType: s.type, hsn: s.hsn, qty: 1, price: s.price,
            discount: Math.random() < 0.2 ? 100 : 0, gstRate: s.gstRate, staff: pick(d.staff) };
        });
        const c = pick(custs);
        const r = Math.random();
        const when = Date.now() - day * 864e5 - Math.floor(Math.random() * 8 * 36e5);
        const receiptReservationId = randomUUID();
        const receiptNumber = await reserveReceiptNumber(id, receiptReservationId);
        await createBill({
          businessId: id, billType: Math.random() < 0.4 ? "gst" : "normal",
          customer: { id: c.id, name: c.name, phone: c.phone, state: c.state }, items,
          paymentMethod: pick<PayMethod>(["cash", "upi", "card"]),
          paidAmount: r < 0.7 ? 1e9 : r < 0.85 ? 500 : 0, createdAt: when,
          receiptNumber, receiptReservationId,
        });
      }
    }
    console.log("Seeded", id);
  }
  console.log("Done.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });