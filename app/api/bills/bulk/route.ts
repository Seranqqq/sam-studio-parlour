import { HttpError, route } from "@/lib/admin";
import { removeBills } from "@/lib/billing";

export const DELETE = route(async (req) => {
  const { ids } = await req.json();
  if (!Array.isArray(ids) || !ids.every((id): id is string => typeof id === "string"))
    throw new HttpError(400, "Invalid bills");
  await removeBills(ids, true);
  return { ok: true };
});
