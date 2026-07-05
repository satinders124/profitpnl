"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    if (error) {
      setError(error.message);
    } else {
      setStep("otp");
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0B429] to-[#c8961e] text-black font-black text-xl shadow-lg shadow-[#F0B429]/20 mb-4">
            P
          </div>
          <h1 className="text-2xl font-black text-white">Welcome Back</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to your trading journal</p>
        </div>

        {/* Form */}
        <div className="bg-[#0E0E14] border border-[#1F1F2C] rounded-2xl p-8 space-y-6">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  required
                  className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Login Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-zinc-400 text-xs text-center">
                We sent a 6-digit code to <strong className="text-white">{email}</strong>
              </p>
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all text-center tracking-[0.5em] font-mono text-lg"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(""); }}
                className="w-full text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
              >
                ← Use a different email
              </button>
            </form>
          )}
        </div>

        {/* Register link */}
        <p className="text-center text-zinc-500 text-xs">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#F0B429] hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
