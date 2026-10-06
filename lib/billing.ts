import { FieldValue, Transaction } from "firebase-admin/firestore";
import { adminDb as db, HttpError } from "./admin";
import { computeTotals, statusFor } from "./calc";
import { dateParts } from "./format";
import { BUSINESSES, type Bill, type BillInput, type BillItem, type PayMethod } from "./types";

type Flat = Record<string, number>;
const key = (s: string) => String(s).replace(/[.\/~*\[\]\s]+/g, "_").slice(0, 60) || "x";
const addFlat = (f: Flat, p: string, n: number) => { f[p] = (f[p] ?? 0) + n; };

// Adds (sign=1) or removes (sign=-1) a bill's contribution to a daily summary.
function flatten(b: Bill, sign: 1 | -1, f: Flat) {
  const { hour } = dateParts(b.createdAt);
  addFlat(f, "revenue", sign * b.total);
  addFlat(f, "billCount", sign);
  addFlat(f, b.billType === "gst" ? "gstCount" : "normalCount", sign);
  addFlat(f, "paid", sign * b.paidAmount);
  addFlat(f, "unpaid", sign * (b.total - b.paidAmount));
  addFlat(f, "taxCollected", sign * b.tax);
  addFlat(f, `byMethod.${b.paymentMethod}`, sign * b.total);
  addFlat(f, `byHour.${hour}`, sign * b.total);
  for (const [r, t] of Object.entries(b.taxByRate)) addFlat(f, `byGstRate.${key(r)}`, sign * t);
  for (const it of b.items) {
    const v = it.qty * it.price - it.discount;
    addFlat(f, `byService.${key(it.name)}`, sign * v);
    addFlat(f, `byStaff.${key(it.staff || "unassigned")}`, sign * v);
    addFlat(f, `byType.${it.itemType}`, sign * v);
  }
}

function patch(f: Flat, extra: object) {
  const out: any = { ...extra };
  for (const [p, n] of Object.entries(f)) {
    if (!n) continue;
    const parts = p.split(".");
    let o = out;
    parts.slice(0, -1).forEach((k) => (o = o[k] ??= {}));
    o[parts[parts.length - 1]] = FieldValue.increment(Math.round(n * 100) / 100);
  }
  return out;
}

const sumRef = (b: string, d: string) => db.doc(`summaries/${b}_${d}`);

function cleanItems(items: BillItem[]): BillItem[] {
  const out = (items ?? [])
    .map((i) => ({
      ...i, name: String(i.name || "").trim(), qty: Number(i.qty), price: Number(i.price),
      discount: Number(i.discount) || 0, gstRate: Number(i.gstRate) || 0, itemType: i.itemType || "service",
    }))
    .filter((i) => i.name);
  if (!out.length || out.some((i) => !(i.qty > 0) || i.price < 0 || i.discount < 0 || i.gstRate < 0 || i.gstRate > 28))
    throw new HttpError(400, "Invalid items");
  return out;
}

const writeItems = (tx: Transaction, b: Bill) =>
  b.items.forEach((it) =>
    tx.set(db.collection("billItems").doc(), { ...it, businessId: b.businessId, billId: b.id, createdAt: b.createdAt }));

const isInterState = (billType: string, custState?: string, bizState?: string) =>
  billType === "gst" && !!custState && !!bizState && custState.trim().toLowerCase() !== bizState.trim().toLowerCase();

