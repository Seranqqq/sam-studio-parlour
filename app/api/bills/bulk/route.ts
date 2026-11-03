import { adminDb, HttpError, route } from "@/lib/admin";
import { removeBills } from "@/lib/billing";
import { deleteBillsWithWarning, syncAllBillsWithWarning } from "@/lib/google-sheets";
import type { Bill, BusinessId } from "@/lib/types";

export const DELETE = route(async (req) => {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string"))
    throw new HttpError(400, "Invalid bills");
  const snapshots = await Promise.all(ids.map((id) => adminDb.doc(`bills/${id}`).get()));
  const bills = snapshots.flatMap((snapshot) => {
    const bill = snapshot.data() as Bill | undefined;
    return bill ? [{ ...bill, id: snapshot.id }] : [];
  });
  await removeBills(ids, true);
  const warnings: string[] = [];
  const groups = new Map<BusinessId, string[]>();
  let hasCancelledBills = false;
  for (const bill of bills) {
    if (bill.status === "cancelled") continue;
    if (bill.billType === "gst") {
      hasCancelledBills = true;
      continue;
    }
    const group = groups.get(bill.businessId) ?? [];
    group.push(bill.id);
    groups.set(bill.businessId, group);
  }
  for (const [businessId, idsToDelete] of groups) {
    const deletedWarning = await deleteBillsWithWarning(businessId, idsToDelete);
    if (deletedWarning) warnings.push(deletedWarning);
  }
  if (hasCancelledBills) {
    const warning = await syncAllBillsWithWarning();
    if (warning) warnings.push(warning);
  }
  return { ok: true, sheetSyncError: warnings.length ? warnings.join(" ") : undefined };
});
