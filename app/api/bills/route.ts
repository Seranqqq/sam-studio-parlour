import { route, HttpError } from "@/lib/admin";
import { createBill } from "@/lib/billing";
import { isBusinessId } from "@/lib/types";

export const POST = route(async (req) => {
  const b = await req.json();
  if (!isBusinessId(b.businessId)) throw new HttpError(400, "Invalid business");
  if (!["normal", "gst"].includes(b.billType)) throw new HttpError(400, "Invalid bill type");
  if (!["owner", "staff"].includes(b.createdBy ?? "owner")) throw new HttpError(400, "Invalid bill entry source");
  if (!["cash", "upi", "card"].includes(b.paymentMethod)) throw new HttpError(400, "Invalid payment method");
  if (typeof b.receiptNumber !== "string" || typeof b.receiptReservationId !== "string")
    throw new HttpError(400, "Receipt number is required");
  delete b.createdAt;
  return { id: await createBill(b) };
});