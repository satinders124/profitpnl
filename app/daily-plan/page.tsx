import DailyPlanClient from "./DailyPlanClient";

function DailyPlanServerFallback() {
  return (
    <div id="daily-plan-server-fallback" className="min-h-screen bg-[#080810] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <img src="/favicon.png" alt="ProfitPnL" className="mb-5 h-14 w-14 rounded-2xl shadow-lg shadow-[#F0B429]/20" />
        <div className="mb-4 h-7 w-7 animate-spin rounded-full border-2 border-[#F0B429]/30 border-t-[#F0B429]" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">ProfitPnL Daily Plan</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Opening your Daily Plan…</h1>
        <p className="mt-3 text-sm leading-7 text-[#A0A0C0]">
          If this was opened from an email app and stays here, continue through secure login. We’ll bring you back to the Daily Plan.
        </p>
        <a
          href="/login?next=%2Fdaily-plan"
          className="mt-6 rounded-2xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429]"
        >
          Continue to Login
        </a>
      </div>
    </div>
  );
}

export default function DailyPlanPage() {
  return (
    <>
      <DailyPlanServerFallback />
      <DailyPlanClient />
    </>
  );
}
