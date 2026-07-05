"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { Turnstile } from "@/components/Turnstile";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  // Shared state
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Password login state
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // OTP login state
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setError("");
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  // ── Password Login ──
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the verification below.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: TURNSTILE_SITE_KEY && captchaToken ? { captchaToken } : undefined,
    });

    if (authError) {
      setError(authError.message === "Invalid login credentials" 
        ? "Incorrect email or password." 
        : authError.message);
      setCaptchaToken(null);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  // ── OTP: Send Code ──
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the verification below.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        ...(TURNSTILE_SITE_KEY && captchaToken ? { captchaToken } : {}),
      },
    });

    if (authError) {
      setError(authError.message);
      setCaptchaToken(null);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  }

  // ── OTP: Verify Code ──
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError("");

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
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
          <img
            src="/favicon.png"
            alt="ProfitPnL"
            className="h-14 w-14 rounded-2xl shadow-lg shadow-[#F0B429]/20 mb-4"
          />
          <h1 className="text-2xl font-black text-white">Welcome Back</h1>
          <p className="text-zinc-500 text-sm mt-1">Sign in to your trading journal</p>
        </div>

        {/* Form */}
        <div className="bg-[#0E0E14] border border-[#1F1F2C] rounded-2xl p-8 space-y-6">

          {/* ═══ OTP MODE: Code sent → enter code ═══ */}
          {otpMode && otpSent ? (
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
                onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                className="w-full text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
              >
                ← Send a new code
              </button>
            </form>
          ) : otpMode ? (
            /* ═══ OTP MODE: Enter email ═══ */
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
                disabled={loading || (TURNSTILE_SITE_KEY ? !captchaToken : false)}
                className="w-full py-3 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Sending code..." : "Send Login Code"}
              </button>

              <button
                type="button"
                onClick={() => { setOtpMode(false); setError(""); setCaptchaToken(null); }}
                className="w-full text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
              >
                ← Back to password login
              </button>
            </form>
          ) : (
            /* ═══ PASSWORD MODE (default) ═══ */
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  required
                  autoComplete="email"
                  className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 pr-14 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#F0B429] hover:text-[#d99f1e]"
                  >
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
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
                disabled={loading || (TURNSTILE_SITE_KEY ? !captchaToken : false)}
                className="w-full py-3 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-sm transition-colors disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>

              {/* Switch to OTP mode */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => { setOtpMode(true); setError(""); setCaptchaToken(null); }}
                  className="text-zinc-500 text-xs hover:text-[#F0B429] transition-colors"
                >
                  Sign in with email code instead
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center space-y-2">
          <p className="text-zinc-500 text-xs">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#F0B429] hover:underline font-semibold">
              Create one free
            </Link>
          </p>
          {!otpMode && (
            <p className="text-zinc-600 text-xs">
              <Link href="/forgot-password" className="hover:text-zinc-400 transition-colors">
                Forgot password?
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
