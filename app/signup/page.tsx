"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LABELS = ["Too short", "Weak", "Okay", "Good", "Strong"];
const COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const score = [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Enter your name");
    if (pw.length < 8) return setErr("Password must be at least 8 characters");
    if (pw !== pw2) return setErr("Passwords do not match");
    setBusy(true);
    try {
      const c = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      await updateProfile(c.user, { displayName: name.trim() });
      router.replace("/");
    } catch (e: any) {
      setErr(
        e?.code === "auth/email-already-in-use" ? "This email is already registered. Sign in instead."
        : e?.code === "auth/invalid-email" ? "Enter a valid email address"
        : e?.code === "auth/weak-password" ? "Choose a stronger password"
        : "Could not create the account. Try again."
      );
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="The owner will give you access after you sign up.">
      <form onSubmit={submit} className="space-y-3">
        <div><Label className="mb-1">Full name</Label>
          <Input autoComplete="name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><Label className="mb-1">Email</Label>
          <Input type="email" autoComplete="email" placeholder="you@example.com" value={email}
            onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><Label className="mb-1">Password</Label>
          <PasswordInput autoComplete="new-password" placeholder="At least 8 characters" value={pw}
            onChange={(e) => setPw(e.target.value)} required />
          {pw && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? COLORS[score - 1] : "bg-slate-200"}`} />
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{LABELS[score]}. Use capitals, numbers and symbols.</p>
            </div>
          )}
        </div>
        <div><Label className="mb-1">Confirm password</Label>
          <PasswordInput autoComplete="new-password" placeholder="Repeat password" value={pw2}
            onChange={(e) => setPw2(e.target.value)} required />
          {pw2 && pw !== pw2 && <p className="mt-1 text-xs text-red-600">Passwords do not match</p>}
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button className="h-11 w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}