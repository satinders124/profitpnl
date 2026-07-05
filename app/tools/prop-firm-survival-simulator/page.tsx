import type { Metadata } from "next";
import PropFirmSurvivalClient from "./PropFirmSurvivalClient";

const title = "Prop Firm Survival Simulator — Funded Account Risk Calculator | ProfitPnL";
const description = "Estimate prop firm challenge breach risk from win rate, average R, risk per trade, account size, and drawdown limits.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/tools/prop-firm-survival-simulator" } };
export default function Page() { return <PropFirmSurvivalClient />; }
