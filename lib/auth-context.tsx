"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
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
  useEffect(
    () => onAuthStateChanged(
      auth,
      (u) => {
        if (!u) {
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
    ),
    []
  );
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}