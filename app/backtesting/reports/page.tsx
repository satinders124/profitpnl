"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { createClient } from "@/lib/supabase-client";
import {
  createTrade,
  getJournalTrades,
  getModels,
  getProfile,
  type BacktestJournalTrade,
  type BacktestModel,
  type BacktestProfile,
} from "@/lib/backtesting/journal";
import { backtestReportCsv, buildBacktestReport } from "@/lib/backtesting/reporting";
import {
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  QrCode,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react";

type CsvRow = Record<string, string>;
type CreatedReport = {
  report?: { public_id: string; title: string; created_at: string };
  url?: string;
  pdfUrl?: string;
};

function money(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function r(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}R`;
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(current.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  row.push(current.trim());
  if (row.some(Boolean)) rows.push(row);

  const headers = rows[0] || [];
  return rows.slice(1).map((cells) =>
    headers.reduce<CsvRow>((acc, header, index) => {
      acc[header.trim().toLowerCase()] = cells[index] || "";
      return acc;
    }, {})
  );
}

function get(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key.toLowerCase()];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toTradePayload(row: CsvRow) {
  const sideRaw = get(row, ["side", "direction", "type"]).toLowerCase();
  const resultRaw = get(row, ["result", "outcome"]);
  const rMultiple = numberOrNull(get(row, ["r", "resultR", "rMultiple", "r_multiple"]));
  return {
    symbol: get(row, ["symbol", "instrument", "ticker"]),
    side: sideRaw.includes("short") || sideRaw.includes("sell") ? "short" : "long",
    tradeDate: get(row, ["date", "tradeDate", "entryDate"]),
    entryTime: get(row, ["entryTime", "date", "tradeDate"]),
    exitTime: get(row, ["exitTime", "date", "tradeDate"]),
    entryPrice: numberOrNull(get(row, ["entry", "entryPrice", "entry_price"])),
    exitPrice: numberOrNull(get(row, ["exit", "exitPrice", "exit_price"])),
    stopLoss: numberOrNull(get(row, ["sl", "stopLoss", "stop_loss"])),
    takeProfit: numberOrNull(get(row, ["tp", "takeProfit", "take_profit"])),
    pnl: numberOrNull(get(row, ["pnl", "profit", "p&l"])),
    rMultiple,
    result: resultRaw || (rMultiple !== null ? (rMultiple > 0 ? "win" : rMultiple < 0 ? "loss" : "be") : null),
    risk: numberOrNull(get(row, ["risk"])),
    riskUnit: get(row, ["riskUnit", "risk_unit"]) === "percent" ? "percent" : "currency",
    psychology: get(row, ["psychology", "emotion", "mindset"]),
    deviations: get(row, ["deviations", "mistake", "mistakes"]),
    notes: get(row, ["notes", "comment", "comments"]),
    ruleTicks: [],
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </Card>
  );
}

export default function BacktestingReportsPage() {
  const [models, setModels] = useState<BacktestModel[]>([]);
  const [trades, setTrades] = useState<BacktestJournalTrade[]>([]);
  const [profile, setProfile] = useState<BacktestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  const [reportTitle, setReportTitle] = useState("ProfitPnL Backtesting Performance Report");
  const [creating, setCreating] = useState(false);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [importModelId, setImportModelId] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [modelRows, tradeRows, profileRow] = await Promise.all([
        getModels(),
        getJournalTrades(),
        getProfile(),
      ]);
      setModels(modelRows);
      setTrades(tradeRows);
      setProfile(profileRow);
      setSelectedModelIds((current) => current.length ? current : modelRows.map((model) => model.id));
      setImportModelId((current) => current || modelRows[0]?.id || "");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const selectedTrades = useMemo(
    () => trades.filter((trade) => selectedModelIds.includes(trade.session_id)),
    [trades, selectedModelIds]
  );
  const selectedModels = useMemo(
    () => models.filter((model) => selectedModelIds.includes(model.id)),
    [models, selectedModelIds]
  );
  const report = useMemo(() => buildBacktestReport({ models: selectedModels, trades: selectedTrades, profile }), [selectedModels, selectedTrades, profile]);

  function toggleModel(id: string) {
    setSelectedModelIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function exportCsv() {
    const csv = backtestReportCsv(report.trades);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "profitpnl-backtesting-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function createShareReport() {
    setCreating(true);
    setCreatedReport(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/backtest-reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ title: reportTitle, modelIds: selectedModelIds, visibility: "public" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create report.");
      setCreatedReport(data);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Could not create report.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!createdReport?.url) return;
    await navigator.clipboard.writeText(createdReport.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function handleImport(file: File) {
    if (!importModelId) {
      setImportMessage("Create or select a backtest model before importing trades.");
      return;
    }
    setImporting(true);
    setImportMessage("");
    try {
      const rows = parseCsv(await file.text());
      let added = 0;
      let skipped = 0;
      for (const row of rows) {
        const payload = toTradePayload(row);
        if (!payload.tradeDate || !payload.symbol) {
          skipped++;
          continue;
        }
        await createTrade(importModelId, payload);
        added++;
      }
      setImportMessage(`Backtest import complete: ${added} trades added, ${skipped} skipped.`);
      await loadData();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <AppShell title="Backtesting Report Center" subtitle="AI analysis, import/export, public PDF reports, and QR verification.">
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" /> Loading backtest report center…</div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-7 pb-24">
          <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
            <div className="relative grid gap-7 p-6 lg:grid-cols-[1.35fr_0.8fr] lg:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><Sparkles size={12} /> Backtesting Intelligence</div>
                <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Backtesting Report Center</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Analyze your model data, import/export backtest trades, and create public PDF-ready reports with QR verification.</p>
              </div>
              <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Selected Sample</p>
                <p className="mt-2 text-5xl font-black text-[#F0B429]">{report.metrics.tradeCount}</p>
                <p className="mt-1 text-xs text-[#8080A0]">Trades across {selectedModels.length} selected model{selectedModels.length === 1 ? "" : "s"}.</p>
              </div>
            </div>
          </Card>

          <PageInsightPanel
            kind="backtesting-report"
            initialTitle="AI backtesting performance read"
            initialSummary="Generate a deeper AI read of your backtest sample, model quality, rule adherence, and next validation step."
            context={{ metrics: report.metrics, models: selectedModels.map((model) => ({ name: model.name, rules: model.rules, market: model.market, timeframe: model.timeframe })), sampleTrades: report.trades.slice(0, 20) }}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total R" value={r(report.metrics.totalR)} />
            <Stat label="Win Rate" value={pct(report.metrics.winRate)} />
            <Stat label="Expectancy" value={r(report.metrics.expectancy)} />
            <Stat label="Rule Adherence" value={pct(report.metrics.averageRuleAdherence)} />
            <Stat label="Profit Factor" value={report.metrics.profitFactor >= 99 ? "∞" : report.metrics.profitFactor.toFixed(2)} />
            <Stat label="Max Drawdown" value={r(report.metrics.maxDrawdownR)} />
            <Stat label="Gross P&L" value={money(report.metrics.grossPnl)} />
            <Stat label="Best Model" value={report.metrics.bestModel} />
          </div>

          <section className="grid gap-7 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><BarChart3 className="text-[#F0B429]" /> Model Scope</h2>
              {models.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">No backtest models yet. Create models in Backtesting mode first.</p>
              ) : (
                <div className="space-y-3">
                  {models.map((model) => (
                    <button key={model.id} onClick={() => toggleModel(model.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedModelIds.includes(model.id) ? "border-[#F0B429]/40 bg-[#F0B429]/10" : "border-[#1E1E38] bg-[#080810] hover:border-[#F0B429]/30"}`}>
                      <p className="font-black text-white">{model.name}</p>
                      <p className="mt-1 text-xs text-[#8080A0]">{model.market || "Market"} · {model.timeframe || "TF"} · {model.rules?.length || 0} rules</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><Share2 className="text-[#F0B429]" /> Export & Public Report</h2>
              <div className="space-y-4">
                <input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F0B429]" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={exportCsv} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429]"><Download size={16} /> Export CSV</button>
                  <button onClick={createShareReport} disabled={creating || !report.metrics.tradeCount} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-50">{creating ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />} Create Share PDF</button>
                </div>
                {createdReport?.url && (
                  <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center">
                      <img src={`/api/backtest-reports/${createdReport.report?.public_id}/qr`} alt="QR code" className="h-28 w-28 rounded-xl bg-white p-2" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-white">Public report created</p>
                        <p className="mt-1 truncate text-xs text-[#8080A0]">{createdReport.url}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-black text-zinc-300 hover:text-[#F0B429]"><Copy size={13} /> {copied ? "Copied" : "Copy Link"}</button>
                          <Link href={createdReport.url} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[#1E1E38] px-3 py-2 text-xs font-black text-zinc-300 hover:text-white"><ExternalLink size={13} /> View</Link>
                          <Link href={createdReport.pdfUrl || "#"} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-2 text-xs font-black text-[#F0B429]"><Download size={13} /> PDF</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </section>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><Upload className="text-[#F0B429]" /> Backtest Trade Import</h2>
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Import into model</label>
                <select value={importModelId} onChange={(event) => setImportModelId(event.target.value)} className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#F0B429]">
                  {models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-6 text-sm font-bold text-[#A0A0C0] hover:border-[#F0B429]/40 hover:text-white">
                {importing ? <Loader2 className="animate-spin" /> : <FileSpreadsheet className="text-[#F0B429]" />} Upload backtest CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && handleImport(event.target.files[0])} />
              </label>
            </div>
            {importMessage && <p className="mt-4 rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">{importMessage}</p>}
            <p className="mt-4 text-xs leading-6 text-[#8080A0]">CSV columns supported: symbol, side, date/tradeDate, entry, exit, sl, tp, pnl, r/rMultiple, result, psychology, deviations, notes.</p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
