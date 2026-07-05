import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Lock,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

const navLinks = [
  { label: "Tools", href: "/tools" },
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Reviews", href: "#reviews" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const tickerEntries = [
  { symbol: "ES", value: "+2.4R", tone: "bull" },
  { symbol: "NQ", value: "+$1,240", tone: "bull" },
  { symbol: "XAUUSD", value: "-0.5R", tone: "bear" },
  { symbol: "EURUSD", value: "+1.8R", tone: "bull" },
  { symbol: "US30", value: "+$680", tone: "bull" },
  { symbol: "BTCUSD", value: "-1.0R", tone: "bear" },
  { symbol: "DAX", value: "+0.9R", tone: "bull" },
];

const heroStats = [
  { label: "Avg review time", value: "30s" },
  { label: "Edge Score", value: "82/100" },
  { label: "Export-ready", value: "CSV" },
];

const statsData = [
  { label: "Trades journaled", value: "250K+" },
  { label: "Setup logging", value: "<30s" },
  { label: "Cloud synced", value: "100%" },
  { label: "Built for", value: "Prop" },
];

const toolCards = [
  {
    icon: Calculator,
    title: "Position & P&L Calculators",
    desc: "Lot size, profit, pip value, risk-reward, R-multiple, expectancy, and drawdown tools.",
    href: "/tools",
  },
  {
    icon: Search,
    title: "Trading Journal Audit",
    desc: "Paste a CSV and get edge score, leaks, strengths, and a practical action plan.",
    href: "/tools/trading-journal-audit",
  },
  {
    icon: ClipboardCheck,
    title: "Setup Score Checklist",
    desc: "Score a trade before entry so FOMO and weak setups do not touch your account.",
    href: "/tools/trade-setup-score-calculator",
  },
  {
    icon: Shield,
    title: "Prop Firm Risk Tools",
    desc: "Challenge calculator, survival simulator, and firm-specific rule pages for funded traders.",
    href: "/prop-firm-rules",
  },
];

const featuresData = [
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    desc: "Win rate, expectancy, profit factor, drawdown, session breakdowns, instrument splits, and setup-level performance.",
  },
  {
    icon: Sparkles,
    title: "AI Trading Coach",
    desc: "Per-trade feedback, weekly summaries, leak detection, and concrete actions based on your actual journal.",
  },
  {
    icon: Brain,
    title: "Psychology Journal",
    desc: "Track FOMO, revenge trading, confidence, sleep, discipline, and emotion patterns before they cost you.",
  },
  {
    icon: Shield,
    title: "Prop Firm Tracker",
    desc: "Monitor account size, daily loss, max drawdown, challenge progress, and funded account health.",
  },
  {
    icon: Trophy,
    title: "Performance Certificates",
    desc: "Create shareable, hash-verified trading performance snapshots with QR verification and privacy controls.",
  },
  {
    icon: Lock,
    title: "Private by Default",
    desc: "Your journal is yours. Public pages only exist when you intentionally create certificates or shared snapshots.",
  },
];

const playbookRows = [
  { setup: "London ORB", trades: 34, winRate: "71%", avgR: "+2.4R", tone: "bull" },
  { setup: "NY Open Drive", trades: 28, winRate: "64%", avgR: "+1.8R", tone: "bull" },
  { setup: "FVG Retest", trades: 41, winRate: "58%", avgR: "+1.2R", tone: "bull" },
  { setup: "Range Fade", trades: 22, winRate: "41%", avgR: "-0.4R", tone: "bear" },
];

const integrations = ["MT5", "TradingView", "Tradovate", "NinjaTrader", "CSV", "Prop Firms"];

const stepsData = [
  {
    title: "Log the trade",
    desc: "Capture setup, session, instrument, risk, result, emotion, mistakes, notes, and screenshots in under 30 seconds.",
  },
  {
    title: "Review your edge",
    desc: "ProfitPnL turns those trades into expectancy, profit factor, drawdown, R-multiples, win rate, and leak breakdowns.",
  },
  {
    title: "Fix one behavior",
    desc: "Use AI coach, certificates, playbook stats, and psychology tags to repeat strengths and remove costly patterns.",
  },
];

const reviewsData = [
  {
    quote: "The first journal that made me care about reviewing trades instead of only adding trades.",
    name: "Futures trader",
    role: "NQ / ES",
  },
  {
    quote: "The R-multiple and psychology breakdowns showed my Friday trades were destroying my whole week.",
    name: "Prop challenge trader",
    role: "Funded account",
  },
  {
    quote: "Certificates are clean. I can share results without sending messy screenshots of spreadsheets.",
    name: "Forex trader",
    role: "XAUUSD / EURUSD",
  },
];

