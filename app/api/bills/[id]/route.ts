import { route, HttpError } from "@/lib/admin";
import { areBusinessStaff, removeBill, updateBill } from "@/lib/billing";

export const PATCH = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const b = await req.json();
  if (b.createdBy !== undefined && !["owner", "staff"].includes(b.createdBy))
    throw new HttpError(400, "Invalid bill entry source");
  const staffNames = b.createdByNames ?? (b.createdByName ? [b.createdByName] : []);
  if (b.createdBy === "staff" && !await areBusinessStaff(b.businessId, staffNames))
    throw new HttpError(400, "Select a valid staff member");
  delete b.createdAt;
  await updateBill(id, b);
  return { ok: true };
});

export const DELETE = route(async (req, ctx) => {
  const { id } = await ctx.params;
  await removeBill(id);
  return { ok: true };
});