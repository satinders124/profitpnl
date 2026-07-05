import type { Metadata } from "next";
import LotSizeCalculatorClient from "@/app/tools/lot-size-calculator/LotSizeCalculatorClient";
export const metadata: Metadata = { title: "Embeddable Lot Size Calculator | ProfitPnL", robots: { index: false, follow: true } };
export default function Page(){ return <LotSizeCalculatorClient />; }
