import { randomBytes } from "crypto";
import { route, requireUser, assertBusiness, adminDb, HttpError } from "@/lib/admin";

export const POST = route(async (req) => {
  const u = await requireUser(req);
  const { billId } = await req.json();
  const bill = await adminDb.doc(`bills/${billId}`).get();
  if (!bill.exists) throw new HttpError(404, "Bill not found");
  assertBusiness(u, bill.data()!.businessId);
  const ex = await adminDb.collection("publicShares").where("billId", "==", billId).limit(1).get();
  if (!ex.empty) return { token: ex.docs[0].id };
  const token = randomBytes(16).toString("hex");
  await adminDb.doc(`publicShares/${token}`).set({
    billId, businessId: bill.data()!.businessId, createdAt: Date.now(),
  });
  return { token };
});