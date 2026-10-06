import { cert, getApps, initializeApp } from "firebase-admin/app";
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
try { adminDb.settings({ ignoreUndefinedProperties: true }); } catch {}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export const route =
  (fn: (req: Request, ctx: any) => Promise<unknown>) => async (req: Request, ctx: any) => {
    try {
      return NextResponse.json(await fn(req, ctx));
    } catch (e: any) {
      const status = e instanceof HttpError ? e.status : 500;
      return NextResponse.json({ error: e?.message ?? "Error" }, { status });
    }
  };