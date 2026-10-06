"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, type User } from "firebase/auth";
import { auth } from "./firebase";

type Role = "owner" | "staff";
interface S {
  user: User | null;
  role: Role | null;
  businessIds: string[];
  loading: boolean;
  error: string | null;
}
const Ctx = createContext<S>({ user: null, role: null, businessIds: [], loading: true, error: null });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<S>({ user: null, role: null, businessIds: [], loading: true, error: null });
  useEffect(() => {
    let autoSignInAttempted = false;
    return onAuthStateChanged(
      auth,
      async (u) => {
        if (!u) {
          if (process.env.NODE_ENV === "development" && !autoSignInAttempted) {
            autoSignInAttempted = true;
            try {
              const response = await fetch("/api/auth/dev-session", { method: "POST" });
              const result: { token?: unknown; error?: unknown } = await response.json();
              if (!response.ok) {
                throw new Error(typeof result.error === "string" ? result.error : "Could not start the development session.");
              }
              if (typeof result.token !== "string") throw new Error("The development session returned no token.");
              await signInWithCustomToken(auth, result.token);
              return;
            } catch (error) {
              console.error("Failed to start the development test session.", error);
              setS({
                user: null, role: null, businessIds: [], loading: false,
                error: "Could not start the development session. Check Firebase configuration and try again.",
              });
              return;
            }
          }
          setS({ user: null, role: null, businessIds: [], loading: false, error: null });
          return;
        }
        void u.getIdTokenResult(true).then((t) => {
          setS({
            user: u, role: (t.claims.role as Role) ?? null,
            businessIds: (t.claims.businessIds as string[]) ?? [], loading: false, error: null,
          });
        }).catch((error: unknown) => {
          console.error("Failed to verify the signed-in user.", error);
          setS({
            user: u, role: null, businessIds: [], loading: false,
            error: "Could not verify your account. Check your connection and sign in again.",
          });
        });
      },
      (error) => {
        console.error("Firebase authentication failed.", error);
        setS({
          user: null, role: null, businessIds: [], loading: false,
          error: "Authentication is unavailable. Check your local Firebase configuration and connection.",
        });
      },
    );
  }, []);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}