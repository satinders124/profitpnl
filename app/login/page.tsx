"use client";

import { auth } from "@/lib/firebase-client";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  signInWithEmailAndPassword,
} from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getTrialEligibility } from "@/lib/trial";
import { TrialOfferModal } from "@/components/trial/TrialOfferModal";

const REMEMBERED_EMAIL_KEY = "ppnl_remembered_email";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [trialOfferUid, setTrialOfferUid] = useState<string | null>(null);

  // Pre-fill the email if the user previously checked "Remember Me".
  // (Runs after mount, client-only, to avoid a server/client hydration
  // mismatch since localStorage isn't available during server rendering.)
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // localStorage unavailable — ignore.
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Remember Me -> stay signed in across browser restarts (local persistence).
      // Unchecked -> session ends when the browser/tab is closed.
      await setPersistence(
        auth,
        rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const cred = await signInWithEmailAndPassword(auth, email, password);

      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }
      } catch {
        // localStorage unavailable — non-critical, ignore.
      }

      // If this user is eligible for the 7-day trial, offer it once here,
      // before they land on the dashboard. Otherwise go straight in.
      try {
        const eligibility = await getTrialEligibility(cred.user.uid);
        if (eligibility.eligible) {
          setTrialOfferUid(cred.user.uid);
          return;
        }
      } catch {
        // If the eligibility check fails for any reason, don't block login.
      }

      router.push("/dashboard");
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setLoading(false);
    }
  }

  function continueToDashboard() {
    router.push("/dashboard");
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
              autoComplete="email"
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
                autoComplete="current-password"
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

          <label className="flex cursor-pointer items-center gap-2.5 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer sr-only"
            />
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                rememberMe
                  ? "border-[#F0B429] bg-[#F0B429]"
                  : "border-[#1E1E38] bg-[#0D0D1A]"
              }`}
            >
              {rememberMe && (
                <svg
                  viewBox="0 0 16 16"
                  className="h-3 w-3 text-[#080810]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
              )}
            </span>
            <span className="text-xs font-bold text-[#A0A0C0]">
              Remember me
            </span>
          </label>

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

      {trialOfferUid && (
        <TrialOfferModal uid={trialOfferUid} onDone={continueToDashboard} />
      )}
    </main>
  );
}
