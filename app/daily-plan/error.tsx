"use client";

export default function DailyPlanError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#080810] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <img src="/favicon.png" alt="ProfitPnL" className="mb-5 h-14 w-14 rounded-2xl shadow-lg shadow-[#F0B429]/20" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">Daily Plan Recovery</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Daily Plan did not load cleanly</h1>
        <p className="mt-3 text-sm leading-7 text-[#A0A0C0]">
          This can happen when an email in-app browser blocks cached scripts. Retry here, or open ProfitPnL directly in your browser.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button onClick={reset} className="rounded-2xl bg-[#F0B429] px-5 py-3 text-sm font-black text-[#080810]">
            Retry Daily Plan
          </button>
          <a href="/daily-plan" className="rounded-2xl border border-[#1E1E38] bg-[#111124] px-5 py-3 text-sm font-black text-zinc-200">
            Reopen Link
          </a>
        </div>
      </div>
    </div>
  );
}
