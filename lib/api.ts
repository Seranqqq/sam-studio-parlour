import { auth } from "./firebase";

export async function api<T = any>(path: string, method: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Request failed");
  return j;
}