import type { Metadata } from "next";
import { LegalList, LegalSection, LegalShell } from "@/components/legal/LegalShell";

const title = "Risk Disclaimer";
const description = "Important trading risk disclosures for ProfitPnL users. ProfitPnL is a journal and analytics tool, not financial advice.";

export const metadata: Metadata = {
  title: `${title} | ProfitPnL`,
  description,
  alternates: { canonical: "/risk-disclaimer" },
};

export default function RiskDisclaimerPage() {
  return (
    <LegalShell title={title} description={description}>
      <LegalSection title="1. Trading involves risk">
        <p>
          Trading financial markets involves substantial risk. You can lose some or all of your capital. Leveraged products, futures, options, forex, CFDs, crypto assets, and prop-firm challenges can involve rapid losses and may not be suitable for all traders.
        </p>
      </LegalSection>

      <LegalSection title="2. ProfitPnL is not financial advice">
        <p>
          ProfitPnL is a trading journal, analytics, calculator, certificate, and education/productivity platform. We do not provide personalized investment advice, brokerage services, portfolio management, trade signals, or recommendations to buy, sell, or hold any asset.
        </p>
      </LegalSection>

      <LegalSection title="3. Past performance does not guarantee future results">
        <p>
          Historical results, journal analytics, certificates, win rate, profit factor, expectancy, R-multiples, screenshots, and backtests do not guarantee future performance. Markets change and real execution can differ from analysis.
        </p>
      </LegalSection>

      <LegalSection title="4. Calculators and analytics are estimates">
        <p>
          ProfitPnL calculators and analytics are provided for educational and planning purposes. Calculations may not include all broker-specific costs, spreads, commissions, swap fees, slippage, margin requirements, taxes, exchange fees, or rule variations from prop firms and brokers.
        </p>
      </LegalSection>

      <LegalSection title="5. AI output can be wrong">
        <p>
          AI-assisted coaching or analysis can contain mistakes, omissions, or unsuitable suggestions. You are responsible for independently reviewing any output before using it. Do not treat AI output as financial advice.
        </p>
      </LegalSection>

      <LegalSection title="6. Prop-firm and funded account risk">
        <p>
          Prop-firm rules vary. Daily drawdown, maximum drawdown, trailing drawdown, news rules, consistency rules, payout rules, and account breach calculations may differ between firms. Always confirm your own firm dashboard and rulebook before making decisions.
        </p>
      </LegalSection>

      <LegalSection title="7. Your responsibility">
        <LegalList
          items={[
            "You are solely responsible for your trades, position sizes, risk, and use of leverage.",
            "You should only trade capital you can afford to lose.",
            "You should consider seeking advice from a licensed financial professional where appropriate.",
            "You should verify all calculations and data before relying on them.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Questions about this risk disclaimer can be sent to <a className="text-gold hover:underline" href="mailto:hello@profitpnl.com">hello@profitpnl.com</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
