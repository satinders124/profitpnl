"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion"; // Added Variants
import { 
  Check, X, ArrowRight, BarChart3, Bot, Brain, 
  CreditCard, Cloud, Trophy, ShieldCheck, Plus,
  Minus, Zap, Target, TrendingUp, Sparkles,
  ChevronRight, Lock, Star, Quote
} from "lucide-react";

// --- MOTION CONFIG ---
// We use 'as Variants' and cast the ease array as 'any' to bypass the strict TS check
const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.8, 
      ease: [0.16, 1, 0.3, 1] as any 
    } 
  }
};

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setFaqOpen(faqOpen === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#05050a] text-white selection:bg-[#F0B429] selection:text-black overflow-x-hidden">
      
      {/* --- DYNAMIC BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#F0B429]/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
      </div>

      {/* --- NAVIGATION --- */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#0D0D1A]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="w-10 h-10 gold-gradient rounded-xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(240,180,41,0.4)] group-hover:rotate-12 transition-transform">
              P
            </div>
            <span className="text-xl font-black tracking-tighter group-hover:text-[#F0B429] transition-colors">ProfitPnL</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-zinc-400">
            {["Features", "How it Works", "Pricing"].map((item) => (
              <Link key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="hover:text-white transition-colors">{item}</Link>
            ))}
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="gold-gradient px-5 py-2 rounded-full text-black text-xs font-black transition-transform hover:scale-105 active:scale-95 shadow-lg">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-24 px-6 text-center z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial="hidden" animate="visible" variants={FADE_UP}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-gradient/10 border border-[#F0B429]/20 text-[#F0B429] text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Zap size={12} /> AI-Powered · Built for Prop Traders
          </motion.div>
          
          <motion.h1 
            initial="hidden" animate="visible" variants={FADE_UP}
            className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] mb-8"
          >
            Stop Guessing. <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#F0B429] to-amber-600">
              Find Your Edge.
            </span>
          </motion.h1>
          
          <motion.p 
            initial="hidden" animate="visible" variants={FADE_UP}
            className="text-zinc-400 text-lg md:text-2xl max-w-3xl mx-auto mb-12 leading-relaxed font-medium"
          >
            The professional trading journal built for serious traders. Track every trade, 
            decode every pattern, and let AI tell you exactly what's holding you back.
          </motion.p>
          
          <motion.div 
            initial="hidden" animate="visible" variants={FADE_UP}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <Link href="/register" className="group relative px-8 py-4 rounded-2xl gold-gradient text-black font-black text-xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(240,180,41,0.4)]">
              <span className="relative z-10 flex items-center gap-2">
                Start Free — No Card Needed <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link href="/login" className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-black text-xl hover:bg-white/10 transition-all">
              Login to Account
            </Link>
          </motion.div>
        </div>

        {/* Hero Dashboard Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="mt-20 relative max-w-6xl mx-auto px-4"
        >
          <div className="relative rounded-[3rem] border border-white/10 bg-[#0D0D1A]/80 backdrop-blur-2xl p-4 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-black aspect-video flex items-center justify-center">
              <div className="text-zinc-700 flex flex-col items-center gap-4">
                <BarChart3 size={64} className="opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-30">Interactive Performance Dashboard</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* --- TRUST STATS --- */}
      <section className="py-12 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatBox value="44+" label="Metrics Tracked" />
          <StatBox value="AI" label="Coach Built-in" color="text-[#F0B429]" />
          <StatBox value="∞" label="Prop Accounts" />
          <StatBox value="66%" label="Cloud Synced" />
        </div>
      </section>

      {/* --- FEATURES SECTION (BENTO GRID) --- */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">Everything a serious trader needs</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">From granular analytics to AI-powered coaching — one journal that actually makes you better.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard 
              className="md:col-span-2" 
              icon={<BarChart3 />} 
              title="Advanced Analytics" 
              desc="Win rate by setup, session, day, and emotion. Direction splits, equity curve, and a P&L calendar heatmap to spot exactly where your edge lives." 
              highlight="Edge Detection"
            />
            <BentoCard 
              icon={<Bot />} 
              title="AI Trading Coach" 
              desc="Per-trade feedback and weekly reports. Your AI coach reads your full journal and calls out revenge trading & FOMO." 
            />
            <BentoCard 
              icon={<Brain />} 
              title="Psychology Journal" 
              desc="Daily mindset logging with mood tracking. AI surfaces overconfidence patterns before they cost you." 
            />
            <BentoCard 
              className="md:col-span-2"
              icon={<CreditCard />} 
              title="Prop Firm Tracker" 
              desc="Track trailing drawdown, daily loss limits, and account health across every prop account. Never blow an account again." 
              highlight="Drawdown Guard"
            />
            <BentoCard 
              icon={<Trophy />} 
              title="Verified P&L" 
              desc="Generate a shareable, independently-verifiable performance certificate. Prove your results are real." 
            />
            <BentoCard 
              icon={<Cloud />} 
              title="Cloud Sync" 
              desc="Data syncs across all your devices. Log on your phone, review on desktop. Always backed up." 
            />
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-24 px-6 bg-black/40">
        <div className="max-w-5xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Get started in 3 minutes</h2>
            <p className="text-zinc-400">No spreadsheets, no manual math. Just log and learn.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />
            <Step number="1" title="Log your trades" desc="Add trades manually or import a CSV. Tag every trade with setup, session, and emotion." />
            <Step number="2" title="See your edge" desc="Dashboards break down your performance by every variable. Instantly spot what works." />
            <Step number="3" title="Fix your leaks" desc="Your AI Coach turns data into action — one specific fix per week to compound your edge." />
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Built by traders, for traders</h2>
            <div className="flex justify-center gap-1 text-[#F0B429] mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} size={20} fill="#F0B429" />)}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Testimonial name="Marcus T." role="FTMO Funded" text="The AI Coach caught a revenge-trading pattern I'd been blind to for months. Found my leak in week one." />
            <Testimonial name="Sara K." role="Gold Day Trader" text="Finally a journal that doesn't feel like homework. Logging takes 30 seconds and the analytics are genuinely insightful." />
            <Testimonial name="Dev P." role="Multi-account Prop" text="The prop firm tracker saved my account. Drawdown bar turned red and I cut size immediately. Worth Pro alone." />
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 px-6 relative">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">Simple, honest pricing</h2>
            <p className="text-zinc-400">Start free forever. Upgrade when you're ready to scale.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="p-10 rounded-[3rem] border border-white/10 bg-white/5 flex flex-col text-left hover:border-white/20 transition-all">
              <h3 className="text-xl font-bold text-white mb-2">Essential</h3>
              <div className="text-5xl font-black text-white mb-8">$0<span className="text-sm text-zinc-500 font-normal ml-2">forever</span></div>
              <div className="space-y-4 mb-12 flex-1">
                <PriceItem text="Up to 50 trades" active />
                <PriceItem text="Basic analytics" active />
                <PriceItem text="1 account" active />
                <PriceItem text="CSV import/export" active />
                <PriceItem text="AI Coach" active={false} />
                <PriceItem text="Psychology journal" active={false} />
              </div>
              <Link href="/register" className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 text-white font-bold text-center block hover:bg-white/10 transition-all">
                Get Started Free
              </Link>
            </div>

            <div className="p-10 rounded-[3rem] border-2 border-[#F0B429] bg-[#111120] flex flex-col text-left relative shadow-[0_0_50px_rgba(240,180,41,0.2)]">
              <div className="absolute -top-4 right-8 bg-gold-gradient text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Zap size={18} className="text-[#F0B429]" /> Pro Elite
              </h3>
              <div className="text-5xl font-black text-white mb-8">$19<span className="text-sm text-zinc-500 font-normal ml-2">/mo</span></div>
              <div className="space-y-4 mb-12 flex-1">
                <PriceItem text="Unlimited trades" active />
                <PriceItem text="Full analytics suite" active />
                <PriceItem text="Unlimited accounts" active />
                <PriceItem text="AI Coach + weekly report" active />
                <PriceItem text="Psychology journal" active />
                <PriceItem text="Verified P&L certificates" active />
              </div>
              <Link href="/upgrade" className="w-full py-4 rounded-2xl gold-gradient text-black font-black text-center block transition-transform active:scale-95 shadow-lg">
                Ascend to Pro →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-24 px-6 bg-black/20">
        <div className="max-w-3xl mx-auto">
          <motion.h2 
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
            className="text-3xl font-black text-white text-center mb-12"
          >
            Questions?
          </motion.h2>
          <div className="space-y-4">
            <FaqItem id="faq1" question="Is there really a free plan?" answer="Yes — Free forever, no card needed. You get 50 trades, basic analytics, and 1 account. Upgrade any time to unlock the AI Coach, psychology journal, and unlimited everything." toggle={toggleFaq} open={faqOpen} />
            <FaqItem id="faq2" question="Do I need to enter a card for the trial?" answer="No card is charged during your 7-day Pro trial. Add a card only when you decide to continue — cancel before the trial ends and pay nothing." toggle={toggleFaq} open={faqOpen} />
            <FaqItem id="faq3" question="Can I cancel any time?" answer="Absolutely. Cancel in one click from Settings → Manage Billing. You keep Pro access until your billing period ends, then drop to Free. No lock-in, ever." toggle={toggleFaq} open={faqOpen} />
            <FaqItem id="faq4" question="Is my data safe?" answer="Your trade data is encrypted in transit and at rest, isolated to your account, and never shared. You can export or delete everything at any time." toggle={toggleFaq} open={faqOpen} />
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-white/10 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 gold-gradient rounded-lg flex items-center justify-center text-black font-black text-sm">P</div>
          <span className="text-lg font-black text-white">ProfitPnL</span>
        </div>
        <p className="text-zinc-500 text-xs">© 2026 ProfitPnL. Built for the 1% of Traders.</p>
      </footer>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatBox({ value, label, color = "text-white" }: { value: string; label: string; color?: string }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05 }}
      className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center"
    >
      <div className={`text-3xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{label}</div>
    </motion.div>
  );
}

function BentoCard({ icon, title, desc, className = "", highlight }: { icon: React.ReactNode; title: string; desc: string; className?: string; highlight?: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className={`p-8 rounded-[3rem] border border-white/10 bg-white/5 hover:border-[#F0B429]/50 transition-all group relative overflow-hidden ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#1E1E38] flex items-center justify-center mb-6 group-hover:bg-[#F0B429] group-hover:text-black transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
      {highlight && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-gradient/10 border border-[#F0B429]/20 text-[#F0B429] text-[10px] font-black uppercase tracking-widest">
          {highlight}
        </div>
      )}
    </motion.div>
  );
}

function Step({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <motion.div 
      initial="hidden" whileInView="visible" viewport={{ once: true }} variants={FADE_UP}
      className="flex flex-col items-center text-center space-y-4 group"
    >
      <div className="w-14 h-14 rounded-full bg-gold-gradient text-black flex items-center justify-center font-black text-2xl shadow-[0_0_20px_rgba(240,180,41,0.4)] group-hover:scale-110 transition-transform">
        {number}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">{desc}</p>
    </motion.div>
  );
}

function PriceItem({ text, active }: { text: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      {active ? <Check size={14} className="text-emerald-400 shrink-0" /> : <X size={14} className="text-red-500 shrink-0" />}
      <span className={`${active ? "text-zinc-300" : "text-zinc-600 line-through"}`}>{text}</span>
    </div>
  );
}

function FaqItem({ id, question, answer, toggle, open }: { id: string; question: string; answer: string; toggle: (id: string) => void; open: string | null }) {
  const isOpen = open === id;
  return (
    <div className="border-b border-white/10">
      <button onClick={() => toggle(id)} className="w-full py-6 flex items-center justify-between text-left text-white hover:text-[#F0B429] transition-colors">
        <span className="text-sm font-bold">{question}</span>
        {isOpen ? <Minus size={16} /> : <Plus size={16} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-6 text-sm text-zinc-400 leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Testimonial({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <motion.div 
      whileHover={{ y: -10 }}
      className="p-8 rounded-[2.5rem] border border-white/10 bg-white/5 hover:border-[#F0B429]/30 transition-all group relative"
    >
      <Quote className="absolute top-6 right-6 text-white/10 group-hover:text-[#F0B429]/20 transition-colors" size={40} />
      <p className="text-zinc-300 text-sm leading-relaxed mb-6 relative z-10 italic">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-white">
          {name[0]}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{name}</p>
          <p className="text-[10px] text-zinc-500 uppercase font-bold">{role}</p>
        </div>
      </div>
    </motion.div>
  );
}