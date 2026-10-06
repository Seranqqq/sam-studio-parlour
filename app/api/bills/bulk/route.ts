import { HttpError, route, requireUser } from "@/lib/admin";
import { removeBills } from "@/lib/billing";

export const DELETE = route(async (req) => {
  await requireUser(req, true);
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string"))
    throw new HttpError(400, "Invalid bills");
  await removeBills(ids, true);
  return { ok: true };
});
