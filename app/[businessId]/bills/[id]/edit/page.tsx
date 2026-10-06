"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BillForm from "@/components/billForm";
import type { Bill } from "@/lib/types";

export default function EditBill() {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  useEffect(() => {
    getDoc(doc(db, "bills", id)).then((s) => s.exists() && setBill({ ...(s.data() as Bill), id: s.id }));
  }, [id]);
  if (!bill) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return <BillForm businessId={bill.businessId} initial={bill} />;
}