const planFeatures = [
  "Unlimited trades",
  "Full analytics suite",
  "Unlimited accounts",
  "AI Coach + weekly report",
  "Psychology journal",
  "Verified performance certificates",
  "Cloud sync across devices",
];

const faqsData = [
  {
    q: "Is ProfitPnL a broker or signal provider?",
    a: "No. ProfitPnL is a trading journal, analytics, education, certificate, and review platform. It does not place trades or provide financial advice.",
  },
  {
    q: "Can I use it for forex, futures, crypto, and prop firms?",
    a: "Yes. ProfitPnL is built around flexible instruments, R-multiple tracking, account filters, prop rules, and CSV-friendly workflows.",
  },
  {
    q: "Can I start with spreadsheets first?",
    a: "Yes. Use our free CSV and Google Sheets templates. When you outgrow manual sheets, move your workflow into ProfitPnL.",
  },
  {
    q: "Are certificates broker verified?",
    a: "Current certificates are journal-verified snapshots generated from ProfitPnL records. They are not broker-audited statements.",
  },
];

const footerCols = [
  {
    h: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Free Tools", href: "/tools" },
      { label: "AI Coach", href: "#features" },
      { label: "Prop Tracker", href: "#features" },
    ],
  },
  {
    h: "Resources",
    items: [
      { label: "Journaling Guides", href: "/journaling-guides" },
      { label: "CSV Templates", href: "/csv-templates" },
      { label: "Trading Metrics", href: "/trading-metrics" },
      { label: "Playbooks", href: "/playbooks" },
    ],
  },
  {
    h: "Company",
    items: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Risk Disclaimer", href: "/risk-disclaimer" },
    ],
  },
];

function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/75 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2" aria-label="ProfitPnL home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ProfitPnL" className="h-9 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative text-sm text-muted2 transition-colors hover:text-gold">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm font-semibold text-muted2 transition-colors hover:text-gold">
            Login
          </Link>
          <Link href="/register" className="gold-gradient rounded-lg px-4 py-2 text-sm font-bold text-ink shadow-[0_0_24px_rgba(240,180,41,0.35)]">
            Get Started Free
          </Link>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/tools" className="text-sm font-semibold text-muted2">Tools</Link>
          <Link href="/login" className="text-sm font-semibold text-gold">Login</Link>
        </div>
      </nav>
    </header>
  );
}

