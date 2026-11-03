"use client";
import BillForm from "@/components/billForm";
import { isBusinessId } from "@/lib/types";
import { useBusinessId } from "@/lib/use-business-id";

export default function CreateBill() {
  const businessId = useBusinessId();
  if (!isBusinessId(businessId)) return <p>Pick a single business in the header to create a bill.</p>;
  return <BillForm key={businessId} businessId={businessId} />;
}