"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/sam-studio/dashboard";

  const { user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated, redirect to destination
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(redirectUrl);
    }
  }, [user, authLoading, router, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      router.replace(redirectUrl);
      router.refresh();
    } catch (err: any) {
      const code = err?.code;
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/user-disabled") {
        setError("This account has been disabled. Please contact support.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a few moments and try again.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(err?.message || "Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="size-8 animate-spin text-slate-500" />
        <p className="text-sm font-medium text-slate-500">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in-50 zoom-in-95 duration-500">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.04)] sm:p-9">
        {/* Subtle decorative brand gradients in corners */}
        <div className="pointer-events-none absolute -top-20 -right-20 size-44 rounded-full bg-gradient-to-br from-indigo-100/70 to-transparent blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-44 rounded-full bg-gradient-to-tr from-amber-100/60 to-transparent blur-2xl" />

        {/* Card Header with Logo */}
        <div className="relative mb-7 flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Sam Studio / Thresh Salon
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Welcome back! Please sign in to your account
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-800 animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 shrink-0 text-red-600 mt-0.5" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Form with exactly two inputs */}
        <form onSubmit={handleSubmit} className="relative space-y-4">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Email Address
            </label>
            <div className="group relative flex items-center rounded-xl border border-slate-200 bg-slate-50/70 transition-all duration-200 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/5">
              <span className="pointer-events-none pl-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors">
                <Mail className="size-4" />
              </span>
              <input
                id="email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="name@samstudio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Password
            </label>
            <div className="group relative flex items-center rounded-xl border border-slate-200 bg-slate-50/70 transition-all duration-200 focus-within:border-slate-900 focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/5">
              <span className="pointer-events-none pl-3.5 text-slate-400 group-focus-within:text-slate-800 transition-colors">
                <Lock className="size-4" />
              </span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="w-full bg-transparent px-3 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="pr-3.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-black py-3 px-4 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs font-medium text-slate-500">
        Sam Studio Billing & Management Portal
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 sm:p-6">
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, -25px) scale(1.08); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translate(0, 0) scale(1.08); }
          50% { transform: translate(-30px, 20px) scale(1); }
        }
        .animate-float-slow { animation: floatSlow 12s ease-in-out infinite; }
        .animate-float-reverse { animation: floatReverse 15s ease-in-out infinite; }
      `}</style>

      {/* Animated Background Mesh & Soft Ambient Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Soft glowing ambient orbs */}
        <div className="animate-float-slow absolute -top-40 -left-40 size-[520px] rounded-full bg-slate-200/50 blur-[120px]" />
        <div className="animate-float-reverse absolute -bottom-40 -right-40 size-[540px] rounded-full bg-indigo-100/50 blur-[130px]" />
        <div className="animate-float-slow absolute top-1/2 left-1/3 size-[400px] -translate-y-1/2 rounded-full bg-amber-100/40 blur-[120px]" />

        {/* Subtle dot pattern grid */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.3) 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Main Form wrapped in Suspense for searchParams */}
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <Loader2 className="size-8 animate-spin text-slate-500" />
            <p className="text-sm font-medium text-slate-500">Loading...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
