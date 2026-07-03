"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { startFreeTrial, TrialAlreadyUsedError } from "@/lib/trial";

type TrialOfferModalProps = {
  uid: string;
  onDone: () => void; // called after Start Trial, Skip, or close — always continue to dashboard
};

/**
 * A one-time interstitial shown right after a successful login/signup,
 * for eligible Free-plan users who have never used their trial.
 * Purely additive: skipping or closing it just continues as normal.
 */
export function TrialOfferModal({ uid, onDone }: TrialOfferModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStartTrial() {
    setError("");
    setLoading(true);

    try {
      await startFreeTrial(uid);
      onDone();
    } catch (err) {
      if (err instanceof TrialAlreadyUsedError) {
        // Already used somehow (e.g. raced from another tab) — just continue.
        onDone();
        return;
      }
      setError("Could not start your trial. You can try again later from Upgrade.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="profit-card relative w-full max-w-md p-7">
        <button
          type="button"
          onClick={onDone}
          aria-label="Close"
          className="absolute right-5 top-5 text-[#5A5A80] transition-colors hover:text-[#F0F0FF]"
        >
          <X size={18} />
        </button>

        <div className="gold-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-[#080810]">
          <Sparkles size={22} />
        </div>

        <h2 className="mt-5 text-xl font-black tracking-[-0.03em] text-[#F0F0FF]">
          Try Pro free for 7 days
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#A0A0C0]">
          No card required. Unlock the AI Coach, unlimited accounts, and
          advanced analytics — cancel any time, no charge.
        </p>

        {error && <p className="mt-4 text-sm text-[#FF4565]">{error}</p>}

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={loading}
            className="gold-gradient w-full rounded-xl py-3 text-sm font-black text-[#080810] disabled:opacity-50"
          >
            {loading ? "Starting trial..." : "Start 7-Day Free Trial"}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={loading}
            className="w-full rounded-xl border border-[#1E1E38] py-3 text-sm font-bold text-[#A0A0C0] disabled:opacity-50"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
