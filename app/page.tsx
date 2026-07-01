import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080810] text-[#F0F0FF]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1E1E38] bg-[#080810]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="gold-gradient flex h-9 w-9 items-center justify-center rounded-xl text-[#080810] font-black">
              P
            </div>
            <div className="text-lg font-black tracking-[-0.03em]">
              ProfitPnL
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#1E1E38] px-4 py-2 text-sm font-bold text-[#A0A0C0]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="gold-gradient rounded-xl px-4 py-2 text-sm font-black text-[#080810]"
            >
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-5 pt-24 text-center">
        <div className="mb-5 rounded-full border border-[#F0B429]/20 bg-[#F0B429]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#F0B429]">
          AI-Powered Trading Journal
        </div>

        <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-[-0.06em] md:text-7xl">
          Stop guessing.
          <br />
          <span className="text-[#F0B429]">Find your edge.</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-8 text-[#A0A0C0] md:text-lg">
          ProfitPnL helps serious traders track every trade, decode patterns,
          protect prop firm accounts, and get Claude-powered coaching on what
          to fix next.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="gold-gradient rounded-2xl px-7 py-4 text-sm font-black text-[#080810]"
          >
            Start Free — No Card Needed
          </Link>
          <Link
            href="/login"
            className="rounded-2xl border border-[#1E1E38] px-7 py-4 text-sm font-black text-[#F0F0FF]"
          >
            Login to Account
          </Link>
        </div>

        <div className="mt-14 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["50+", "Metrics"],
            ["AI", "Coach"],
            ["∞", "Accounts"],
            ["100%", "Cloud Sync"],
          ].map(([value, label]) => (
            <div key={label} className="profit-card p-5">
              <div className="text-2xl font-black text-[#F0B429]">{value}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-[#5A5A80]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}