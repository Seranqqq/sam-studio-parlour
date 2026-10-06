import { adminAuth, adminDb } from "@/lib/admin";

const USERNAME = "seran";

export async function ensureDefaultTestUser(): Promise<string> {
  const password = process.env.SERAN_DEFAULT_USER_PASSWORD;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!password || password.length < 6 || !projectId) {
    throw new Error("Default test user setup requires a password and Firebase project configuration.");
  }

  const email = `seran-default-test@${projectId}.firebaseapp.com`;
  const matches = await adminDb.collection("users").where("username", "==", USERNAME).limit(2).get();
  if (matches.size > 1) {
    throw new Error(`Multiple Firestore users use the default username "${USERNAME}".`);
  }

  let user;
  try {
    user = await adminAuth.getUserByEmail(email);
  } catch (error) {
    if (!isAuthError(error, "auth/user-not-found")) throw error;
    try {
      user = await adminAuth.createUser({ email, password, displayName: "Seran" });
    } catch (createError) {
      if (!isAuthError(createError, "auth/email-already-exists")) throw createError;
      user = await adminAuth.getUserByEmail(email);
    }
  }

  const userRef = adminDb.doc(`users/${user.uid}`);
  const existingUser = await userRef.get();
  if (matches.size === 1) {
    if (matches.docs[0].id !== user.uid || matches.docs[0].data().defaultTestUser !== true) {
      throw new Error(`The username "${USERNAME}" is already assigned to another user.`);
    }
  } else if (existingUser.exists && existingUser.data()?.defaultTestUser !== true) {
    throw new Error("The default test account email is already assigned to another user.");
  }

  await adminAuth.setCustomUserClaims(user.uid, { role: "owner", businessIds: ["sam-studio", "parlour"] });
  await userRef.set({
    name: "Seran",
    email,
    username: USERNAME,
    role: "owner",
    businessIds: ["sam-studio", "parlour"],
    defaultTestUser: true,
  }, { merge: true });
  return user.uid;
}

function isAuthError(error: unknown, code: string): error is Error & { code: string } {
  return error instanceof Error && "code" in error && error.code === code;
}
