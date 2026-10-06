import { route, requireUser, adminAuth, adminDb, HttpError } from "@/lib/admin";

export const POST = route(async (req) => {
  await requireUser(req, true);
  const { email, password, name, role, businessIds } = await req.json();
  if (!email || !["owner", "staff"].includes(role)) throw new HttpError(400, "Invalid user");
  const ids: string[] = businessIds ?? [];

  let u;
  try {
    u = await adminAuth.getUserByEmail(email);                 // person already signed up
  } catch (e: any) {
    if (e?.code !== "auth/user-not-found") throw e;
    if (!password || password.length < 6) throw new HttpError(400, "Password (min 6) required for a new user");
    u = await adminAuth.createUser({ email, password, displayName: name });
  }
  await adminAuth.setCustomUserClaims(u.uid, { role, businessIds: ids });
  await adminDb.doc(`users/${u.uid}`).set({ name: name || u.displayName || "", email, role, businessIds: ids });
  return { uid: u.uid };
});