export type ParsedTrade = {
  date?: string;
  instrument?: string;
  direction?: string;
  setup?: string;
  session?: string;
  emotion?: string;
  result: number;
  pnl?: number;
};

function splitCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      out.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current.trim());
  return out;
}

function numberFrom(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value === undefined || value === "") continue;
    const parsed = Number(String(value).replace(/[$,%]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function textFrom(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value) return value;
  }
  return "";
}

export function parseTradesCsv(input: string): ParsedTrade[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  return lines.slice(1).flatMap((line) => {
    const values = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    const result = numberFrom(row, ["result", "r", "r_multiple", "r-multiple", "r multiple", "rr_result", "net r"]);
    const pnl = numberFrom(row, ["pnl", "p&l", "profit", "profit_loss", "net pnl", "net_pnl"]);
    const finalResult = result ?? (pnl !== null ? (pnl > 0 ? 1 : pnl < 0 ? -1 : 0) : null);
    if (finalResult === null) return [];

    return [{
      date: textFrom(row, ["date", "closed_date", "close date"]),
      instrument: textFrom(row, ["instrument", "symbol", "market", "ticker"]),
      direction: textFrom(row, ["direction", "side", "type"]),
      setup: textFrom(row, ["setup", "strategy", "playbook"]),
      session: textFrom(row, ["session", "market_session"]),
      emotion: textFrom(row, ["emotion", "mood", "psychology"]),
      result: finalResult,
      pnl: pnl ?? undefined,
    }];
  });
}

export function groupStats(trades: ParsedTrade[], key: keyof ParsedTrade) {
  const groups = new Map<string, ParsedTrade[]>();
  for (const trade of trades) {
    const name = String(trade[key] || "Unknown").trim() || "Unknown";
    groups.set(name, [...(groups.get(name) || []), trade]);
  }

  return Array.from(groups.entries())
    .map(([name, rows]) => {
      const totalR = rows.reduce((sum, trade) => sum + trade.result, 0);
      const wins = rows.filter((trade) => trade.result > 0).length;
      const losses = rows.filter((trade) => trade.result < 0).length;
      return {
        name,
        trades: rows.length,
        totalR,
        averageR: totalR / rows.length,
        winRate: rows.length ? wins / rows.length : 0,
        wins,
        losses,
      };
    })
    .sort((a, b) => b.totalR - a.totalR);
}

export function analyzeTrades(trades: ParsedTrade[]) {
  const closed = trades.filter((trade) => Number.isFinite(trade.result));
  const wins = closed.filter((trade) => trade.result > 0);
  const losses = closed.filter((trade) => trade.result < 0);
  const totalR = closed.reduce((sum, trade) => sum + trade.result, 0);
  const grossWin = wins.reduce((sum, trade) => sum + trade.result, 0);
  const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.result, 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = closed.length ? totalR / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const trade of closed) {
    cumulative += trade.result;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
  }

  const bySetup = groupStats(closed, "setup");
  const bySession = groupStats(closed, "session");
  const byEmotion = groupStats(closed, "emotion");
  const bestSetup = bySetup[0];
  const worstSetup = bySetup.slice().sort((a, b) => a.totalR - b.totalR)[0];
  const bestSession = bySession[0];
  const worstSession = bySession.slice().sort((a, b) => a.totalR - b.totalR)[0];
  const worstEmotion = byEmotion.slice().sort((a, b) => a.averageR - b.averageR)[0];

  const edgeScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        50 + expectancy * 18 + (profitFactor - 1) * 12 - maxDrawdown * 1.5 + Math.min(10, closed.length / 10)
      )
    )
  );

  const leaks: string[] = [];
  if (profitFactor < 1.2) leaks.push("Profit factor is too close to break-even; winners are not paying enough for losers.");
  if (expectancy <= 0) leaks.push("Expectancy is negative or flat; your average trade is not producing positive R.");
  if (maxDrawdown > Math.max(3, Math.abs(totalR) * 0.7)) leaks.push("Drawdown is large relative to total R; risk or setup selection may be inconsistent.");
  if (worstSetup && worstSetup.trades >= 2 && worstSetup.totalR < 0) leaks.push(`${worstSetup.name} is your weakest setup at ${worstSetup.totalR.toFixed(2)}R.`);
  if (worstSession && worstSession.trades >= 2 && worstSession.totalR < 0) leaks.push(`${worstSession.name} session is currently dragging performance.`);
  if (worstEmotion && worstEmotion.name !== "Unknown" && worstEmotion.averageR < 0) leaks.push(`${worstEmotion.name} emotional state has negative average R.`);
  if (!leaks.length) leaks.push("No obvious major leak found in this sample. Increase sample size and keep tagging setups/emotions.");

  const strengths: string[] = [];
  if (bestSetup && bestSetup.totalR > 0) strengths.push(`${bestSetup.name} is your strongest setup at +${bestSetup.totalR.toFixed(2)}R.`);
  if (bestSession && bestSession.totalR > 0) strengths.push(`${bestSession.name} is your best session at +${bestSession.totalR.toFixed(2)}R.`);
  if (avgWin > avgLoss) strengths.push("Your average winner is larger than your average loser.");
  if (profitFactor >= 1.5) strengths.push("Profit factor shows a healthy edge in this sample.");
  if (!strengths.length) strengths.push("Your biggest strength is that you now have data to review instead of guessing.");

  return {
    count: closed.length,
    wins: wins.length,
    losses: losses.length,
    winRate: closed.length ? wins.length / closed.length : 0,
    totalR,
    expectancy,
    profitFactor,
    avgWin,
    avgLoss,
    maxDrawdown,
    edgeScore,
    bestSetup,
    worstSetup,
    bestSession,
    worstSession,
    worstEmotion,
    leaks: leaks.slice(0, 5),
    strengths: strengths.slice(0, 5),
    setupRows: bySetup.slice(0, 8),
    sessionRows: bySession.slice(0, 8),
  };
}

export function normalizeBrokerCsv(input: string) {
  const trades = parseTradesCsv(input);
  const headers = ["date", "time", "instrument", "direction", "setup", "session", "timeframe", "emotion", "entry", "sl", "tp", "rr", "result", "pnl", "account", "position_size", "notes", "tags", "reviewed", "execution_rating", "mistake", "lesson"];
  const rows = trades.map((trade) => [
    trade.date || "",
    "",
    trade.instrument || "",
    trade.direction || "",
    trade.setup || "Imported",
    trade.session || "",
    "",
    trade.emotion || "",
    "",
    "",
    "",
    "",
    String(trade.result),
    trade.pnl ?? "",
    "Imported Account",
    "",
    "Converted with ProfitPnL CSV converter",
    "imported",
    "false",
    "",
    "",
    "",
  ]);

  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}
