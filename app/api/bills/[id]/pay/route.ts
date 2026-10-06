import { route, requireUser } from "@/lib/admin";
import { payBill } from "@/lib/billing";

export const POST = route(async (req, ctx) => {
  await requireUser(req, true);
  const { id } = await ctx.params;
  const { amount, method } = await req.json().catch(() => ({}));
  await payBill(id, amount, method);
  return { ok: true };
});