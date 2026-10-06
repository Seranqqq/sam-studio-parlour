import { route } from "@/lib/admin";
import { payBill } from "@/lib/billing";

export const POST = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const { amount, method } = await req.json().catch(() => ({}));
  await payBill(id, amount, method);
  return { ok: true };
});