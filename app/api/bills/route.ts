import { route, requireUser, assertBusiness, HttpError } from "@/lib/admin";
import { createBill } from "@/lib/billing";
import { isBusinessId } from "@/lib/types";

export const POST = route(async (req) => {
  const u = await requireUser(req);
  const b = await req.json();
  if (!isBusinessId(b.businessId)) throw new HttpError(400, "Invalid business");
  if (!["normal", "gst"].includes(b.billType)) throw new HttpError(400, "Invalid bill type");
  if (!["cash", "upi", "card"].includes(b.paymentMethod)) throw new HttpError(400, "Invalid payment method");
  if (typeof b.receiptNumber !== "string" || typeof b.receiptReservationId !== "string")
    throw new HttpError(400, "Receipt number is required");
  assertBusiness(u, b.businessId);
  delete b.createdAt;
  return { id: await createBill(b, u.uid) };
});