"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades, saveTrade } from "@/lib/db";
import { Trade } from "@/types/trade";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  Wand2,
} from "lucide-react";

type CsvRow = Record<string, string>;
type Mapping = Record<string, string>;
type FieldKey = (typeof fields)[number];
type BrokerPreset = {
  id: string;
  label: string;
  description: string;
  fields: Partial<Record<FieldKey, string[]>>;
};
type RowStatus = "ready" | "duplicate" | "missing_required" | "missing_pnl";
type PreviewRow = {
  index: number;
  trade: Partial<Trade>;
  signature: string;
  status: RowStatus;
  issues: string[];
  importable: boolean;
};
type ImportReport = {
  added: number;
  duplicates: number;
  blocked: number;
  missingPnl: number;
};

const fields = [
  "date",
  "time",
  "instrument",
  "direction",
  "positionSize",
  "entry",
  "sl",
  "tp",
  "result",
  "pnl",
  "setup",
  "session",
  "emotion",
  "notes",
] as const;

const labels: Record<FieldKey, string> = {
  date: "Date",
  time: "Time",
  instrument: "Instrument",
  direction: "Direction",
  positionSize: "Position Size",
  entry: "Entry",
  sl: "Stop Loss",
  tp: "Take Profit",
  result: "R Result",
  pnl: "P&L ($)",
  setup: "Setup",
  session: "Session",
  emotion: "Emotion",
  notes: "Notes",
};

const presets: BrokerPreset[] = [
  {
    id: "generic",
    label: "Generic CSV",
    description: "Auto-detect common journal, spreadsheet, and broker column names.",
    fields: {},
  },
  {
    id: "mt4",
    label: "MT4",
    description: "MetaTrader 4 account history export.",
    fields: {
      date: ["Open Time", "Close Time", "Time"],
      time: ["Open Time", "Close Time", "Time"],
      instrument: ["Symbol", "Item"],
      direction: ["Type", "Order Type"],
      positionSize: ["Size", "Volume", "Lots"],
      entry: ["Price", "Open Price"],
      sl: ["S / L", "S/L", "SL"],
      tp: ["T / P", "T/P", "TP"],
      pnl: ["Profit", "Net Profit"],
      notes: ["Comment", "Comments"],
    },
  },
  {
    id: "mt5",
    label: "MT5",
    description: "MetaTrader 5 deals/history export.",
    fields: {
      date: ["Time", "Open Time", "Close Time"],
      time: ["Time", "Open Time", "Close Time"],
      instrument: ["Symbol"],
      direction: ["Type", "Direction"],
      positionSize: ["Volume", "Size", "Lots"],
      entry: ["Price", "Open Price"],
      sl: ["S / L", "S/L", "Stop Loss"],
      tp: ["T / P", "T/P", "Take Profit"],
      pnl: ["Profit", "Net Profit"],
      notes: ["Comment"],
    },
  },
  {
    id: "tradingview",
    label: "TradingView",
    description: "TradingView strategy tester or paper trading export.",
    fields: {
      date: ["Date/Time", "Date", "Entry Time", "Exit Time"],
      time: ["Date/Time", "Time", "Entry Time"],
      instrument: ["Symbol", "Ticker"],
      direction: ["Side", "Direction", "Type"],
      entry: ["Entry Price", "Entry"],
      sl: ["Stop Loss", "SL"],
      tp: ["Take Profit", "Target", "TP"],
      pnl: ["Net P&L", "P&L", "Profit"],
      result: ["R", "R Multiple"],
      setup: ["Strategy", "Setup"],
    },
  },
  {
    id: "tradovate",
    label: "Tradovate",
    description: "Futures trade performance export.",
    fields: {
      date: ["Date", "Open Time", "Timestamp"],
      time: ["Time", "Open Time", "Timestamp"],
      instrument: ["Contract", "Symbol", "Instrument"],
      direction: ["Buy/Sell", "Side", "Action"],
      entry: ["Avg Price", "Average Price", "Price"],
      pnl: ["PnL", "P&L", "Net PnL"],
      notes: ["Text", "Notes"],
    },
  },
  {
    id: "ninjatrader",
    label: "NinjaTrader",
    description: "NinjaTrader executions/trades export.",
    fields: {
      date: ["Entry Time", "Exit Time", "Time", "Date"],
      time: ["Entry Time", "Exit Time", "Time"],
      instrument: ["Instrument", "Name"],
      direction: ["Market pos.", "Market Position", "Action"],
      entry: ["Entry price", "Avg. price", "Price"],
      pnl: ["Profit", "Cum. profit", "P&L"],
      notes: ["Comment"],
    },
  },
  {
    id: "topstepx",
    label: "TopstepX",
    description: "TopstepX / ProjectX style futures exports.",
    fields: {
      date: ["Opened At", "Closed At", "Date", "Entry Time"],
      time: ["Opened At", "Closed At", "Time"],
      instrument: ["Contract", "Symbol", "Product"],
      direction: ["Side", "Direction"],
      entry: ["Entry Price", "Average Entry"],
      pnl: ["Realized P&L", "PnL", "Net P&L"],
      notes: ["Notes"],
    },
  },
  {
    id: "ctrader",
    label: "cTrader",
    description: "cTrader history CSV export.",
    fields: {
      date: ["Open Time", "Close Time", "Entry Time"],
      time: ["Open Time", "Close Time"],
      instrument: ["Symbol"],
      direction: ["Trade Side", "Side", "Direction"],
      entry: ["Entry Price", "Open Price"],
      sl: ["Stop Loss", "SL"],
      tp: ["Take Profit", "TP"],
      pnl: ["Net Profit", "Gross Profit", "P&L"],
      notes: ["Comment"],
    },
  },
];

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
  const data = rows.slice(1).map((cells) =>
    headers.reduce<CsvRow>((acc, header, index) => {
      acc[header] = cells[index] || "";
      return acc;
    }, {})
  );

  return { headers, data };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findHeader(headers: string[], aliases: string[]) {
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  for (const alias of aliases) {
    const exact = normalized.find(({ key }) => key === normalizeHeader(alias));
    if (exact) return exact.header;
  }
  for (const alias of aliases) {
    const cleanAlias = normalizeHeader(alias);
    const partial = normalized.find(({ key }) => key.includes(cleanAlias) || cleanAlias.includes(key));
    if (partial) return partial.header;
  }
  return "";
}

