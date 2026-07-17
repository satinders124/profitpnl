import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  LineChart,
  LockKeyhole,
  MessageSquareText,
  QrCode,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

export const metadata: Metadata = {
  title: "ProfitPnL — AI Trading Journal & Prop Firm Risk OS",
  description:
    "ProfitPnL is an AI trading journal, risk guard, backtesting report center, and prop firm command system for serious traders.",
};

const navItems = [
  { label: "Features", href: "#features" },
  { label: "AI Workflow", href: "#workflow" },
  { label: "Backtesting", href: "#backtesting" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const commandModules = [
  {
    title: "Trading HQ",
    text: "Your command feed shows daily plan status, review queue, biggest leak, prop-firm buffer, and weekly review readiness.",
    icon: <BarChart3 size={20} />,
  },
  {
    title: "Daily Trading Plan",
    text: "Generate pre-market guardrails: max trades, risk per trade, allowed setups, avoid list, and stop rules.",
    icon: <ClipboardCheck size={20} />,
  },
  {
    title: "Plan vs Execution",
    text: "After trading, ProfitPnL scores whether you followed your plan or drifted into emotional execution.",
    icon: <Target size={20} />,
  },
  {
    title: "Weekly AI Review",
    text: "A weekly report turns your trades, psychology, and leaks into next-week rules you can actually follow.",
    icon: <LineChart size={20} />,
  },
];

const aiModules = [
  {
    title: "AI Risk-Guard",
    text: "Clock in with sleep, stress, discipline, targets, and guardrails. Clock out with a behavioral report.",
    icon: <ShieldCheck size={20} />,
  },
  {
    title: "AI Leak Finder",
    text: "Find the exact setup, emotion, mistake, session, or time window costing you the most R.",
    icon: <Brain size={20} />,
  },
  {
    title: "AI Trade Review",
    text: "AI reviews a trade and can auto-fill emotion, mistake, lesson, notes, and reviewed status.",
    icon: <MessageSquareText size={20} />,
  },
  {
    title: "Saved AI Reports",
    text: "Generated AI insights can be saved for history, reducing repeated analysis and preserving your coaching notes.",
    icon: <LockKeyhole size={20} />,
  },
];

const backtestingModules = [
  "Backtesting Report Center with AI analysis",
  "CSV import and export for backtest trades",
  "Public backtest report links",
  "PDF report download with QR verification",
  "Rule adherence, expectancy, drawdown, and model quality metrics",
];

const importPlatforms = ["MT4", "MT5", "TradingView", "Tradovate", "NinjaTrader", "TopstepX", "cTrader", "Generic CSV"];

const stats = [
  { value: "AI", label: "Trading OS" },
  { value: "7+", label: "Command modules" },
  { value: "CSV", label: "Broker import" },
  { value: "PDF", label: "Share reports" },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    text: "For traders starting their journal process.",
    features: ["Manual trade journal", "Basic analytics", "One trading account", "Limited import", "Starter dashboard"],
    cta: "Start Free",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19/mo",
    text: "For serious traders who want AI risk, review, and accountability.",
    features: ["AI Coach and AI reports", "Daily Plan + Weekly Review", "AI Risk-Guard", "AI Leak Finder", "Prop Firm Mode", "Backtesting reports", "Unlimited accounts and imports"],
    cta: "Start Pro Trial",
    href: "/register?trial=true",
    highlighted: true,
  },
];

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#F0B429] shadow-[0_0_8px_#F0B429]" />
      {children}
    </span>
  );
}

