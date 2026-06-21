"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-txt px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-2xl font-extrabold gradient-text mb-8">
          Nexus
        </Link>

        <form onSubmit={handleSubmit} className="bg-bg2 border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h1 className="text-lg font-bold">Log in</h1>

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
            {busy ? "Logging in…" : "Log in"}
          </button>

          <p className="text-xs text-txt2 text-center">
            No account?{" "}
            <Link href="/signup" className="text-accent font-semibold">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
