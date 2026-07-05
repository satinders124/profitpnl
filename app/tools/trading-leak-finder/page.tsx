import type { Metadata } from "next";
import TradingLeakFinderClient from "./TradingLeakFinderClient";

const title = "Trading Leak Finder — Free Trader Weakness Quiz | ProfitPnL";
const description = "Find your biggest trading leaks with a free trader psychology and execution quiz. Get a leak profile and action plan instantly.";

export const metadata: Metadata = { title, description, alternates: { canonical: "/tools/trading-leak-finder" } };

export default function Page() { return <TradingLeakFinderClient />; }
