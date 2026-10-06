import { ensureDefaultTestUser } from "@/lib/default-test-user";
import { adminAuth, HttpError, route } from "@/lib/admin";

export const runtime = "nodejs";

export const POST = route(async () => {
  if (process.env.NODE_ENV !== "development" || process.env.SERAN_DEFAULT_USER_ENABLED !== "true") {
    throw new HttpError(404, "Not found");
  }

  const uid = await ensureDefaultTestUser();
  const token = await adminAuth.createCustomToken(uid, {
    role: "owner",
    businessIds: ["sam-studio", "parlour"],
  });
  return { token };
});
