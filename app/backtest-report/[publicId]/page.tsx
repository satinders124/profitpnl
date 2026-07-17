import { createServerClient } from "@/lib/supabase-server";
import Link from "next/link";
import { notFound } from "next/navigation";

type Params = { params: Promise<{ publicId: string }> };

type Metrics = Record<string, unknown>;

type Report = {
  public_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  metrics: Metrics;
  trades: Array<Record<string, unknown>>;
  created_at: string;
};

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pct(value: unknown) {
  return `${(n(value) * 100).toFixed(1)}%`;
}

function r(value: unknown) {
  const parsed = n(value);
  return `${parsed >= 0 ? "+" : ""}${parsed.toFixed(2)}R`;
}

function money(value: unknown) {
  const parsed = n(value);
  return `${parsed >= 0 ? "+" : "-"}$${Math.abs(parsed).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#24243C] bg-[#0D0D1A] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

export default async function PublicBacktestReportPage({ params }: Params) {
  const { publicId } = await params;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("backtest_reports")
    .select("public_id, title, period_start, period_end, metrics, trades, created_at")
    .eq("public_id", publicId)
    .eq("visibility", "public")
    .maybeSingle();

  if (!data) notFound();
  const report = data as Report;
  const m = report.metrics || {};
  const topTrades = (report.trades || []).slice(0, 20);

  return (
    <main className="min-h-screen bg-[#08080C] px-4 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-7">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#F0B429]/25 bg-[#0D0D1A] p-7 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="inline-flex rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">Verified Backtest Report</p>
              <h1 className="mt-5 text-4xl font-black tracking-tighter sm:text-5xl">{report.title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                Public ProfitPnL backtesting performance report. Backtested results are hypothetical and do not guarantee future performance.
              </p>
              <p className="mt-4 text-xs text-[#8080A0]">Period: {report.period_start || "—"} to {report.period_end || "—"} · Created {new Date(report.created_at).toLocaleDateString()}</p>
            </div>
            <div className="rounded-3xl border border-[#1E1E38] bg-[#080810] p-4 text-center">
              <img src={`/api/backtest-reports/${report.public_id}/qr`} alt="Backtest report QR code" className="h-40 w-40 rounded-xl bg-white p-2" />
              <Link href={`/api/backtest-reports/${report.public_id}/pdf`} className="gold-gradient mt-4 inline-flex rounded-2xl px-4 py-2 text-xs font-black text-[#080810]">Download PDF</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat label="Trades" value={String(m.tradeCount || 0)} />
          <Stat label="Win Rate" value={pct(m.winRate)} />
          <Stat label="Total R" value={r(m.totalR)} />
          <Stat label="Expectancy" value={r(m.expectancy)} />
          <Stat label="Profit Factor" value={n(m.profitFactor) >= 99 ? "∞" : n(m.profitFactor).toFixed(2)} />
          <Stat label="Max Drawdown" value={r(m.maxDrawdownR)} />
          <Stat label="Gross P&L" value={money(m.grossPnl)} />
          <Stat label="Rule Adherence" value={pct(m.averageRuleAdherence)} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#24243C] bg-[#0D0D1A] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Best Model</p>
            <p className="mt-2 text-xl font-black text-[#00D084]">{String(m.bestModel || "—")}</p>
          </div>
          <div className="rounded-2xl border border-[#24243C] bg-[#0D0D1A] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Weakest Model</p>
            <p className="mt-2 text-xl font-black text-[#F0B429]">{String(m.weakestModel || "—")}</p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#24243C] bg-[#0D0D1A] p-5">
          <h2 className="mb-4 text-lg font-black">Trade Sample</h2>
          {topTrades.length === 0 ? (
            <p className="text-sm text-[#8080A0]">No trade rows included.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-[#5A5A80]"><tr><th className="py-3">Date</th><th>Model</th><th>Symbol</th><th>Side</th><th>R</th><th>P&L</th><th>Rules</th></tr></thead>
                <tbody>
                  {topTrades.map((trade, index) => (
                    <tr key={`${trade.id || index}`} className="border-t border-[#1E1E38]">
                      <td className="py-3 text-[#A0A0C0]">{String(trade.tradeDate || "—")}</td>
                      <td className="font-bold">{String(trade.modelName || "—")}</td>
                      <td>{String(trade.symbol || "—")}</td>
                      <td className="text-[#F0B429]">{String(trade.side || "—")}</td>
                      <td>{r(trade.resultR)}</td>
                      <td>{money(trade.pnl)}</td>
                      <td>{trade.ruleAdherence == null ? "—" : pct(trade.ruleAdherence)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
