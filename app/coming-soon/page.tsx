import { ShieldCheck, Sparkles } from "lucide-react";

export const metadata = {
  title: "ProfitPnL — Coming Soon",
  description:
    "The professional trading journal built for serious traders. Launching soon.",
};

export default function ComingSoonPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05050a] px-6 text-white">
      {/* Ambient glow background, matches landing page */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[60%] w-[60%] rounded-full bg-[#F0B429]/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl text-center">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="gold-gradient flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-black text-[#080810] shadow-[0_0_30px_rgba(240,180,41,0.4)]">
            P
          </div>
          <span className="text-2xl font-black tracking-tighter">ProfitPnL</span>
        </div>

        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#F0B429]/20 bg-[#F0B429]/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#F0B429]">
          <Sparkles size={13} />
          Launching Soon
        </div>

        <h1 className="mb-5 text-4xl font-black leading-[1.05] tracking-tighter sm:text-6xl">
          Something sharper is
          <br />
          <span className="bg-gradient-to-b from-[#F0B429] to-amber-600 bg-clip-text text-transparent">
            being built.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-md text-base leading-relaxed text-zinc-400">
          The professional trading journal for serious traders is almost
          ready. Track every trade, decode every pattern, and find your edge.
        </p>

        <div className="mx-auto flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-zinc-300">
          <ShieldCheck size={16} className="shrink-0 text-[#00D084]" />
          We&apos;ll be live shortly. Thanks for your patience.
        </div>

        <p className="mt-10 text-xs font-bold uppercase tracking-widest text-zinc-600">
          © {new Date().getFullYear()} ProfitPnL
        </p>
      </div>
    </main>
  );
}
