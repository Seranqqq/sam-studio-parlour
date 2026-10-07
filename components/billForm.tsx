"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/api";
import { computeTotals } from "@/lib/calc";
import { inr } from "@/lib/format";
import { sel } from "@/lib/ui";
import type { Bill, BillEntryBy, BillItem, BillType, BusinessId, CustomerSnap, PayMethod, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const blank = (): BillItem => ({ name: "", itemType: "service", qty: 1, price: 0, discount: 0, gstRate: 0 });
const emptyCust: CustomerSnap = { name: "", phone: "", gstin: "", state: "" };

export default function BillForm({ businessId, initial }: { businessId: BusinessId; initial?: Bill }) {
  const router = useRouter();
  const [billType, setBillType] = useState<BillType>(initial?.billType ?? "normal");
  const [cust, setCust] = useState<CustomerSnap>(initial?.customer ?? emptyCust);
  const [items, setItems] = useState<BillItem[]>(initial?.items ?? [blank()]);
  const [method, setMethod] = useState<PayMethod>(initial?.paymentMethod ?? "cash");
  const [createdBy, setCreatedBy] = useState<BillEntryBy>(initial?.createdBy ?? "owner");
  const [paid, setPaid] = useState<string>(initial ? String(initial.paidAmount) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [services, setServices] = useState<Service[]>([]);
  const [bizState, setBizState] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [receiptReservationId, setReceiptReservationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getDocs(query(collection(db, "services"), where("businessId", "==", businessId))).then((s) =>
      setServices(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Service).filter((x) => x.active)));
    getDoc(doc(db, "businesses", businessId)).then((s) => setBizState(s.data()?.state ?? ""));
  }, [businessId]);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    async function reserve() {
      try {
        const key = `bill-receipt-reservation-${businessId}`;
        const id = sessionStorage.getItem(key) ?? crypto.randomUUID();
        sessionStorage.setItem(key, id);
        const result = await api<{ receiptNumber: string }>("/api/bills/receipt-number", "POST", {
          businessId, reservationId: id,
        });
        if (!cancelled) {
          setReceiptReservationId(id);
          setReceiptNumber(result.receiptNumber);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Could not reserve a receipt number");
      }
    }
    void reserve();
    return () => { cancelled = true; };
  }, [businessId, initial]);

  const interState = billType === "gst" && !!cust.state && !!bizState &&
    cust.state.trim().toLowerCase() !== bizState.trim().toLowerCase();
  const t = useMemo(
    () => computeTotals(items.filter((i) => i.name && i.qty > 0), billType, interState),
    [items, billType, interState]
  );
  const paidNum = paid === "" ? t.total : Number(paid);

  const setItem = (i: number, p: Partial<BillItem>) =>
    setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));

  function pickService(i: number, id: string) {
    const s = services.find((x) => x.id === id);
    if (!s) return;
    setItem(i, { serviceId: s.id, name: s.name, itemType: s.type, price: s.price, hsn: s.hsn, gstRate: billType === "gst" ? s.gstRate : 0 });
  }
  function switchType(bt: BillType) {
    setBillType(bt);
    if (bt === "gst")
      setItems((xs) => xs.map((x) => ({ ...x, gstRate: x.gstRate || services.find((s) => s.id === x.serviceId)?.gstRate || 0 })));
  }

  async function submit() {
    setErr("");
    if (!initial && (!receiptNumber || !receiptReservationId)) return setErr("Receipt number is still being prepared. Please try again.");
    if (!items.some((i) => i.name && i.qty > 0)) return setErr("Add at least one item");
    setBusy(true);
    try {
      const body = {
        businessId, billType, customer: cust, items: items.filter((i) => i.name),
        paymentMethod: method, paidAmount: paidNum, notes, createdBy,
        ...(initial ? {} : { receiptNumber, receiptReservationId }),
      };
      const r = initial ? await api(`/api/bills/${initial.id}`, "PATCH", body) : await api("/api/bills", "POST", body);
      router.push(`/${businessId}/bills/${initial ? initial.id : r.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save bill");
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 space-y-4 pb-24 md:pb-4 [&_input]:h-11">
      <div className="grid grid-cols-2 gap-2">
        {(["normal", "gst"] as BillType[]).map((bt) => (
          <Button key={bt} type="button" variant={billType === bt ? "default" : "outline"} className="h-11"
            disabled={!!initial && initial.billType !== bt} onClick={() => switchType(bt)}>
            {bt === "normal" ? "Normal Bill" : "GST Bill"}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Customer</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {!initial && (
            <div><Label className="mb-1">Receipt Number</Label>
              <Input readOnly value={receiptNumber} placeholder="Generating receipt number…" /></div>
          )}
          <div><Label className="mb-1">Customer Name</Label>
            <Input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} /></div>
          <div><Label className="mb-1">WhatsApp / phone (saves customer)</Label>
            <Input type="tel" inputMode="tel" placeholder="10-digit mobile number" value={cust.phone ?? ""}
              onChange={(e) => setCust({ ...cust, phone: e.target.value })} /></div>
          {billType === "gst" && (
            <>
              <div><Label className="mb-1">Customer GSTIN (optional)</Label>
                <Input value={cust.gstin ?? ""} onChange={(e) => setCust({ ...cust, gstin: e.target.value.toUpperCase() })} /></div>
              <div><Label className="mb-1">State (place of supply)</Label>
                <Input value={cust.state ?? ""} placeholder={bizState} onChange={(e) => setCust({ ...cust, state: e.target.value })} />
                <p className="mt-1 text-xs text-muted-foreground">{interState ? "Different state: IGST applies" : "Same state: CGST + SGST"}</p></div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50/60 p-3 sm:grid-cols-6">
              <select className={`${sel} col-span-2 sm:col-span-3`} value={it.serviceId ?? ""} onChange={(e) => pickService(i, e.target.value)}>
                <option value="">Pick from catalog…</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name} · {inr(s.price)}</option>)}
              </select>
              <Input className="col-span-2 sm:col-span-3" placeholder="Item name" value={it.name} onChange={(e) => setItem(i, { name: e.target.value })} />
              <div><Label className="mb-1 text-xs">Qty</Label>
                <Input type="number" inputMode="numeric" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Number(e.target.value) })} /></div>
              <div><Label className="mb-1 text-xs">Price</Label>
                <Input type="number" inputMode="decimal" min={0} value={it.price} onChange={(e) => setItem(i, { price: Number(e.target.value) })} /></div>
              <div><Label className="mb-1 text-xs">Discount ₹</Label>
                <Input type="number" inputMode="decimal" min={0} value={it.discount} onChange={(e) => setItem(i, { discount: Number(e.target.value) })} /></div>
              {billType === "gst" ? (
                <>
                  <div><Label className="mb-1 text-xs">GST %</Label>
                    <select className={sel} value={it.gstRate} onChange={(e) => setItem(i, { gstRate: Number(e.target.value) })}>
                      {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select></div>
                  <div><Label className="mb-1 text-xs">HSN/SAC</Label>
                    <Input value={it.hsn ?? ""} onChange={(e) => setItem(i, { hsn: e.target.value })} /></div>
                </>
              ) : <div className="col-span-2" />}   
              <div className="col-span-2 flex justify-end sm:col-span-6">
                <Button type="button" variant="outline" className="h-11 md:h-9"
                  onClick={() => setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs))}>Remove</Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" className="h-11 w-full md:h-9 md:w-auto"
            onClick={() => setItems((xs) => [...xs, blank()])}>+ Add item</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
          <div><Label className="mb-1">Bill entered by</Label>
            <select className={sel} value={createdBy} onChange={(e) => setCreatedBy(e.target.value as BillEntryBy)}>
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select></div>
          <div><Label className="mb-1">Payment method</Label>
            <select className={sel} value={method} onChange={(e) => setMethod(e.target.value as PayMethod)}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option>
            </select></div>
          <div><Label className="mb-1">Advance(Optional)</Label>
            <Input type="number" inputMode="decimal" min={0} placeholder={String(t.total)} value={paid} onChange={(e) => setPaid(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label className="mb-1">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="space-y-1 text-sm sm:col-span-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{inr(t.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- {inr(t.discount)}</span></div>
            {billType === "gst" && (interState
              ? <div className="flex justify-between"><span>IGST</span><span>{inr(t.igst)}</span></div>
              : <><div className="flex justify-between"><span>CGST</span><span>{inr(t.cgst)}</span></div>
                  <div className="flex justify-between"><span>SGST</span><span>{inr(t.sgst)}</span></div></>)}
            <div className="flex justify-between border-t pt-1 text-lg font-semibold"><span>Total</span><span>{inr(t.total)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Balance</span><span>{inr(Math.max(t.total - paidNum, 0))}</span></div>
          </div>
        </CardContent>
      </Card>

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* Sticky total + submit bar (sits above the mobile tab bar) */}
      <div className="sticky bottom-0 z-10 -mx-3 flex items-center gap-3 border-t bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <div className="md:hidden">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold leading-tight">{inr(t.total)}</p>
        </div>
        <Button className="h-11 flex-1" size="lg" disabled={busy} onClick={submit}>
          {busy ? "Saving…" : initial ? "Save changes" : `Create ${billType === "gst" ? "GST invoice" : "bill"}`}
        </Button>
      </div>
    </div>
  );
}