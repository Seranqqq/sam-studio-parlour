"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/api";
import { fmtDateTime, inr } from "@/lib/format";
import { sel } from "@/lib/ui";
import { isBusinessId, type Bill } from "@/lib/types";
import { downloadInvoicePdf } from "@/lib/download-invoice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Bills() {
  const { businessId } = useParams<{ businessId: string }>();
  const [bills, setBills] = useState<Bill[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!isBusinessId(businessId)) return;
    const s = await getDocs(query(collection(db, "bills"), where("businessId", "==", businessId), orderBy("createdAt", "desc"), limit(300)));
    setBills(s.docs.map((d) => ({ ...(d.data() as Bill), id: d.id })));
  }, [businessId]);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => bills.filter((b) =>
    (!q || (b.billNumber + (b.receiptNumber ?? "") + b.customer.name + (b.customer.phone ?? "")).toLowerCase().includes(q.toLowerCase())) &&
    (!type || b.billType === type) && (!status || b.status === status) && (!method || b.paymentMethod === method) &&
    (!from || b.dateKey >= from) && (!to || b.dateKey <= to)), [bills, q, type, status, method, from, to]);
  const selectedCount = rows.filter((b) => selectedIds.has(b.id)).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const partiallySelected = selectedCount > 0 && !allSelected;

  function updateFilter(setter: (value: string) => void, value: string) {
    setSelectedIds(new Set());
    setter(value);
  }

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = partiallySelected;
  }, [partiallySelected]);

  async function act(fn: () => Promise<unknown>) {
    try { await fn(); await load(); } catch (e: any) { alert(e.message); }
  }

  async function deleteSelected() {
    const ids = rows.filter((b) => selectedIds.has(b.id)).map((b) => b.id);
    if (!ids.length || !confirm("Are you sure you want to delete the selected bills?")) return;
    try {
      await api("/api/bills/bulk", "DELETE", { ids });
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete selected bills");
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Bills History</h1>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
        <Input className="col-span-2" placeholder="Search number, name, phone" value={q} onChange={(e) => updateFilter(setQ, e.target.value)} />
        <select className={sel} value={type} onChange={(e) => updateFilter(setType, e.target.value)}>
          <option value="">All types</option><option value="normal">Normal</option><option value="gst">GST</option></select>
        <select className={sel} value={status} onChange={(e) => updateFilter(setStatus, e.target.value)}>
          <option value="">All status</option><option value="paid">Paid</option><option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option><option value="cancelled">Cancelled</option></select>
        <select className={sel} value={method} onChange={(e) => updateFilter(setMethod, e.target.value)}>
          <option value="">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select>
        <div className="flex gap-1"><Input type="date" value={from} onChange={(e) => updateFilter(setFrom, e.target.value)} />
          <Input type="date" value={to} onChange={(e) => updateFilter(setTo, e.target.value)} /></div>
      </div>
      {selectedCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" className="text-red-600" onClick={deleteSelected}>
            Delete Selected ({selectedCount})
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader><TableRow>
            <TableHead>
              <label className="flex items-center gap-2 whitespace-nowrap">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  aria-label="Select all visible bills"
                  checked={allSelected}
                  disabled={rows.length === 0}
                  className="size-4 accent-primary"
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSelectedIds((current) => {
                      const next = new Set(current);
                      rows.forEach((b) => {
                        if (checked) next.add(b.id);
                        else next.delete(b.id);
                      });
                      return next;
                    });
                  }}
                />
                Select All
              </label>
            </TableHead>
            <TableHead>Receipt No.</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Type</TableHead>
            <TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead />
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Select bill ${b.billNumber}`}
                    checked={selectedIds.has(b.id)}
                    className="size-4 accent-primary"
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (checked) next.add(b.id);
                        else next.delete(b.id);
                        return next;
                      });
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">{b.receiptNumber ?? "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{fmtDateTime(b.createdAt)}</TableCell>
                <TableCell>{b.customer.name}</TableCell>
                <TableCell><Badge variant={b.billType === "gst" ? "default" : "secondary"}>{b.billType.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-right">{inr(b.total)}</TableCell>
                <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                <TableCell className="space-x-1 whitespace-nowrap text-right">
                  <Button size="sm" variant="outline" asChild><Link href={`/${businessId}/bills/${b.id}`}>View</Link></Button>
                  <Button size="sm" variant="outline" onClick={() => downloadInvoicePdf(b)}>
                    Download PDF
                  </Button>
                  {b.status !== "cancelled" && b.status !== "paid" && (
                    <Button size="sm" variant="outline" onClick={() => act(() => api(`/api/bills/${b.id}/pay`, "POST", {
                      businessId, amount: Math.round((b.total - b.paidAmount) * 100) / 100,
                      method: b.paymentMethod, paymentId: crypto.randomUUID(),
                    }))}>Mark paid</Button>)}
                  {b.status !== "cancelled" && (
                    <Button size="sm" variant="outline" className="text-red-600"
                      onClick={() => confirm(b.billType === "gst" ? "Cancel this GST invoice?" : "Delete this bill?") && act(() => api(`/api/bills/${b.id}`, "DELETE"))}>
                      {b.billType === "gst" ? "Cancel" : "Delete"}</Button>)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No bills</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}