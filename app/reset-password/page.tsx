"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function initialiseRecoverySession() {
      setCheckingLink(true);
      setError(null);

      try {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = url.searchParams;

        const linkError = hashParams.get("error_description") || searchParams.get("error_description");
        if (linkError) {
          throw new Error(linkError.replace(/\+/g, " "));
        }

        // Supabase recovery links may arrive in either PKCE form (?code=...)
        // or implicit/hash form (#access_token=...&refresh_token=...&type=recovery).
        // updateUser() requires an active Supabase session, so we establish it
        // explicitly before letting the user submit a new password.
        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, document.title, "/reset-password");
        } else {
          const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
            window.history.replaceState({}, document.title, "/reset-password");
          }
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;
        if (session) {
          setSessionReady(true);
        } else {
          setSessionReady(false);
          setError("Invalid or expired password reset link. Please request a new link.");
        }
      } catch (err) {
        if (!mounted) return;
        setSessionReady(false);
        setError(err instanceof Error ? err.message : "Invalid or expired password reset link. Please request a new link.");
      } finally {
        if (mounted) setCheckingLink(false);
      }
    }

    initialiseRecoverySession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !sessionReady) {
        throw new Error("Password reset session is missing. Please request a new reset link.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not reset password. Please try requesting a new link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src="/favicon.png"
            alt="ProfitPnL"
            className="h-14 w-14 aspect-square object-contain rounded-2xl shadow-lg shadow-[#F0B429]/20 mb-4 mx-auto shrink-0"
          />
          <h1 className="text-2xl font-black text-white">Create New Password</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Enter your new secure password below
          </p>
        </div>

        <div className="bg-[#0E0E14] border border-[#1F1F2C] rounded-2xl p-8 shadow-2xl space-y-6">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#00D084]/15 text-[#00D084]">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">Password Reset Complete!</h3>
              <p className="text-zinc-400 text-sm">
                Your account password has been updated. Redirecting you to the dashboard...
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 rounded-xl bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-sm transition-colors mt-4"
              >
                Go to Dashboard Now
              </button>
            </div>
          ) : checkingLink ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-zinc-400">
              <Loader2 className="animate-spin text-[#F0B429]" size={24} />
              <p className="text-sm">Verifying reset link…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                  <KeyRound size={13} className="text-[#F0B429]" /> New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  disabled={!sessionReady}
                  className="w-full bg-[#14141E] border border-[#242436] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-zinc-300 text-xs font-semibold">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  required
                  disabled={!sessionReady}
                  className="w-full bg-[#14141E] border border-[#242436] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!sessionReady && (
                <button
                  type="button"
                  onClick={() => router.push("/forgot-password")}
                  className="w-full py-3 rounded-xl border border-[#F0B429]/40 text-[#F0B429] font-bold text-sm transition-colors hover:bg-[#F0B429]/10"
                >
                  Request New Reset Link
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !sessionReady}
                className="w-full py-3.5 rounded-xl bg-[#F0B429] hover:bg-[#d99f1e] text-black font-black text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-[#F0B429]/20"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {loading ? "Updating Password..." : "Save New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
