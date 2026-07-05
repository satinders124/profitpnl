"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Turnstile } from "@/components/Turnstile";

// Replace with your Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setError("");
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (!captchaToken) {
      setError("Please complete the verification below.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), token: captchaToken }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send reset link.");
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src="/favicon.png"
            alt="ProfitPnL"
            className="h-14 w-14 aspect-square object-contain rounded-2xl shadow-lg shadow-[#F0B429]/20 mb-4 mx-auto shrink-0"
          />
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

              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center py-2">
                  <Turnstile
                    siteKey={TURNSTILE_SITE_KEY}
                    onVerify={handleCaptchaVerify}
                    onExpire={handleCaptchaExpire}
                    onError={() => setCaptchaToken(null)}
                    theme="dark"
                  />
                </div>
              )}

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
