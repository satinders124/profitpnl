"use client";

import { useCallback, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { PageInsightPanel } from "@/components/ai/PageInsightPanel";
import { useAuth } from "@/components/providers/AuthProvider";
import { getTrades, saveTrade } from "@/lib/db";
import { Trade } from "@/types/trade";
import { CheckCircle2, FileSpreadsheet, Loader2, Upload, Wand2, AlertTriangle } from "lucide-react";

type CsvRow = Record<string, string>;
type Mapping = Record<string, string>;

const fields = [
  "date",
  "time",
  "instrument",
  "direction",
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

const labels: Record<(typeof fields)[number], string> = {
  date: "Date",
  time: "Time",
  instrument: "Instrument",
  direction: "Direction",
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

function guessMapping(headers: string[]) {
  const mapping: Mapping = {};
  const normalized = headers.map((header) => ({ header, key: normalizeHeader(header) }));
  const candidates: Record<string, string[]> = {
    date: ["date", "opentime", "closetime", "entrytime", "timeopened"],
    time: ["time", "openhour", "entryhour"],
    instrument: ["symbol", "instrument", "ticker", "market", "pair"],
    direction: ["side", "direction", "type", "buysell", "action"],
    entry: ["entry", "entryprice", "openprice", "priceopen"],
    sl: ["sl", "stoploss", "stop", "stopprice"],
    tp: ["tp", "takeprofit", "target", "targetprice"],
    result: ["r", "rmultiple", "result", "rresult"],
    pnl: ["pnl", "profit", "netpnl", "pl", "profitloss"],
    setup: ["setup", "strategy", "playbook", "model"],
    session: ["session", "marketsession"],
    emotion: ["emotion", "mood", "psychology"],
    notes: ["notes", "comment", "comments", "description"],
  };

  for (const field of fields) {
    const match = normalized.find(({ key }) => candidates[field].some((candidate) => key.includes(candidate)));
    if (match) mapping[field] = match.header;
  }
  return mapping;
}

function toIsoDate(value: string) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function cleanDirection(value: string) {
  const v = value.trim().toUpperCase();
  if (v.includes("BUY") || v.includes("LONG")) return "LONG";
  if (v.includes("SELL") || v.includes("SHORT")) return "SHORT";
  return v;
}

function buildTrade(row: CsvRow, mapping: Mapping): Partial<Trade> {
  const get = (field: string) => (mapping[field] ? row[mapping[field]] || "" : "");
  return {
    date: toIsoDate(get("date")),
    time: get("time"),
    instrument: get("instrument"),
    direction: cleanDirection(get("direction")),
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

export default function ImportTradesPage() {
  const { user } = useAuth();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");

  const preview = useMemo(() => rows.map((row) => buildTrade(row, mapping)).filter((trade) => trade.date && trade.instrument), [rows, mapping]);

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    setHeaders(parsed.headers);
    setRows(parsed.data);
    setMapping(guessMapping(parsed.headers));
    setMessage(`Loaded ${parsed.data.length} rows from ${file.name}`);
  }, []);

  async function importTrades() {
    if (!user) return;
    setImporting(true);
    setMessage("");
    try {
      const existing = await getTrades(user.id);
      const existingSignatures = new Set(existing.map(signature));
      let created = 0;
      let skipped = 0;
      for (const trade of preview) {
        if (existingSignatures.has(signature(trade))) {
          skipped++;
          continue;
        }
        await saveTrade(user.id, trade);
        created++;
      }
      setMessage(`Import complete: ${created} trades added, ${skipped} duplicates skipped.`);
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
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">Upload exports from brokers, prop dashboards, or spreadsheets. Map columns once, preview trades, then import clean journal data.</p>
          </div>
        </Card>

        {message && <div className="rounded-2xl border border-[#F0B429]/25 bg-[#F0B429]/10 px-4 py-3 text-sm font-bold text-[#F0B429]">{message}</div>}

        <PageInsightPanel
          kind="import"
          initialTitle="Claude import quality check"
          initialSummary="Generate an import cleanup read after loading a file to catch mapping issues before they affect analytics."
          context={{
            headers,
            rowCount: rows.length,
            mappedFields: mapping,
            validPreviewRows: preview.length,
            sampleRows: preview.slice(0, 5),
          }}
        />

        <section className="grid gap-7 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><Upload className="text-[#F0B429]" /> Upload CSV</h2>
            <label className="mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center transition hover:border-[#F0B429]/50">
              <Upload size={34} className="text-[#F0B429]" />
              <p className="mt-3 text-sm font-black text-white">Drop or select CSV file</p>
              <p className="mt-2 text-xs leading-6 text-[#8080A0]">Supports common columns like Date, Symbol, Side, Entry, SL, TP, P&L, R, Strategy, Emotion.</p>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])} />
            </label>
          </Card>

          <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black text-white"><Wand2 className="text-[#F0B429]" /> Column Mapping</h2>
              <span className="text-xs font-bold text-[#8080A0]">{rows.length} rows</span>
            </div>
            {headers.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500">Upload a CSV to map columns.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Import Preview</h2>
              <p className="mt-1 text-xs text-[#8080A0]">Showing first 20 valid rows before importing.</p>
            </div>
            <button onClick={importTrades} disabled={importing || preview.length === 0} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-50">
              {importing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Import {preview.length} Trades
            </button>
          </div>
          {preview.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2A2A3C] bg-[#080810] p-8 text-center text-sm text-zinc-500"><AlertTriangle className="mx-auto mb-2 text-[#F0B429]" /> No valid preview rows yet. Date and instrument are required.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-widest text-zinc-500"><tr><th className="py-3">Date</th><th>Instrument</th><th>Dir</th><th>Entry</th><th>SL</th><th>TP</th><th>R</th><th>P&L</th><th>Setup</th></tr></thead>
                <tbody>
                  {preview.slice(0, 20).map((trade, index) => (
                    <tr key={`${trade.date}-${trade.instrument}-${index}`} className="border-t border-[#1E1E38]">
                      <td className="py-3 text-zinc-300">{trade.date}</td><td className="font-bold text-white">{trade.instrument}</td><td className="text-[#F0B429]">{trade.direction}</td><td>{trade.entry}</td><td>{trade.sl}</td><td>{trade.tp}</td><td>{trade.result}</td><td>{trade.pnl}</td><td>{trade.setup}</td>
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
