import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Download, FileSpreadsheet } from "lucide-react";
import { GuideSection, ResourceCard, ResourceShell } from "@/components/resources/ResourceShell";

const title = "Trading Journaling Guides";
const description =
  "Free trading journal guides for forex, futures, crypto, and prop-firm traders. Learn what to track, how to review trades, and how to turn journal data into an edge.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/journaling-guides" },
  openGraph: { title: `${title} | ProfitPnL`, description, url: "/journaling-guides", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to journal trades effectively",
  description,
  step: [
    { "@type": "HowToStep", name: "Record the trade setup", text: "Log instrument, direction, setup, session, timeframe, entry, stop-loss, target, and account." },
    { "@type": "HowToStep", name: "Record the result", text: "Track P&L, R-multiple, win/loss, screenshots, tags, and whether the trade followed your plan." },
    { "@type": "HowToStep", name: "Review patterns", text: "Review win rate, expectancy, profit factor, drawdown, setups, days, sessions, emotions, and mistakes." },
    { "@type": "HowToStep", name: "Create one action item", text: "Turn every review into one concrete behavior to repeat or remove next session." },
  ],
};

const checklist = [
  "Instrument and market traded",
  "Date, time, session, and timeframe",
  "Long/short direction and setup name",
  "Entry, stop-loss, take-profit, and planned R:R",
  "Actual result in R and/or dollars",
  "Screenshot or chart link",
  "Emotion before and during the trade",
  "Execution rating from 1 to 5",
  "Mistake tag if rules were broken",
  "Lesson and next-session action item",
];

export default function JournalingGuidesPage() {
  return (
    <ResourceShell
      title={title}
      description={description}
      cta={
        <div className="flex flex-wrap gap-3">
          <Link href="/csv-templates" className="gold-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-ink">
            <Download size={16} /> Download CSV Templates
          </Link>
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-bold text-txt transition-colors hover:border-gold/50 hover:text-gold">
            Start Journaling Free
          </Link>
        </div>
      }
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid gap-5 md:grid-cols-3">
        <ResourceCard
          title="Trade Journal Checklist"
          description="The core fields every serious trader should capture after each trade. Use this before building any fancy analytics."
          href="#checklist"
          meta="Start here"
        />
        <ResourceCard
          title="Weekly Review Framework"
          description="A repeatable weekly review process to find leaks in setups, sessions, execution, risk, and psychology."
          href="#weekly-review"
          meta="Review"
        />
        <ResourceCard
          title="CSV Templates"
          description="Download spreadsheet templates for forex, futures, crypto, psychology review, and general trade journaling."
          href="/csv-templates"
          meta="Downloads"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <GuideSection title="Why journaling matters more than your entry">
            <p>
              Most traders obsess over entries, but your long-term edge usually lives in patterns: which setup actually works, which session damages your account, which emotion leads to rule breaks, and whether your winners are large enough to pay for your losers.
            </p>
            <p>
              A trading journal gives you a feedback loop. Without it, every trading day feels emotional and random. With it, your performance becomes measurable and fixable.
            </p>
          </GuideSection>

          <GuideSection title="What to journal after every trade">
            <p>
              A good trade journal should capture both the numbers and the behavior behind the trade. The numbers tell you what happened. The behavior tells you why it happened.
            </p>
            <div id="checklist" className="grid gap-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <div key={item} className="flex gap-2 rounded-xl border border-line bg-ink2/70 p-3 text-sm text-muted2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-bull" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </GuideSection>

          <GuideSection title="The best trade journal format">
            <p>
              Start simple. Every trade should have a consistent row of data: date, instrument, direction, setup, session, timeframe, entry, stop, target, result, P&L, emotion, mistake, lesson, and review status.
            </p>
            <p>
              Once that is consistent, you can build real analytics: win rate by setup, profit factor by session, drawdown by week, average R by instrument, and execution rating by emotion.
            </p>
          </GuideSection>

          <GuideSection title="How to use R-multiple in your journal">
            <p>
              R-multiple measures each trade result relative to your planned risk. If you risked $100 and made $250, the trade was +2.5R. If you lost your planned risk, it was -1R.
            </p>
            <p>
              R makes your journal cleaner because it lets you compare trades across different account sizes, instruments, and markets. A $500 win may be great on one account and terrible risk management on another. R solves that.
            </p>
          </GuideSection>

          <GuideSection title="Weekly trading review framework">
            <div id="weekly-review" className="space-y-3">
              <p>At the end of each week, answer these questions:</p>
              <ol className="list-decimal space-y-2 pl-5">
                <li>Which setup produced the most total R?</li>
                <li>Which setup or session caused the biggest drawdown?</li>
                <li>Did I follow my risk rules on every trade?</li>
                <li>What was my most common mistake?</li>
                <li>What emotion appeared before my worst trades?</li>
                <li>What should I repeat next week?</li>
                <li>What one behavior should I remove next week?</li>
              </ol>
            </div>
          </GuideSection>

          <GuideSection title="From spreadsheet to ProfitPnL">
            <p>
              CSV templates are a good starting point if you are not journaling yet. But spreadsheets become slow once you need filters, dashboards, certificates, AI review, and prop account tracking.
            </p>
            <p>
              ProfitPnL is built to turn those same journal fields into dashboards automatically, so you can spend less time formatting spreadsheets and more time reviewing your edge.
            </p>
          </GuideSection>
        </div>

        <aside className="space-y-4">
          <div className="profit-card sticky top-24 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold">
              <FileSpreadsheet size={21} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-txt">Free CSV pack</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted2">
              Download templates for general trading, forex, futures, crypto, and psychology review.
            </p>
            <Link href="/csv-templates" className="gold-gradient mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-ink">
              Download Templates <Download size={15} />
            </Link>
          </div>
        </aside>
      </div>
    </ResourceShell>
  );
}