function FeatureCard({ title, text, icon }: { title: string; text: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#0D0D1A]/90 p-5 shadow-lg shadow-black/20 transition hover:border-[#F0B429]/35">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 text-[#F0B429]">
        {icon}
      </div>
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-[#A0A0C0]">{text}</p>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810]/80 p-4 text-center">
      <p className="text-3xl font-black tracking-tighter text-[#F0B429]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
    </div>
  );
}

function HeroMockup() {
  return (
    <div className="relative rounded-[2rem] border border-[#1E1E38] bg-[#0D0D1A] p-5 shadow-2xl shadow-black/40">
      <div className="mb-5 flex items-center justify-between border-b border-[#1E1E38] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">AI Command Feed</p>
          <h3 className="mt-1 text-xl font-black text-white">What needs attention today</h3>
        </div>
        <span className="rounded-full border border-[#00D084]/30 bg-[#00D084]/10 px-3 py-1 text-[10px] font-black text-[#00D084]">Live</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ["Daily Plan", "Open", "Build guardrails before trading"],
          ["Review Queue", "3", "Trades need emotion or lesson"],
          ["Biggest Leak", "-2.4R", "FOMO after first loss"],
          ["Prop Firm Risk", "$1,490", "Drawdown buffer available"],
        ].map(([title, status, body]) => (
          <div key={title} className="rounded-2xl border border-[#24243C] bg-[#080810] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black text-white">{title}</p>
              <span className="rounded-full border border-[#F0B429]/25 bg-[#F0B429]/10 px-2 py-0.5 text-[10px] font-black text-[#F0B429]">{status}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#8080A0]">{body}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-[#F0B429]/20 bg-[#F0B429]/8 p-4 text-xs leading-6 text-[#F0B429]">
        AI insight: Your best window is London. Reduce size after the first loss and stay with A+ setups only.
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#08080C] text-white">
      <header className="sticky top-0 z-50 border-b border-[#1F1F2C] bg-[#08080C]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/favicon.png" alt="ProfitPnL" className="h-9 w-9 rounded-xl" />
            <div>
              <p className="text-base font-black leading-none">ProfitPnL</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#5A5A80]">Trading OS</p>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-semibold text-[#A0A0C0] transition hover:text-[#F0B429]">{item.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-xl border border-[#1E1E38] px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-[#F0B429]/40 hover:text-white sm:inline-flex">Log In</Link>
            <Link href="/register" className="gold-gradient rounded-xl px-4 py-2 text-sm font-black text-[#080810]">Start Free</Link>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(240,180,41,0.18),transparent_34%),radial-gradient(circle_at_85%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Badge>AI Trading Journal for Prop Traders</Badge>
            <h1 className="mt-6 text-5xl font-black tracking-tighter sm:text-6xl lg:text-7xl">
              The AI Trading OS built to protect your edge.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#A0A0C0]">
              ProfitPnL turns journaling, risk control, backtesting, psychology, and AI review into one command system — so you know what to trade, what to avoid, and when to stop.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register?trial=true" className="gold-gradient rounded-2xl px-7 py-4 text-center text-sm font-black uppercase tracking-wider text-[#080810] shadow-[0_0_35px_-12px_#F0B429]">Start 7-Day Pro Trial</Link>
              <Link href="/register" className="rounded-2xl border border-[#1E1E38] bg-[#111124] px-7 py-4 text-center text-sm font-black uppercase tracking-wider text-zinc-300 transition hover:text-white">Start Free</Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat) => <Metric key={stat.label} {...stat} />)}
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      <section id="features" className="border-y border-[#1E1E38] bg-[#0B0B12] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <Badge>Command Modules</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">Not just a journal. A trading command center.</h2>
            <p className="mt-4 text-base leading-7 text-[#A0A0C0]">ProfitPnL connects daily planning, review, leak detection, and weekly accountability into one workflow.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {commandModules.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <Badge>AI Workflow</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">AI that updates your process, not just your chat box.</h2>
            <p className="mt-4 text-base leading-7 text-[#A0A0C0]">Generate risk plans, review trades, find leaks, save reports, and build rules from your own data.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {aiModules.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>

      <section id="backtesting" className="border-y border-[#1E1E38] bg-[#0B0B12] px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge>Backtesting Reports</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">Backtest, export, and share your model results.</h2>
            <p className="mt-4 text-base leading-7 text-[#A0A0C0]">Create public backtesting reports with metrics, trade samples, QR verification, and downloadable PDFs.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="gold-gradient rounded-2xl px-6 py-3 text-center text-sm font-black text-[#080810]">Create Account</Link>
              <Link href="/backtest-report/demo" className="rounded-2xl border border-[#1E1E38] px-6 py-3 text-center text-sm font-black text-zinc-300">See Report Format</Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0D0D1A] p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {backtestingModules.map((item) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-[#24243C] bg-[#080810] p-4">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-[#00D084]" size={18} />
                  <p className="text-sm leading-6 text-zinc-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-[#F0B429]/20 bg-[#F0B429]/8 p-4">
              <QrCode className="text-[#F0B429]" size={34} />
              <p className="text-sm leading-6 text-[#F0B429]">Every report can include a QR code so mentors, investors, or community members can verify the public results page.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <Badge>Import & Prop Firm Tools</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">Built for real trader workflows.</h2>
            <p className="mt-4 text-base leading-7 text-[#A0A0C0]">Import broker data, monitor prop firm buffers, and apply firm templates without rebuilding spreadsheets.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#0D0D1A] p-6">
              <div className="mb-4 flex items-center gap-3 text-[#F0B429]"><Upload /> <h3 className="text-xl font-black text-white">Broker Import Center</h3></div>
              <p className="text-sm leading-7 text-[#A0A0C0]">CSV presets map trade history from popular platforms and score import quality before data enters your journal.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {importPlatforms.map((item) => <span key={item} className="rounded-full border border-[#1E1E38] bg-[#080810] px-3 py-1 text-xs font-bold text-zinc-300">{item}</span>)}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#0D0D1A] p-6">
              <div className="mb-4 flex items-center gap-3 text-[#F0B429]"><Gauge /> <h3 className="text-xl font-black text-white">Prop Firm Mode</h3></div>
              <p className="text-sm leading-7 text-[#A0A0C0]">Track profit target, daily loss buffer, max drawdown buffer, consistency risk, and challenge health before trading.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Target", "76%"],
                  ["DD Buffer", "$4,250"],
                  ["Daily Buffer", "$1,100"],
                  ["Verdict", "Controlled"],
                ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#24243C] bg-[#080810] p-3"><p className="text-[10px] uppercase tracking-wider text-[#5A5A80]">{label}</p><p className="mt-1 font-black text-[#F0B429]">{value}</p></div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-[#1E1E38] bg-[#0B0B12] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <Badge>Pricing</Badge>
            <h2 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">Start free. Upgrade when you want AI accountability.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {pricing.map((plan) => (
              <div key={plan.name} className={`rounded-[2rem] border p-7 ${plan.highlighted ? "border-[#F0B429]/40 bg-[#F0B429]/8 shadow-[0_0_60px_-25px_#F0B429]" : "border-[#1E1E38] bg-[#0D0D1A]"}`}>
                <p className="text-lg font-black text-white">{plan.name}</p>
                <p className="mt-3 text-4xl font-black text-[#F0B429]">{plan.price}</p>
                <p className="mt-2 text-sm leading-6 text-[#A0A0C0]">{plan.text}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-zinc-300"><CheckCircle2 className="mt-0.5 shrink-0 text-[#00D084]" size={16} /> {feature}</li>)}
                </ul>
                <Link href={plan.href} className={`mt-7 inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-black ${plan.highlighted ? "gold-gradient text-[#080810]" : "border border-[#1E1E38] text-zinc-300"}`}>{plan.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center"><Badge>FAQ</Badge><h2 className="mt-5 text-4xl font-black tracking-tighter">Questions traders ask</h2></div>
          {[
            ["Is this only a journal?", "No. ProfitPnL combines journaling, daily planning, AI review, leak detection, prop firm monitoring, and backtesting reports."],
            ["Can I import broker trades?", "Yes. The Import Center supports CSV presets for common broker and prop firm exports."],
            ["Can I use it for prop firms?", "Yes. Prop Firm Mode tracks drawdown buffers, targets, daily loss risk, and consistency."],
            ["Can I share backtesting reports?", "Yes. You can create public backtesting report links and PDF downloads with QR verification."],
          ].map(([q, a]) => <details key={q} className="mb-3 rounded-2xl border border-[#1E1E38] bg-[#0D0D1A] p-5"><summary className="cursor-pointer font-black text-white">{q}</summary><p className="mt-3 text-sm leading-7 text-[#A0A0C0]">{a}</p></details>)}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#F0B429]/25 bg-[#F0B429]/8 p-8 text-center shadow-[0_0_70px_-35px_#F0B429]">
          <Sparkles className="mx-auto text-[#F0B429]" size={34} />
          <h2 className="mt-5 text-4xl font-black tracking-tighter">Build your trading process before the next session.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Start free, run your first Daily Plan, log trades, and let ProfitPnL show you what to fix.</p>
          <Link href="/register?trial=true" className="gold-gradient mt-7 inline-flex rounded-2xl px-8 py-4 text-sm font-black uppercase tracking-wider text-[#080810]">Start Pro Trial</Link>
        </div>
      </section>

      <footer className="border-t border-[#1E1E38] bg-[#0B0B12] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[#8080A0] sm:flex-row">
          <p>© {new Date().getFullYear()} ProfitPnL. All rights reserved.</p>
          <div className="flex flex-wrap gap-4"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/risk-disclaimer">Risk Disclaimer</Link><Link href="/contact">Contact</Link></div>
        </div>
      </footer>
    </main>
  );
}
