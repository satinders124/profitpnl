export type ShiftReportLike = {
  clockIn?: string | null;
  clockOut?: string | null;
  sleepQuality?: number | null;
  stressLevel?: number | null;
  disciplineLevel?: number | null;
  preNotes?: string | null;
  postDiscipline?: number | null;
  emotionsFelt?: string | null;
  lessonsLearned?: string | null;
  behavioralSummary?: string | null;
  targetProfit?: number | null;
  maxDrawdownLimit?: number | null;
  sessionDurationMinutes?: number | null;
};

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return fallback;
  return trimmed;
}

function asNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatShiftMoney(value: number | null | undefined) {
  const amount = Number(value || 0);
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return amount < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function getShiftDurationMinutes(shift: ShiftReportLike) {
  const savedDuration = asNumber(shift.sessionDurationMinutes);
  if (savedDuration && savedDuration > 0) return Math.round(savedDuration);

  if (shift.clockIn && shift.clockOut) {
    const durationMs = new Date(shift.clockOut).getTime() - new Date(shift.clockIn).getTime();
    if (Number.isFinite(durationMs) && durationMs > 0) {
      return Math.max(1, Math.round(durationMs / 60000));
    }
  }

  return null;
}

export function formatShiftDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return "unknown duration";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export function isBrokenShiftSummary(summary: string | null | undefined) {
  const text = summary?.trim().toLowerCase() || "";
  if (!text) return true;

  return [
    "missing or invalid authorization header",
    "invalid or expired session",
    "authorization header",
    "anthropic_api_key",
    "api not configured",
    "configure anthropic",
    "summary could not be generated",
    "could not be generated due to a server error",
    "server error",
    "ai risk-guard — session logged successfully",
    "ai risk-guard - session logged successfully",
    "shift ended successfully",
  ].some((needle) => text.includes(needle));
}

export function buildReadableShiftReport(shift: ShiftReportLike) {
  const duration = formatShiftDuration(getShiftDurationMinutes(shift));
  const sleep = asNumber(shift.sleepQuality);
  const stress = asNumber(shift.stressLevel);
  const preDiscipline = asNumber(shift.disciplineLevel);
  const postDiscipline = asNumber(shift.postDiscipline);
  const targetProfit = asNumber(shift.targetProfit);
  const maxDrawdownLimit = asNumber(shift.maxDrawdownLimit);
  const preNotes = cleanText(shift.preNotes, "no detailed pre-shift focus notes were recorded");
  const emotions = cleanText(shift.emotionsFelt, "none recorded");
  const lesson = cleanText(shift.lessonsLearned, "no specific lesson was recorded");

  const planParts = [
    targetProfit !== null ? `a ${formatShiftMoney(targetProfit)} profit target` : null,
    maxDrawdownLimit !== null ? `a ${formatShiftMoney(maxDrawdownLimit)} daily loss limit` : null,
  ].filter(Boolean);
  const planText = planParts.length ? ` against ${planParts.join(" and ")}` : "";

  const startingState = [
    sleep !== null ? `sleep quality ${sleep}/10` : null,
    stress !== null ? `initial stress ${stress}/10` : null,
    preDiscipline !== null ? `pre-session discipline ${preDiscipline}/10` : null,
  ].filter(Boolean).join(", ");

  const disciplineTone = postDiscipline === null
    ? "the post-session discipline rating was not recorded, so the next session needs a clearer check-out review"
    : postDiscipline <= 3
      ? "this is a clear risk warning: the next session should be smaller, slower, and limited to only the cleanest A+ setup"
      : postDiscipline <= 5
        ? "discipline was under pressure, so the next session needs reduced decision-load and stricter trade selection"
        : postDiscipline <= 7
          ? "control was acceptable, but execution still needs tighter rule confirmation before entry"
          : "you maintained strong emotional control and should focus on repeating the same process rather than increasing risk";

  return `Your AI Risk-Guard session ran for ${duration}${planText}. ${startingState ? `You started with ${startingState}, and ` : ""}you clocked out with ${postDiscipline ?? "unrated"}/10 discipline; ${disciplineTone}. Your pre-shift focus was “${preNotes}”, while your recorded emotions were “${emotions}”. The key lesson from this shift was “${lesson}”. Next session, protect the daily loss limit first, take only verified playbook setups, and if the same emotional trigger appears again, pause before adding another trade.`;
}

export function getShiftReportSummary(shift: ShiftReportLike) {
  const existing = shift.behavioralSummary?.trim() || "";
  return isBrokenShiftSummary(existing) ? buildReadableShiftReport(shift) : existing;
}
