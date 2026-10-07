"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { dateParts, fmtDateTime, inr } from "@/lib/format";
import { isBusinessId, type Customer } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function Customers() {
  const { businessId } = useParams<{ businessId: string }>();
  const [list, setList] = useState<Customer[]>([]);
  const [itemsByCustomer, setItemsByCustomer] = useState<Record<string, string[]>>({});
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    if (!isBusinessId(businessId)) return;

    const [customerSnap, billSnap] = await Promise.all([
      getDocs(query(collection(db, "customers"), where("businessId", "==", businessId), orderBy("name"))),
      getDocs(query(collection(db, "bills"), where("businessId", "==", businessId), orderBy("createdAt", "desc"))),
    ]);

    const nextList = customerSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer);
    const itemMap: Record<string, Set<string>> = {};

    billSnap.docs.forEach((d) => {
      const bill = d.data() as { customer?: { id?: string; name?: string }; items?: Array<{ name?: string }> };
      const customerId = bill.customer?.id ?? "";
      if (!customerId) return;
      const names = itemMap[customerId] ?? new Set<string>();
      (bill.items ?? []).forEach((item) => {
        const name = item.name?.trim();
        if (name) names.add(name);
      });
      itemMap[customerId] = names;
    });

    setList(nextList);
    setItemsByCustomer(Object.fromEntries(
      Object.entries(itemMap).map(([id, values]) => [id, [...values].sort((a, b) => a.localeCompare(b))])
    ));
  }, [businessId]);
  useEffect(() => { load(); }, [load]);

  const shown = list.filter((c) => {
    const search = q.trim().toLowerCase();
    const items = itemsByCustomer[c.id] ?? [];
    const matchesSearch = c.name.toLowerCase().includes(search)
      || (c.phone ?? "").toLowerCase().includes(search)
      || items.some((item) => item.toLowerCase().includes(search));
    const timestamp = typeof c.createdAt === "number" ? c.createdAt : c.lastVisit;
    const matchesDate = !date || (typeof timestamp === "number" && dateParts(timestamp).dateKey === date);
    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Search customer, phone, or item" value={q} onChange={(e) => setQ(e.target.value)} />
        <Input type="date" aria-label="Filter customers by date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-2">
        {shown.map((c) => {
          const items = itemsByCustomer[c.id] ?? [];
          return (
            <Card key={c.id}><CardContent className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.phone} {c.gstin ? `· ${c.gstin}` : ""} {c.state ? `· ${c.state}` : ""}</p>
                <p className="text-xs text-muted-foreground">
                  Date &amp; time: {typeof c.createdAt === "number" ? fmtDateTime(c.createdAt) :
                    typeof c.lastVisit === "number" ? fmtDateTime(c.lastVisit) : "Unavailable"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Items: {items.length ? items.join(", ") : "No purchase history"}
                </p>
              </div>
              <div className="text-right">
                <p>{inr(c.totalSpent)}</p>
                <p className="text-xs text-muted-foreground">{c.billCount} bills</p>
              </div>
            </CardContent></Card>
          );
        })}
      </div>
    </div>
  );
}