function autoMapping(headers: string[]) {
  const candidates: Record<FieldKey, string[]> = {
    date: ["date", "opentime", "closetime", "entrytime", "timeopened", "openedat", "closedat", "datetime", "timestamp"],
    time: ["time", "openhour", "entryhour", "opentime", "closetime", "datetime", "timestamp"],
    instrument: ["symbol", "instrument", "ticker", "market", "pair", "contract", "product"],
    direction: ["side", "direction", "type", "buysell", "action", "marketposition", "trade side"],
    positionSize: ["position_size", "positionsize", "size", "quantity", "qty", "contracts", "contractsize", "lots", "lot", "volume", "units"],
    entry: ["entry", "entryprice", "openprice", "priceopen", "avgprice", "averageprice"],
    sl: ["sl", "stoploss", "stop", "stopprice", "s/l"],
    tp: ["tp", "takeprofit", "target", "targetprice", "t/p"],
    result: ["r", "rmultiple", "result", "rresult"],
    pnl: ["pnl", "profit", "netpnl", "pl", "profitloss", "netprofit", "realizedpnl", "realizedp&l"],
    setup: ["setup", "strategy", "playbook", "model"],
    session: ["session", "marketsession"],
    emotion: ["emotion", "mood", "psychology"],
    notes: ["notes", "comment", "comments", "description", "text"],
  };

  const mapping: Mapping = {};
  for (const field of fields) {
    const match = findHeader(headers, candidates[field]);
    if (match) mapping[field] = match;
  }
  return mapping;
}

function applyPreset(headers: string[], preset: BrokerPreset) {
  const mapping = autoMapping(headers);
  for (const field of fields) {
    const aliases = preset.fields[field];
    if (!aliases) continue;
    const match = findHeader(headers, aliases);
    if (match) mapping[field] = match;
  }
  return mapping;
}

