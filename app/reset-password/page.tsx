"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { KeyRound, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const supabase = createClient();

  useEffect(() => {
    // Check if recovery token or hash exists in URL or if session is established
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      const search = window.location.search;
      if (!hash.includes("type=recovery") && !search.includes("type=recovery")) {
        // Verify if session exists
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            setError("Invalid or expired password reset link. Please request a new link.");
          }
        });
      }
    }
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
    } catch (err: any) {
      setError(err?.message || "Could not reset password. Please try requesting a new link.");
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
                  className="w-full bg-[#14141E] border border-[#242436] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
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
                  className="w-full bg-[#14141E] border border-[#242436] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
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
