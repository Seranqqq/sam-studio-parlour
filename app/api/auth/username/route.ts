import { adminDb, HttpError, route } from "@/lib/admin";

export const POST = route(async (req) => {
  const { username } = await req.json();
  if (typeof username !== "string" || !username.trim())
    throw new HttpError(401, "Invalid username or password");

  const normalizedUsername = username.trim().toLowerCase();
  if (normalizedUsername === "seran") {
    const matches = await adminDb.collection("users").where("username", "==", "seran").limit(2).get();
    if (matches.size > 1) throw new HttpError(503, "Username is assigned to multiple accounts");
    if (matches.size === 1) {
      const email = matches.docs[0].data().email;
      if (typeof email !== "string" || !email) throw new HttpError(503, "The user account has no email configured");
      return { email };
    }
  }

  if (normalizedUsername !== "samstudio")
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