function toIsoDate(value: string) {
  if (!value) return "";
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);

  const slash = trimmed.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    const parsed = new Date(year, month - 1, day, 12);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function extractTime(value: string) {
  const match = value.match(/(\d{1,2}:\d{2})(?::\d{2})?/);
  return match ? match[1] : value;
}

function cleanDirection(value: string) {
  const v = value.trim().toUpperCase();
  if (v.includes("BUY") || v.includes("LONG")) return "LONG";
  if (v.includes("SELL") || v.includes("SHORT")) return "SHORT";
  return v;
}

function buildTrade(row: CsvRow, mapping: Mapping): Partial<Trade> {
  const get = (field: FieldKey) => (mapping[field] ? row[mapping[field]] || "" : "");
  return {
    date: toIsoDate(get("date")),
    time: extractTime(get("time")),
    instrument: get("instrument"),
    direction: cleanDirection(get("direction")),
    positionSize: get("positionSize"),
    entry: get("entry"),
    sl: get("sl"),
    tp: get("tp"),
    result: get("result"),
    pnl: get("pnl"),
    setup: get("setup"),
    session: get("session"),
    emotion: get("emotion"),
    notes: get("notes"),
    reviewed: false,
  };
}

function signature(trade: Partial<Trade>) {
  return [trade.date, trade.time, trade.instrument, trade.direction, trade.entry, trade.pnl].join("|").toLowerCase();
}

function analyzeRow(row: CsvRow, mapping: Mapping, existingSignatures: Set<string>, index: number): PreviewRow {
  const trade = buildTrade(row, mapping);
  const issues: string[] = [];
  if (!trade.date) issues.push("Missing date");
  if (!trade.instrument) issues.push("Missing instrument");
  if (!trade.direction) issues.push("Missing direction");
  if (trade.pnl === "" || trade.pnl === null || trade.pnl === undefined) issues.push("Missing P&L");

  const sig = signature(trade);
  const duplicate = existingSignatures.has(sig);
  if (duplicate) issues.push("Duplicate");

  const blocker = !trade.date || !trade.instrument || !trade.direction || duplicate;
  const status: RowStatus = duplicate ? "duplicate" : (!trade.date || !trade.instrument || !trade.direction) ? "missing_required" : issues.includes("Missing P&L") ? "missing_pnl" : "ready";
  return { index, trade, signature: sig, status, issues, importable: !blocker };
}