export async function reserveReceiptNumber(businessId: string, uid: string, reservationId: string) {
  if (!/^[\da-f-]{36}$/i.test(reservationId)) throw new HttpError(400, "Invalid receipt reservation");
  const reservationRef = db.doc(`receiptReservations/${businessId}_${uid}_${reservationId}`);
  const bizRef = db.doc(`businesses/${businessId}`);

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(reservationRef);
    const reservedNumber = existing.data()?.receiptNumber;
    if (typeof reservedNumber === "string") return reservedNumber;

    const [bizSnap, billsSnap] = await Promise.all([
      tx.get(bizRef),
      tx.get(db.collection("bills").where("businessId", "==", businessId)),
    ]);
    const biz = bizSnap.data();
    if (!biz) throw new HttpError(404, "Business not found");

    let lastNumber = Number(biz.counters?.receipt) || 0;
    for (const bill of billsSnap.docs) {
      const data = bill.data();
      for (const value of [data.receiptNumber, data.billNumber]) {
        const match = typeof value === "string" ? /^REC-(\d+)$/.exec(value) : null;
        if (match) lastNumber = Math.max(lastNumber, Number(match[1]));
      }
    }

    const receiptNumber = `REC-${String(lastNumber + 1).padStart(6, "0")}`;
    tx.set(reservationRef, { businessId, uid, receiptNumber });
    tx.update(bizRef, { "counters.receipt": lastNumber + 1 });
    return receiptNumber;
  });
}

export async function createBill(inp: BillInput, uid: string) {
  const { businessId, billType } = inp;
  if (!/^REC-\d{6,}$/.test(inp.receiptNumber ?? "") || !/^[\da-f-]{36}$/i.test(inp.receiptReservationId ?? ""))
    throw new HttpError(400, "Receipt number is missing or invalid");
  const items = cleanItems(inp.items);
  const customer = { ...inp.customer, name: inp.customer?.name?.trim() || "Walk-in" };
  const createdAt = inp.createdAt ?? Date.now();
  const { dateKey } = dateParts(createdAt);
  const bizRef = db.doc(`businesses/${businessId}`);
  const billRef = db.collection("bills").doc();
  const reservationRef = db.doc(`receiptReservations/${businessId}_${uid}_${inp.receiptReservationId}`);

  await db.runTransaction(async (tx) => {
    const [bizSnap, custSnap, reservationSnap] = await Promise.all([
      tx.get(bizRef),
      customer.id ? tx.get(db.doc(`customers/${customer.id}`)) : Promise.resolve(null),
      tx.get(reservationRef),
    ]);
    const biz = bizSnap.data();
    if (!biz) throw new HttpError(404, "Business not found");
    if (custSnap && custSnap.data()?.businessId !== businessId) throw new HttpError(400, "Bad customer");
    if (reservationSnap.data()?.receiptNumber !== inp.receiptNumber)
      throw new HttpError(409, "Receipt number reservation expired. Refresh the page and try again.");

    const seq = (biz.counters?.[billType] ?? 0) + 1;
    const { prefix } = BUSINESSES[businessId];
    const num = String(seq).padStart(4, "0");
    const billNumber = billType === "gst" ? `${prefix}-GST-${num}` : `${prefix}-${num}`;
    const interState = isInterState(billType, customer.state, biz.state);
    const t = computeTotals(items, billType, interState);
    const paid = Math.min(Math.max(Number(inp.paidAmount) || 0, 0), t.total);
    const customerId = customer.id ?? (customer.phone?.trim() ? db.collection("customers").doc().id : undefined);

    const bill: Bill = {
      ...t, id: billRef.id, businessId, billType, billNumber, receiptNumber: inp.receiptNumber, seq,
      customer: { ...customer, id: customerId }, items, paymentMethod: inp.paymentMethod,
      paidAmount: paid, status: statusFor(t.total, paid), interState,
      business: { name: biz.name, gstin: biz.gstin, address: biz.address, state: biz.state, phone: biz.phone },
      createdBy: uid, createdAt, dateKey, notes: inp.notes,
    };
    tx.set(billRef, bill);
    writeItems(tx, bill);

    const payType = paid >= t.total ? "full" : "advance";
    if (paid > 0)
      tx.set(db.collection("payments").doc(), {
        businessId, billId: billRef.id, amount: paid, method: inp.paymentMethod, type: payType, createdAt,
      });

    const f: Flat = {};
    flatten(bill, 1, f);
    if (paid > 0) addFlat(f, `byPayType.${payType}`, paid);
    tx.set(sumRef(businessId, dateKey), patch(f, { businessId, date: dateKey }), { merge: true });
    tx.update(bizRef, { [`counters.${billType}`]: seq });
    tx.delete(reservationRef);

    if (customerId)
      tx.set(db.doc(`customers/${customerId}`), {
        businessId, name: customer.name, phone: customer.phone ?? "", gstin: customer.gstin ?? "",
        state: customer.state ?? "", lastVisit: createdAt,
        totalSpent: FieldValue.increment(t.total), billCount: FieldValue.increment(1),
        ...(custSnap ? {} : { createdAt }),
      }, { merge: true });
  });
  return billRef.id;
}

