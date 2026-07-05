import type { Metadata } from "next";
import WhatWentWrongClient from "./WhatWentWrongClient";
const title = "What Went Wrong With My Trade? — Free Trade Review Tool | ProfitPnL";
const description = "Review a losing trade with a free post-trade checklist and get likely mistakes, journal tags, and one action plan.";
export const metadata: Metadata = { title, description, alternates: { canonical: "/tools/what-went-wrong-trading" } };
export default function Page() { return <WhatWentWrongClient />; }
