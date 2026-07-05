"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/settings`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F0B429] to-[#c8961e] text-black font-black text-xl shadow-lg shadow-[#F0B429]/20 mb-4">
            P
          </div>
          <h1 className="text-2xl font-black text-white">Reset Password</h1>
          <p className="text-zinc-500 text-sm mt-1">
            We&apos;ll send you a link to reset your password
          </p>
        </div>

        <div className="bg-[#0E0E14] border border-[#1F1F2C] rounded-2xl p-8 space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#00D084]/15 text-[#00D084]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-zinc-300 text-sm">
                Check <strong className="text-white">{email}</strong> for a password reset link.
              </p>
              <p className="text-zinc-500 text-xs">
                If you don&apos;t see it, check your spam folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-zinc-500 text-xs">
          Remember your password?{" "}
          <Link href="/login" className="text-[#F0B429] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
