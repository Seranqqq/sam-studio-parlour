import { adminDb, route, HttpError } from "@/lib/admin";
import { areBusinessStaff, removeBill, updateBill } from "@/lib/billing";
import { deleteBillsWithWarning, syncBillWithWarning } from "@/lib/google-sheets";
import type { Bill } from "@/lib/types";

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
  return { ok: true, sheetSyncError: await syncBillWithWarning(id) };
});

export const DELETE = route(async (req, ctx) => {
  const { id } = await ctx.params;
  const snapshot = await adminDb.doc(`bills/${id}`).get();
  const bill = snapshot.data() as Bill | undefined;
  await removeBill(id);
  if (!bill) return { ok: true };
  const sheetSyncError = bill.billType === "gst"
    ? await syncBillWithWarning(id)
    : await deleteBillsWithWarning(bill.businessId, [id]);
  return { ok: true, sheetSyncError };
});