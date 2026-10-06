"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const response = await fetch("/api/auth/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not resolve username");
      await signInWithEmailAndPassword(auth, result.email, password);
      router.replace("/");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setErr(message.includes("owner account") || message.includes("username login")
        ? message
        : "Invalid username or password");
      setBusy(false);
    }
  }

  return (
    <AuthShell singleLogin title="Welcome back" subtitle="Sign in to continue to your billing dashboard.">
      <form onSubmit={submit} className="space-y-3">
        <div><Label className="mb-1">Username</Label>
          <Input autoComplete="username" placeholder="samstudio" value={username}
            onChange={(e) => setUsername(e.target.value)} required /></div>
        <div><Label className="mb-1">Password</Label>
          <PasswordInput autoComplete="current-password" placeholder="Your password" value={password}
            onChange={(e) => setPassword(e.target.value)} required /></div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button className="h-11 w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    
    </AuthShell>
  );
}