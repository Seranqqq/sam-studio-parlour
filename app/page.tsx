"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/sam-studio/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          <Image
            src="/logos/Samstudiologo.jpg.jpeg"
            alt="Sam Studio Logo"
            width={64}
            height={64}
            className="size-full object-cover"
            priority
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="size-4 animate-spin text-slate-700" />
          <span>Loading Sam Studio...</span>
        </div>
      </div>
    </div>
  );
}
