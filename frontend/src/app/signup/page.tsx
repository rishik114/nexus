"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAuth((s) => s.signup);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(email, password, username, displayName || username);
      router.push("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign up failed";
      if (msg.toLowerCase().includes("confirm")) {
        setNeedsConfirm(true);
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  if (needsConfirm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-txt px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-extrabold gradient-text mb-4">Nexus</h1>
          <p className="text-sm text-txt2">
            Check your email to confirm your account, then{" "}
            <Link href="/login" className="text-accent font-semibold">log in</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-txt px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-2xl font-extrabold gradient-text mb-8">
          Nexus
        </Link>

        <form onSubmit={handleSubmit} className="bg-bg2 border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h1 className="text-lg font-bold">Create your account</h1>

          <div>
            <label className="text-xs text-txt2 mb-1 block">Username</label>
            <input
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, "_"))}
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="text-xs text-txt2 mb-1 block">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="text-xs text-txt2 mb-1 block">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
            />
          </div>

          <div>
            <label className="text-xs text-txt2 mb-1 block">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent/40"
            />
          </div>

          {error && <p className="text-xs text-accent2">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="text-sm font-bold text-white py-2.5 rounded-lg disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
          >
            {busy ? "Creating account…" : "Sign up"}
          </button>

          <p className="text-xs text-txt2 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-semibold">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
