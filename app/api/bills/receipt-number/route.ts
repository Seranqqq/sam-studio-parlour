import { HttpError, route } from "@/lib/admin";
import { reserveReceiptNumber } from "@/lib/billing";
import { isBusinessId } from "@/lib/types";

export const POST = route(async (req) => {
  const { businessId, reservationId } = await req.json();
  if (typeof businessId !== "string" || !isBusinessId(businessId))
    throw new HttpError(400, "Invalid business");
  if (typeof reservationId !== "string")
    throw new HttpError(400, "Invalid receipt reservation");
  return { receiptNumber: await reserveReceiptNumber(businessId, reservationId) };
});