function TickerTape() {
  const repeated = [...tickerEntries, ...tickerEntries];
  return (
    <div className="marquee-paused border-b border-line/50 bg-ink2/80 py-2">
      <div className="animate-marquee flex w-max gap-3 px-4">
        {repeated.map((entry, index) => (
          <div key={`${entry.symbol}-${index}`} className="flex items-center gap-2 rounded-full border border-line bg-panel/70 px-3 py-1.5 font-mono2 text-xs">
            <span className="text-muted2">{entry.symbol}</span>
            <span className={entry.tone === "bull" ? "text-bull" : "text-bear"}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="profit-card border-spin relative overflow-hidden p-4 shadow-[0_30px_120px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <div>
          <p className="font-mono2 text-xs text-dim">{"//"} Live Journal</p>
          <h3 className="text-lg font-bold">Edge Command Center</h3>
        </div>
        <span className="rounded-full border border-bull/30 bg-bull/10 px-3 py-1 font-mono2 text-xs text-bull">Synced</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Win Rate", "58.3%", "text-gold"],
          ["Expectancy", "+0.48R", "text-bull"],
          ["Max DD", "-3.1R", "text-bear"],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-line bg-ink2/80 p-3">
            <p className="font-mono2 text-[10px] uppercase tracking-widest text-dim">{label}</p>
            <p className={`mt-1 font-mono2 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-ink2/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-txt">Equity Curve</span>
          <span className="font-mono2 text-xs text-bull">+12.6R</span>
        </div>
        <svg viewBox="0 0 520 180" className="h-44 w-full overflow-visible">
          <defs>
            <linearGradient id="heroEq" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f0b429" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f0b429" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 150 L45 138 L85 146 L130 112 L170 119 L215 82 L260 96 L305 64 L350 76 L395 38 L440 56 L520 24 L520 180 L0 180 Z" fill="url(#heroEq)" />
          <path d="M0 150 L45 138 L85 146 L130 112 L170 119 L215 82 L260 96 L305 64 L350 76 L395 38 L440 56 L520 24" fill="none" stroke="#f0b429" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-bear/25 bg-bear/10 p-3">
          <p className="text-xs font-bold text-bear">Leak found</p>
          <p className="mt-1 text-xs text-muted2">Friday afternoon trades: -3.2R</p>
        </div>
        <div className="rounded-xl border border-bull/25 bg-bull/10 p-3">
          <p className="text-xs font-bold text-bull">Best setup</p>
          <p className="mt-1 text-xs text-muted2">London ORB: +8.1R</p>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
      <div className="trading-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_72%)]" />
      <div className="animate-pulse-glow absolute left-1/2 top-12 h-80 w-80 -translate-x-1/2 rounded-full bg-gold/10 blur-[120px]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="animate-[fadeUp_0.55s_ease-out]">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold">
            <Sparkles size={14} /> Built for traders who review like pros
          </div>
          <h1 className="text-4xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
            Find the leaks hiding in your <span className="text-shimmer">trade history</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted2 sm:text-lg">
            ProfitPnL is the trading journal, AI review desk, prop-firm tracker, certificate engine, and free tool ecosystem for serious forex, futures, crypto, and funded traders.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="gold-gradient inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 font-bold text-ink shadow-[0_0_38px_rgba(240,180,41,0.38)]">
              Start Journaling Free <ArrowRight size={18} />
            </Link>
            <Link href="/tools/trading-journal-audit" className="inline-flex items-center justify-center gap-2 rounded-xl border border-line px-7 py-4 font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">
              Audit My Journal
            </Link>
          </div>
          <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-line bg-panel/60 p-3">
                <p className="font-mono2 text-lg font-bold text-gold">{stat.value}</p>
                <p className="mt-1 text-[11px] text-dim">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-line/60 bg-ink2/60 py-14">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 text-center sm:px-6 lg:grid-cols-4">
        {statsData.map((stat) => (
          <div key={stat.label}>
            <p className="font-mono2 text-3xl font-bold text-gold sm:text-5xl">{stat.value}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-muted2">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolsPreview() {
  return (
    <section id="tools" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader kicker="Free Trading Tools" title="Organic tools traders actually use before they sign up." desc="Calculators, audits, templates, prop-firm pages, and review tools that bring traders into the ProfitPnL workflow." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {toolCards.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.title} href={tool.href} className="profit-card group flex min-h-[245px] flex-col p-5 transition-colors hover:border-gold/50">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink text-gold">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-lg font-bold">{tool.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted2">{tool.desc}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-gold">Open <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div className="mx-auto mb-14 max-w-3xl text-center">
      <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} {kicker}</p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-4 text-muted2">{desc}</p>
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader kicker="Features" title="Everything a serious trader needs to improve." desc="Data, risk, psychology, playbooks, AI review, and shareable proof in one workflow." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuresData.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="profit-card group p-6 transition-colors hover:border-gold/40">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink text-gold">
                  <Icon size={22} />
                </div>
                <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted2">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Playbook() {
  return (
    <section className="border-y border-line/60 bg-ink2/50 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="mb-3 font-mono2 text-xs uppercase tracking-[0.3em] text-gold">{"//"} Playbook Intelligence</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Know which setups deserve your risk.</h2>
          <p className="mt-4 leading-relaxed text-muted2">
            Stop trusting vibes. ProfitPnL compares setups by total R, win rate, expectancy, mistake tags, and session behavior so your best playbooks get more attention and your leaks get removed.
          </p>
          <Link href="/playbooks" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gold hover:underline">
            Explore public playbook templates <ArrowRight size={14} />
          </Link>
        </div>
        <div className="profit-card overflow-hidden p-4">
          <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-line px-3 py-3 font-mono2 text-[11px] uppercase tracking-widest text-dim">
            <span>Setup</span><span>Trades</span><span>Win</span><span>Avg R</span>
          </div>
          {playbookRows.map((row) => (
            <div key={row.setup} className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr] gap-3 border-b border-line/60 px-3 py-4 text-sm last:border-0">
              <span className="font-semibold text-txt">{row.setup}</span>
              <span className="font-mono2 text-muted2">{row.trades}</span>
              <span className="font-mono2 text-muted2">{row.winRate}</span>
              <span className={`font-mono2 font-bold ${row.tone === "bull" ? "text-bull" : "text-bear"}`}>{row.avgR}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Integrations() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
        <SectionHeader kicker="Workflow" title="From CSV to certificate, built for real trader workflows." desc="Start with templates, convert broker exports, journal the trade, audit performance, then share verified snapshots." />
        <div className="flex flex-wrap justify-center gap-3">
          {integrations.map((name) => (
            <span key={name} className="rounded-xl border border-line bg-panel/60 px-4 py-3 font-mono2 text-sm text-muted2">{name}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-line/60 bg-ink2/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader kicker="How it works" title="Three steps from chaos to clarity." desc="ProfitPnL keeps your review process simple enough to do every day and powerful enough to reveal your edge." />
        <div className="grid gap-5 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <div key={step.title} className="profit-card p-6">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 font-mono2 text-lg font-bold text-gold">{index + 1}</div>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted2">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="reviews" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader kicker="Reviews" title="Built for traders who want receipts, not excuses." desc="The goal is simple: less guessing, cleaner execution, stronger review habits." />
        <div className="grid gap-5 md:grid-cols-3">
          {reviewsData.map((review) => (
            <div key={review.name} className="profit-card p-6">
              <div className="mb-4 flex gap-1 text-gold">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={15} fill="currentColor" />)}</div>
              <p className="text-sm leading-relaxed text-muted2">“{review.quote}”</p>
              <p className="mt-5 font-bold text-txt">{review.name}</p>
              <p className="text-xs text-dim">{review.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="border-y border-line/60 bg-ink2/50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <SectionHeader kicker="Pricing" title="Start free. Upgrade when you are ready to review like a pro." desc="Use the free plan and public tools first. Pro unlocks the full journal operating system." />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="profit-card p-7">
            <h3 className="text-xl font-bold">Free</h3>
            <p className="mt-3 text-4xl font-black">$0</p>
            <p className="mt-1 text-sm text-dim">forever</p>
            <ul className="mt-6 space-y-3 text-sm text-muted2">
              {[
                "Up to 50 trades",
                "Basic analytics",
                "1 trading account",
                "CSV import/export",
                "Free public calculators",
              ].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={16} className="text-bull" /> {item}</li>)}
            </ul>
            <Link href="/register" className="mt-7 inline-flex w-full justify-center rounded-xl border border-line px-5 py-3 font-bold text-txt transition-colors hover:border-gold/50 hover:text-gold">Get Started Free</Link>
          </div>
          <div className="profit-card relative overflow-hidden border-gold/50 p-7 shadow-[0_0_70px_rgba(240,180,41,0.12)]">
            <div className="absolute right-0 top-0 gold-gradient rounded-bl-xl px-4 py-1 text-[10px] font-black uppercase tracking-widest text-ink">Most Popular</div>
            <h3 className="flex items-center gap-2 text-xl font-bold"><Zap size={20} className="text-gold" /> Pro</h3>
            <p className="mt-3 text-4xl font-black">$19 USD</p>
            <p className="mt-1 text-sm text-dim">/mo · 7-day free trial</p>
            <ul className="mt-6 space-y-3 text-sm text-muted2">
              {planFeatures.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={16} className="text-bull" /> {item}</li>)}
            </ul>
            <Link href="/register?trial=true" className="gold-gradient mt-7 inline-flex w-full justify-center rounded-xl px-5 py-3 font-bold text-ink">Start 7-Day Trial</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <SectionHeader kicker="FAQ" title="Questions traders ask before journaling seriously." desc="Short answers. No hype." />
        <div className="space-y-3">
          {faqsData.map((faq) => (
            <details key={faq.q} className="profit-card group p-5">
              <summary className="cursor-pointer list-none font-bold text-txt">{faq.q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted2">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section id="cta" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-gold/35 bg-gradient-to-br from-gold/12 via-panel to-ink2 p-8 text-center shadow-[0_0_80px_rgba(240,180,41,0.13)] sm:p-12">
        <Target className="mx-auto mb-5 text-gold" size={44} />
        <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">Your edge is hiding in your trade history.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted2">Start logging today. Review the numbers. Fix one leak at a time.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className="gold-gradient rounded-xl px-7 py-4 font-bold text-ink">Get Started Free</Link>
          <Link href="/tools" className="rounded-xl border border-line px-7 py-4 font-semibold text-txt transition-colors hover:border-gold/50 hover:text-gold">Explore Free Tools</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 bg-ink2/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ProfitPnL" className="h-9 w-auto" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted2">
              The trading journal and performance operating system for traders who want data, discipline, and shareable proof.
            </p>
          </div>
          {footerCols.map((col) => (
            <div key={col.h}>
              <h4 className="mb-4 font-mono2 text-xs font-bold uppercase tracking-widest text-txt/80">{col.h}</h4>
              <ul className="space-y-2.5">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-dim transition-colors hover:text-gold">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line/60 pt-6 sm:flex-row">
          <p className="font-mono2 text-xs text-dim">© {new Date().getFullYear()} ProfitPnL. All rights reserved.</p>
          <p className="font-mono2 text-[10px] text-dim">A journal, not financial advice. Trading involves risk.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-ink text-txt antialiased">
      <Navbar />
      <main className="overflow-x-hidden pt-14">
        <TickerTape />
        <Hero />
        <Stats />
        <ToolsPreview />
        <Features />
        <Playbook />
        <Integrations />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
