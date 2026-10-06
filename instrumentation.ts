export async function register() {
  if (process.env.NEXT_RUNTIME === "edge"
    || process.env.NODE_ENV !== "development"
    || process.env.SERAN_DEFAULT_USER_ENABLED !== "true") {
    return;
  }

  const { ensureDefaultTestUser } = await import("./lib/default-test-user");
  await ensureDefaultTestUser();
}