export async function updateBill(id: string, inp: BillInput) {
  const ref = db.doc(`bills/${id}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const old = snap.data() as Bill | undefined;
    if (!old) throw new HttpError(404, "Bill not found");
    if (old.status === "cancelled") throw new HttpError(400, "Bill is cancelled");
    const [bizSnap, itemsQ] = await Promise.all([
      tx.get(db.doc(`businesses/${old.businessId}`)),
      tx.get(db.collection("billItems").where("billId", "==", id)),
    ]);
    const items = cleanItems(inp.items);
    const customer = { ...inp.customer, id: old.customer.id, name: inp.customer?.name?.trim() || "Walk-in" };
    const interState = isInterState(old.billType, customer.state, bizSnap.data()?.state);
    const t = computeTotals(items, old.billType, interState);
    const paid = Math.min(Math.max(Number(inp.paidAmount) || 0, 0), t.total);
    const bill: Bill = {
      ...old, ...t, items, customer, paymentMethod: inp.paymentMethod, paidAmount: paid,
      status: statusFor(t.total, paid), interState, notes: inp.notes,
    };
    tx.set(ref, bill);
    itemsQ.docs.forEach((d) => tx.delete(d.ref));
    writeItems(tx, bill);
    const f: Flat = {};
    flatten(old, -1, f);
    flatten(bill, 1, f);
    tx.set(sumRef(old.businessId, old.dateKey), patch(f, { businessId: old.businessId, date: old.dateKey }), { merge: true });
    if (old.customer.id)
      tx.set(db.doc(`customers/${old.customer.id}`), { totalSpent: FieldValue.increment(t.total - old.total) }, { merge: true });
  });
}

export async function payBill(id: string, amount?: number, method?: PayMethod) {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`bills/${id}`);
    const b = (await tx.get(ref)).data() as Bill | undefined;
    if (!b) throw new HttpError(404, "Bill not found");
    if (b.status === "cancelled") throw new HttpError(400, "Bill is cancelled");
    const due = b.total - b.paidAmount;
    const amt = Math.min(amount && amount > 0 ? amount : due, due);
    if (amt <= 0) throw new HttpError(400, "Nothing due");
    const paid = b.paidAmount + amt;
    tx.update(ref, { paidAmount: paid, status: statusFor(b.total, paid) });
    tx.set(db.collection("payments").doc(), {
      businessId: b.businessId, billId: id, amount: amt, method: method ?? b.paymentMethod, type: "balance", createdAt: Date.now(),
    });
    const f: Flat = {};
    addFlat(f, "paid", amt); addFlat(f, "unpaid", -amt); addFlat(f, "byPayType.balance", amt);
    tx.set(sumRef(b.businessId, b.dateKey), patch(f, { businessId: b.businessId, date: b.dateKey }), { merge: true });
  });
}

// Normal bills are deleted; GST bills are cancelled so the number sequence stays gapless.
export async function removeBills(ids: string[], skipCancelled = false) {
  if (!ids.length || ids.length > 300 || ids.some((id) => !id) || new Set(ids).size !== ids.length)
    throw new HttpError(400, "Invalid bills");

  const selected = await Promise.all(ids.map(async (id) => {
    const snapshot = await db.doc(`bills/${id}`).get();
    const bill = snapshot.data() as Bill | undefined;
    if (!bill) throw new HttpError(404, "Bill not found");
    if (bill.status === "cancelled" && !skipCancelled) throw new HttpError(400, "Already cancelled");
    return { id, bill };
  }));
  const active = selected.filter(({ bill }) => bill.status !== "cancelled");
  if (!active.length) return;

  const childCounts = new Map<string, { items: number; payments: number }>();
  for (let i = 0; i < active.length; i += 30) {
    const batchIds = active.slice(i, i + 30).map(({ id }) => id);
    const [items, payments] = await Promise.all([
      db.collection("billItems").where("billId", "in", batchIds).get(),
      db.collection("payments").where("billId", "in", batchIds).get(),
    ]);
    batchIds.forEach((id) => childCounts.set(id, { items: 0, payments: 0 }));
    items.docs.forEach((doc) => {
      const id = doc.get("billId") as string;
      const counts = childCounts.get(id);
      if (counts) counts.items += 1;
    });
    payments.docs.forEach((doc) => {
      const id = doc.get("billId") as string;
      const counts = childCounts.get(id);
      if (counts) counts.payments += 1;
    });
  }

  const writeCount = (bills: typeof active) => {
    const summaries = new Set(bills.map(({ bill }) => `${bill.businessId}_${bill.dateKey}`));
    const customers = new Set(bills.map(({ bill }) => bill.customer.id).filter(Boolean));
    return bills.reduce((count, { id, bill }) => {
      const children = bill.billType === "gst" ? 0 : childCounts.get(id)!.items + childCounts.get(id)!.payments;
      return count + 1 + children;
    }, summaries.size + customers.size);
  };

  const batches: typeof active[] = [];
  let batch: typeof active = [];
  for (const entry of active) {
    if (writeCount([...batch, entry]) > 400) {
      if (!batch.length) throw new HttpError(400, "A selected bill has too many related records to delete safely");
      batches.push(batch);
      batch = [];
    }
    batch.push(entry);
  }
  if (batch.length) batches.push(batch);

  for (const batchBills of batches) {
    await db.runTransaction(async (tx) => {
      const snapshots = await Promise.all(batchBills.map(({ id }) => tx.get(db.doc(`bills/${id}`))));
      const bills = snapshots.map((snapshot) => {
        const bill = snapshot.data() as Bill | undefined;
        if (!bill) throw new HttpError(404, "Bill not found");
        return { id: snapshot.id, ref: snapshot.ref, bill };
      }).filter(({ bill }) => bill.status !== "cancelled");
      if (!bills.length) return;

      const related = await Promise.all(bills.map(({ id }) => Promise.all([
        tx.get(db.collection("billItems").where("billId", "==", id)),
        tx.get(db.collection("payments").where("billId", "==", id)),
      ])));
      const summaries = new Map<string, { businessId: string; date: string; values: Flat }>();
      const customers = new Map<string, { totalSpent: number; billCount: number }>();
      bills.forEach(({ ref, bill }, index) => {
        const summaryId = `${bill.businessId}_${bill.dateKey}`;
        let summary = summaries.get(summaryId);
        if (!summary) {
          summary = { businessId: bill.businessId, date: bill.dateKey, values: {} };
          summaries.set(summaryId, summary);
        }
        flatten(bill, -1, summary.values);

        if (bill.customer.id) {
          const customer = customers.get(bill.customer.id) ?? { totalSpent: 0, billCount: 0 };
          customer.totalSpent -= bill.total;
          customer.billCount -= 1;
          customers.set(bill.customer.id, customer);
        }

        if (bill.billType === "gst") tx.update(ref, { status: "cancelled" });
        else {
          tx.delete(ref);
          related[index][0].docs.forEach((doc) => tx.delete(doc.ref));
          related[index][1].docs.forEach((doc) => tx.delete(doc.ref));
        }
      });

      summaries.forEach(({ businessId, date, values }) => {
        tx.set(sumRef(businessId, date), patch(values, { businessId, date }), { merge: true });
      });
      customers.forEach((values, id) => {
        tx.set(db.doc(`customers/${id}`), {
          totalSpent: FieldValue.increment(values.totalSpent),
          billCount: FieldValue.increment(values.billCount),
        }, { merge: true });
      });
    });
  }
}

export async function removeBill(id: string) {
  await removeBills([id]);
}