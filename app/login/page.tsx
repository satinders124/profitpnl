"use client";

import { auth } from "@/lib/firebase-client";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080810] px-5 text-[#F0F0FF]">
      <form
        onSubmit={handleLogin}
        className="profit-card w-full max-w-md p-7"
      >
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="gold-gradient flex h-9 w-9 items-center justify-center rounded-xl text-[#080810] font-black">
            P
          </div>
          <div className="text-lg font-black">ProfitPnL</div>
        </Link>

        <h1 className="text-2xl font-black tracking-[-0.04em]">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-[#5A5A80]">
          Login to your trading journal.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#A0A0C0]">Email</label>
            <input
              className="mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 outline-none focus:border-[#F0B429]"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#A0A0C0]">
              Password
            </label>
            <div className="relative mt-2">
              <input
                className="w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 pr-14 outline-none focus:border-[#F0B429]"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#F0B429]"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-[#FF4565]">{error}</div>}

          <button
            disabled={loading}
            className="gold-gradient w-full rounded-xl py-3 font-black text-[#080810] disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-[#5A5A80]">
          No account?{" "}
          <Link href="/register" className="font-bold text-[#F0B429]">
            Create one free
          </Link>
        </p>
      </form>
    </main>
  );
}