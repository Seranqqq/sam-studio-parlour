"use client";

import { useParams } from "next/navigation";

export function useBusinessId() {
  const { businessId } = useParams<{ businessId: string }>();
  return decodeURIComponent(businessId);
}
