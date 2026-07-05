import type { Metadata } from "next";
import TradeSetupScoreClient from "./TradeSetupScoreClient";

const title = "Trade Setup Score Calculator — Free Pre-Trade Checklist | ProfitPnL";
const description = "Score your trade setup before entry with a free pre-trade checklist covering trend, risk-reward, invalidation, news, and psychology.";

export const metadata: Metadata = { title, description, alternates: { canonical: "/tools/trade-setup-score-calculator" } };

export default function Page() { return <TradeSetupScoreClient />; }
