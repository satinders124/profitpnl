"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { Turnstile } from "@/components/Turnstile";

// Replace with your Cloudflare Turnstile Site Key
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

export default function RegisterPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
    setError("");
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) return;

    // Check CAPTCHA is completed
    if (!captchaToken) {
      setError("Please complete the verification below.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        data: { full_name: name.trim() },
        ...(TURNSTILE_SITE_KEY && captchaToken ? { captchaToken } : {}),
      },
    });

    if (authError) {
      setError(authError.message);
      setCaptchaToken(null); // Reset CAPTCHA on error
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

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: "email",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    // Set the password for future password-based logins
    if (data.user) {
      await supabase.auth.updateUser({ password });

      // Update the profile with display name
      const supabase2 = createClient();
      await supabase2
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", data.user.id);
    }

    router.push("/dashboard");
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
          <h1 className="text-2xl font-black text-white">Create Account</h1>
          <p className="text-zinc-500 text-sm mt-1">Start tracking your edge today</p>
        </div>

        {/* Form */}
        <div className="bg-[#0E0E14] border border-[#1F1F2C] rounded-2xl p-8 space-y-6">
          {step === "form" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                />
              </div>
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
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                />
              </div>

              {/* Turnstile CAPTCHA */}
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
                {loading ? "Sending code..." : "Create Account"}
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
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setError(""); setCaptchaToken(null); }}
                className="w-full text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
              >
                ← Back to form
              </button>
            </form>
          )}
        </div>

        {/* Login link */}
        <p className="text-center text-zinc-500 text-xs">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F0B429] hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
