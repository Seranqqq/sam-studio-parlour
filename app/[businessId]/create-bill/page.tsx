"use client";
import { useParams } from "next/navigation";
import BillForm from "@/components/billForm";
import { isBusinessId } from "@/lib/types";

export default function CreateBill() {
  const { businessId } = useParams<{ businessId: string }>();
  if (!isBusinessId(businessId)) return <p>Pick a single business in the header to create a bill.</p>;
  return <BillForm key={businessId} businessId={businessId} />;
}