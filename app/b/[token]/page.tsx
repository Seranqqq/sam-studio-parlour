import { notFound } from "next/navigation";
import { adminDb } from "@/lib/admin";
import InvoiceView from "@/components/InvoiceView";
import PrintButton from "@/components/PrintButton";
import type { Bill } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await adminDb.doc(`publicShares/${token}`).get();
  if (!s.exists) notFound();
  const b = await adminDb.doc(`bills/${s.data()!.billId}`).get();
  if (!b.exists) notFound();
  return (
    <div className="mx-auto max-w-3xl p-3">
      <InvoiceView bill={b.data() as Bill} />
      <PrintButton />
    </div>
  );
}