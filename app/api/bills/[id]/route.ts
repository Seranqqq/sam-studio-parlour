import { route, requireUser } from "@/lib/admin";
import { removeBill, updateBill } from "@/lib/billing";

export const PATCH = route(async (req, ctx) => {
  await requireUser(req, true);
  const { id } = await ctx.params;
  const b = await req.json();
  delete b.createdAt;
  await updateBill(id, b);
  return { ok: true };
});

export const DELETE = route(async (req, ctx) => {
  await requireUser(req, true);
  const { id } = await ctx.params;
  await removeBill(id);
  return { ok: true };
});