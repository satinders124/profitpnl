"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { normalizeBrokerCsv, parseTradesCsv } from "@/lib/growth/tool-analysis";

const sample = `date,symbol,side,strategy,session,result,net pnl
2026-07-01,NQ,LONG,ORB,New York,2.2,440
2026-07-02,ES,SHORT,FVG,New York,-1,-200`;

export default function BrokerCsvConverterClient() {
  const [input, setInput] = useState(sample);
  const output = useMemo(() => normalizeBrokerCsv(input), [input]);
  const trades = useMemo(() => parseTradesCsv(input), [input]);
  const href = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(output)}`, [output]);

  return (
    <ToolShell eyebrow="CSV Import Tool" title="Broker CSV Converter" description="Convert messy broker exports into a clean ProfitPnL-ready trading journal CSV. Works with common columns from MT5, Tradovate, NinjaTrader, TradingView exports, and spreadsheets." currentPath="/tools/broker-csv-converter">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="profit-card p-6">
          <h2 className="mb-3 text-lg font-bold text-txt">Paste broker CSV</h2>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} className="min-h-[360px] w-full rounded-2xl border border-line bg-ink2 p-4 font-mono2 text-xs text-txt outline-none focus:border-gold/70" />
          <p className="mt-3 text-sm text-muted2">Detected {trades.length} trade rows.</p>
        </section>
        <section className="profit-card p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-txt">ProfitPnL CSV output</h2>
            <a href={href} download="profitpnl-converted-journal.csv" className="gold-gradient inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-ink"><Download size={15} /> Download</a>
          </div>
          <textarea readOnly value={output} className="min-h-[360px] w-full rounded-2xl border border-line bg-ink2 p-4 font-mono2 text-xs text-txt outline-none" />
        </section>
      </div>
    </ToolShell>
  );
}
