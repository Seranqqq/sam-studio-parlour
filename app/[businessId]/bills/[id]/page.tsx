"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { api } from "@/lib/api";
import { downloadInvoicePdf } from "@/lib/download-invoice";
import InvoiceView from "@/components/InvoiceView";
import { Button } from "@/components/ui/button";
import type { Bill } from "@/lib/types";

export default function BillPage() {
  const { businessId, id } = useParams<{ businessId: string; id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [link, setLink] = useState("");

  useEffect(() => {
    getDoc(doc(db, "bills", id)).then((s) => s.exists() && setBill({ ...(s.data() as Bill), id: s.id }));
  }, [id]);

  async function share() {
    const { token } = await api("/api/share", "POST", { billId: id });
    const url = `${location.origin}/b/${token}`;
    setLink(url);
    navigator.clipboard?.writeText(url);
  }
  if (!bill) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="no-print mb-3 flex flex-wrap gap-2">
        <Button onClick={() => downloadInvoicePdf(bill)}>Download PDF</Button>
        <Button variant="outline" onClick={share}>Share link</Button>
        {bill.status !== "cancelled" && (
          <Button variant="outline" asChild><Link href={`/${businessId}/bills/${id}/edit`}>Edit</Link></Button>
        )}
        <Button variant="outline" asChild><Link href={`/${businessId}/create-bill`}>New bill</Link></Button>
      </div>
      {link && <p className="no-print mb-3 break-all rounded bg-green-50 p-2 text-sm">Link copied: {link}</p>}
      <InvoiceView bill={bill} />
    </div>
  );
}