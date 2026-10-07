import { HttpError, route } from "@/lib/admin";
import { payBill } from "@/lib/billing";
import { isBusinessId } from "@/lib/types";

export const POST = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") throw new HttpError(400, "Invalid payment details");
  const { amount, method, paymentId, businessId } = body;
  if (!isBusinessId(businessId)) throw new HttpError(400, "Invalid business");
  if (typeof amount !== "number") throw new HttpError(400, "Payment amount is required");
  if (!["cash", "upi", "card"].includes(method)) throw new HttpError(400, "Invalid payment method");
  if (typeof paymentId !== "string") throw new HttpError(400, "Payment ID is required");
  await payBill(id, businessId, amount, method, paymentId);
  return { ok: true };
});