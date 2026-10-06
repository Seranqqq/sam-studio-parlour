import { adminDb, HttpError, route } from "@/lib/admin";

export const POST = route(async (req) => {
  const { username } = await req.json();
  if (typeof username !== "string" || username.trim().toLowerCase() !== "samstudio")
    throw new HttpError(401, "Invalid username or password");

  const email = process.env.SAMSTUDIO_LOGIN_EMAIL;
  if (email) return { email };

  const owners = await adminDb.collection("users").where("role", "==", "owner").limit(2).get();
  if (owners.size !== 1) throw new HttpError(503, "Username login needs a unique owner account");

  const ownerEmail = owners.docs[0].data().email;
  if (typeof ownerEmail !== "string" || !ownerEmail)
    throw new HttpError(503, "The owner account has no email configured");
  return { email: ownerEmail };
});
