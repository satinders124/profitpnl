"use client";

import { auth } from "@/lib/firebase-client";
import { signInWithCustomToken } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Step = "details" | "otp";

const RESEND_COOLDOWN_SEC = 45;

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("details");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not send verification code.");
        return;
      }

      setStep("otp");
      setCooldown(RESEND_COOLDOWN_SEC);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend code.");
        return;
      }

      setCooldown(RESEND_COOLDOWN_SEC);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function updateOtpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);

    if (digit && index < otp.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the full 6-digit code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not verify code.");
        return;
      }

      await signInWithCustomToken(auth, data.token);
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080810] px-5 text-[#F0F0FF]">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <div className="gold-gradient flex h-9 w-9 items-center justify-center rounded-xl text-[#080810] font-black">
            P
          </div>
          <div className="text-lg font-black">ProfitPnL</div>
        </Link>

        <div className="profit-card w-full p-7">
          {step === "details" ? (
            <DetailsStep
              name={name}
              email={email}
              password={password}
              showPass={showPass}
              error={error}
              loading={loading}
              onNameChange={setName}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onToggleShowPass={() => setShowPass((v) => !v)}
              onSubmit={handleDetailsSubmit}
            />
          ) : (
            <OtpStep
              email={email}
              otp={otp}
              otpRefs={otpRefs}
              error={error}
              loading={loading}
              resending={resending}
              cooldown={cooldown}
              onDigitChange={updateOtpDigit}
              onKeyDown={handleOtpKeyDown}
              onPaste={handleOtpPaste}
              onSubmit={handleVerify}
              onResend={handleResend}
              onEditDetails={() => {
                setStep("details");
                setError("");
                setOtp(["", "", "", "", "", ""]);
              }}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function DetailsStep({
  name,
  email,
  password,
  showPass,
  error,
  loading,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onToggleShowPass,
  onSubmit,
}: {
  name: string;
  email: string;
  password: string;
  showPass: boolean;
  error: string;
  loading: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onToggleShowPass: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <StepBadge current={1} />

      <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-[#5A5A80]">
        Start tracking your edge today.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-bold text-[#A0A0C0]">Name</label>
          <input
            className="mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 outline-none focus:border-[#F0B429]"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#A0A0C0]">Email</label>
          <input
            className="mt-2 w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 outline-none focus:border-[#F0B429]"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#A0A0C0]">Password</label>
          <div className="relative mt-2">
            <input
              className="w-full rounded-xl border border-[#1E1E38] bg-[#0D0D1A] px-4 py-3 pr-14 outline-none focus:border-[#F0B429]"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={onToggleShowPass}
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
          {loading ? "Sending code..." : "Send Verification Code"}
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-[#5A5A80]">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-[#F0B429]">
          Login
        </Link>
      </p>
    </form>
  );
}

function OtpStep({
  email,
  otp,
  otpRefs,
  error,
  loading,
  resending,
  cooldown,
  onDigitChange,
  onKeyDown,
  onPaste,
  onSubmit,
  onResend,
  onEditDetails,
}: {
  email: string;
  otp: string[];
  otpRefs: React.MutableRefObject<Array<HTMLInputElement | null>>;
  error: string;
  loading: boolean;
  resending: boolean;
  cooldown: number;
  onDigitChange: (index: number, value: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onResend: () => void;
  onEditDetails: () => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <StepBadge current={2} />

      <h1 className="mt-3 text-2xl font-black tracking-[-0.04em]">
        Verify your email
      </h1>
      <p className="mt-1 text-sm leading-6 text-[#5A5A80]">
        We sent a 6-digit code to{" "}
        <span className="font-bold text-[#F0F0FF]">{email}</span>.{" "}
        <button
          type="button"
          onClick={onEditDetails}
          className="font-bold text-[#F0B429]"
        >
          Edit
        </button>
      </p>

      <div className="mt-6 space-y-4">
        <div className="flex justify-between gap-2">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                otpRefs.current[i] = el;
              }}
              value={digit}
              onChange={(e) => onDigitChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              inputMode="numeric"
              maxLength={1}
              className="h-14 w-12 rounded-xl border border-[#1E1E38] bg-[#0D0D1A] text-center text-xl font-black outline-none focus:border-[#F0B429]"
            />
          ))}
        </div>

        {error && <div className="text-sm text-[#FF4565]">{error}</div>}

        <button
          disabled={loading}
          className="gold-gradient w-full rounded-xl py-3 font-black text-[#080810] disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify & Create Account"}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={cooldown > 0 || resending}
          className="w-full text-center text-sm font-bold text-[#F0B429] disabled:text-[#5A5A80]"
        >
          {resending
            ? "Resending..."
            : cooldown > 0
              ? `Resend code in ${cooldown}s`
              : "Resend code"}
        </button>
      </div>
    </form>
  );
}

function StepBadge({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">
      <span className={current === 1 ? "text-[#F0B429]" : ""}>1. Details</span>
      <span>→</span>
      <span className={current === 2 ? "text-[#F0B429]" : ""}>2. Verify</span>
    </div>
  );
}
