import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
try { adminDb.settings({ ignoreUndefinedProperties: true }); } catch {}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function requireUser(req: Request, ownerOnly = false) {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");
  const t = await adminAuth.verifyIdToken(h.slice(7));
  const role = t.role as string | undefined;
  if (!role) throw new HttpError(403, "No role assigned");
  if (ownerOnly && role !== "owner") throw new HttpError(403, "Owner only");
  return { uid: t.uid, role, businessIds: (t.businessIds as string[]) ?? [] };
}

export function assertBusiness(u: { role: string; businessIds: string[] }, b: string) {
  if (u.role !== "owner" && !u.businessIds.includes(b)) throw new HttpError(403, "No access to this business");
}

export const route =
  (fn: (req: Request, ctx: any) => Promise<unknown>) => async (req: Request, ctx: any) => {
    try {
      return NextResponse.json(await fn(req, ctx));
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : String(e?.code).startsWith("auth/") ? 401 : 500;
      return NextResponse.json({ error: e?.message ?? "Error" }, { status });
    }
  };