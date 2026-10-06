"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isBusinessId } from "@/lib/types";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, role, businessIds, loading, error } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) return router.replace("/login");
    if (!role) return;
    let selectedBusiness = "sam-studio";
    if (role === "owner") {
      try {
        const brand = localStorage.getItem("brand");
        if (brand && isBusinessId(brand)) selectedBusiness = brand;
      } catch {}
    }
    const b = role === "owner" ? selectedBusiness : businessIds[0];
    if (b) router.replace(role === "owner" ? `/${b}/dashboard` : `/${b}/create-bill`);
  }, [loading, user, role, businessIds, router]);
  if (error) return <p className="p-8 text-sm text-red-600">{error}</p>;
  if (!loading && user && !role)
    return (
      <div className="mx-auto max-w-sm space-y-3 p-8 text-center">
        <p className="text-base font-semibold">Waiting for access</p>
        <p className="text-sm text-muted-foreground">
          Your account ({user.email}) has been created. Ask the owner to give you a role, then sign in again.
        </p>
        <Button variant="outline" onClick={() => signOut(auth)}>Sign out</Button>
      </div>
    );
  return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
}