function scoreImport(previewRows: PreviewRow[], mapping: Mapping, totalRows: number) {
  if (!totalRows) return 0;
  const requiredMapped = ["date", "instrument", "direction"].filter((field) => mapping[field]).length / 3;
  const importable = previewRows.filter((row) => row.importable).length / totalRows;
  const pnlCoverage = previewRows.filter((row) => row.trade.pnl !== "" && row.trade.pnl !== null && row.trade.pnl !== undefined).length / totalRows;
  const duplicatePenalty = previewRows.filter((row) => row.status === "duplicate").length / totalRows;
  const score = requiredMapped * 35 + importable * 35 + pnlCoverage * 20 + Math.max(0, 1 - duplicatePenalty) * 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function statusBadge(status: RowStatus) {
  if (status === "ready") return "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]";
  if (status === "missing_pnl") return "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]";
  return "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]";
}

function statusLabel(status: RowStatus) {
  if (status === "ready") return "Ready";
  if (status === "duplicate") return "Duplicate";
  if (status === "missing_pnl") return "Missing P&L";
  return "Blocked";
}

function MiniStat({ label, value, tone = "gold" }: { label: string; value: string; tone?: "gold" | "green" | "red" | "blue" }) {
  const color = tone === "green" ? "text-[#00D084]" : tone === "red" ? "text-[#FF4565]" : tone === "blue" ? "text-[#8BB0FF]" : "text-[#F0B429]";
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{label}</p>
      <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

export default function ImportTradesPage() {
  const { user } = useAuth();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [presetId, setPresetId] = useState("generic");
  const [existingTrades, setExistingTrades] = useState<Trade[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    if (!user) return;
    getTrades(user.id).then(setExistingTrades).catch((error) => console.error("Import existing trades load error:", error));
  }, [user]);

  const existingSignatures = useMemo(() => new Set(existingTrades.map(signature)), [existingTrades]);
  const previewRows = useMemo(() => rows.map((row, index) => analyzeRow(row, mapping, existingSignatures, index)), [rows, mapping, existingSignatures]);
  const importableRows = previewRows.filter((row) => row.importable);
  const qualityScore = scoreImport(previewRows, mapping, rows.length);
  const readyCount = previewRows.filter((row) => row.status === "ready").length;
  const duplicateCount = previewRows.filter((row) => row.status === "duplicate").length;
  const blockedCount = previewRows.filter((row) => row.status === "missing_required").length;
  const missingPnlCount = previewRows.filter((row) => row.status === "missing_pnl").length;

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    const preset = presets.find((item) => item.id === presetId) || presets[0];
    setHeaders(parsed.headers);
    setRows(parsed.data);
    setMapping(applyPreset(parsed.headers, preset));
    setReport(null);
    setMessage(`Loaded ${parsed.data.length} rows from ${file.name}`);
  }, [presetId]);

  function changePreset(id: string) {
    const preset = presets.find((item) => item.id === id) || presets[0];
    setPresetId(id);
    if (headers.length) setMapping(applyPreset(headers, preset));
  }

  async function importTrades() {
    if (!user) return;
    setImporting(true);
    setMessage("");
    setReport(null);
    try {
      let added = 0;
      for (const row of importableRows) {
        await saveTrade(user.id, row.trade);
        added++;
      }
      const nextReport = {
        added,
        duplicates: duplicateCount,
        blocked: blockedCount,
        missingPnl: missingPnlCount,
      };
      setReport(nextReport);
      setMessage(`Import complete: ${added} added · ${duplicateCount} duplicates skipped · ${blockedCount} blocked.`);
      setExistingTrades(await getTrades(user.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Import Center" subtitle="Upload broker CSV files and map them into your ProfitPnL journal.">
      <div className="mx-auto max-w-6xl space-y-7 pb-24">
        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(76,130,251,0.10),transparent_30%)]" />
          <div className="relative p-6 lg:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]"><FileSpreadsheet size={12} /> Broker Import Wizard</div>
            <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">CSV Import Center</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Upload exports from brokers, prop dashboards, or spreadsheets. Select a broker preset, verify quality, then import clean journal data.</p>
          </div>
        </Card>

        {message && <div className="rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">{message}</div>}

        {report && (
          <Card className="border-[#00D084]/25 bg-[#00D084]/10 p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><CheckCircle2 className="text-[#00D084]" /> Import Report</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <MiniStat label="Added" value={String(report.added)} tone="green" />
              <MiniStat label="Duplicates" value={String(report.duplicates)} tone="gold" />
              <MiniStat label="Blocked" value={String(report.blocked)} tone="red" />
              <MiniStat label="Missing P&L" value={String(report.missingPnl)} tone="blue" />
            </div>
          </Card>
        )}

        <PageInsightPanel
          kind="import"
          initialTitle="AI import quality check"
          initialSummary="Generate an import cleanup read after loading a file to catch mapping issues before they affect analytics."
          context={{
            selectedPreset: presetId,
            headers,
            rowCount: rows.length,
            qualityScore,
            mappedFields: mapping,
            readyCount,
            duplicateCount,
            blockedCount,
            missingPnlCount,
            sampleRows: previewRows.slice(0, 5).map((row) => ({ status: row.status, issues: row.issues, trade: row.trade })),
          }}
        />

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Broker Preset</p>
              <h2 className="mt-1 text-lg font-black text-white">Choose import format</h2>
            </div>
            <button onClick={() => headers.length && setMapping(applyPreset(headers, presets.find((item) => item.id === presetId) || presets[0]))} className="inline-flex items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-4 py-2.5 text-xs font-black text-zinc-300 hover:text-[#F0B429]">
              <RefreshCw size={14} /> Re-apply Mapping
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {presets.map((preset) => (
              <button key={preset.id} onClick={() => changePreset(preset.id)} className={`rounded-2xl border p-4 text-left transition ${presetId === preset.id ? "border-[#F0B429]/40 bg-[#F0B429]/10" : "border-[#1E1E38] bg-[#080810] hover:border-[#F0B429]/30"}`}>
                <p className="font-black text-white">{preset.label}</p>
                <p className="mt-1 text-xs leading-5 text-[#8080A0]">{preset.description}</p>
              </button>
            ))}
          </div>
        </Card>

        <section className="grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Upload className="text-[#F0B429]" /> Upload CSV</h2>
            <label className="mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center transition hover:border-[#F0B429]/50">
              <Upload size={34} className="text-[#F0B429]" />
              <p className="mt-3 text-sm font-black text-white">Drop or select CSV file</p>
              <p className="mt-2 text-xs leading-6 text-[#8080A0]">Supports broker and prop exports from MT4, MT5, TradingView, Tradovate, NinjaTrader, TopstepX, cTrader, and generic spreadsheets.</p>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
            </label>
          </Card>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black text-white"><Wand2 className="text-[#F0B429]" /> Import Quality</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${qualityScore >= 80 ? "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]" : qualityScore >= 55 ? "border-[#F0B429]/30 bg-[#F0B429]/10 text-[#F0B429]" : "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]"}`}>{qualityScore}/100</span>
            </div>
            {headers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">Upload a CSV to score mapping quality.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStat label="Ready" value={String(readyCount)} tone="green" />
                <MiniStat label="Missing P&L" value={String(missingPnlCount)} tone="gold" />
                <MiniStat label="Duplicates" value={String(duplicateCount)} tone="blue" />
                <MiniStat label="Blocked" value={String(blockedCount)} tone="red" />
              </div>
            )}
          </Card>
        </section>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Wand2 className="text-[#F0B429]" /> Column Mapping</h2>
            <span className="text-xs font-bold text-[#8080A0]">{rows.length} rows</span>
          </div>
          {headers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">Upload a CSV to map columns.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {fields.map((field) => (
                <label key={field} className="block">
                  <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">{labels[field]}</span>
                  <select value={mapping[field] || ""} onChange={(event) => setMapping((m) => ({ ...m, [field]: event.target.value }))} className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#F0B429]">
                    <option value="">Not mapped</option>
                    {headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Import Preview</h2>
              <p className="mt-1 text-xs text-[#8080A0]">Preview shows row status before committing data to your journal.</p>
            </div>
            <button onClick={importTrades} disabled={importing || importableRows.length === 0} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-50">
              {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Import {importableRows.length} Rows
            </button>
          </div>
          {previewRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500"><AlertTriangle className="mx-auto mb-2 text-[#F0B429]" /> No preview rows yet. Upload a CSV to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-zinc-500"><tr><th className="py-3">Status</th><th>Date</th><th>Instrument</th><th>Dir</th><th>Size</th><th>Entry</th><th>SL</th><th>TP</th><th>R</th><th>P&L</th><th>Setup</th><th>Issues</th></tr></thead>
                <tbody>
                  {previewRows.slice(0, 50).map((row) => (
                    <tr key={`${row.signature}-${row.index}`} className="border-t border-[#1E1E38]">
                      <td className="py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider ${statusBadge(row.status)}`}>{statusLabel(row.status)}</span></td>
                      <td className="text-zinc-300">{row.trade.date}</td><td className="font-bold text-white">{row.trade.instrument}</td><td className="text-[#F0B429]">{row.trade.direction}</td><td>{row.trade.positionSize || "—"}</td><td>{row.trade.entry}</td><td>{row.trade.sl}</td><td>{row.trade.tp}</td><td>{row.trade.result}</td><td>{row.trade.pnl}</td><td>{row.trade.setup}</td><td className="text-xs text-[#8080A0]">{row.issues.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
