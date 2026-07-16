import { createClient } from "@/lib/supabase-client";

export interface TraderShift {
  id: string;
  userId: string;
  clockIn: string;
  clockOut: string | null;
  sleepQuality: number;
  stressLevel: number;
  disciplineLevel: number;
  preNotes: string;
  postDiscipline: number | null;
  emotionsFelt: string;
  lessonsLearned: string;
  behavioralSummary: string | null;
  createdAt: string;
  targetProfit: number | null;
  maxDrawdownLimit: number | null;
  sessionDurationMinutes: number | null;
}

export async function getActiveShift(uid: string): Promise<TraderShift | null> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("trader_shifts")
      .select("*")
      .eq("user_id", uid)
      .is("clock_out", null)
      .maybeSingle();

    if (error) {
      if (error.code === "P0001" || error.message?.includes("does not exist")) {
        console.warn("Table trader_shifts does not exist yet. Graceful bypass.");
        return null;
      }
      throw error;
    }
    if (!data) return null;
    return mapRowToShift(data);
  } catch (e) {
    console.error("getActiveShift error:", e);
    return null;
  }
}

export async function getRecentShifts(uid: string, limit = 10): Promise<TraderShift[]> {
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from("trader_shifts")
      .select("*")
      .eq("user_id", uid)
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === "P0001" || error.message?.includes("does not exist")) {
        return [];
      }
      throw error;
    }
    return (data || []).map(mapRowToShift);
  } catch (e) {
    console.error("getRecentShifts error:", e);
    return [];
  }
}

export async function clockIn(uid: string, data: {
  sleepQuality: number;
  stressLevel: number;
  disciplineLevel: number;
  preNotes: string;
  targetProfit: number;
  maxDrawdownLimit: number;
}): Promise<string | null> {
  const supabase = createClient();
  try {
    const { data: inserted, error } = await supabase
      .from("trader_shifts")
      .insert({
        user_id: uid,
        sleep_quality: data.sleepQuality,
        stress_level: data.stressLevel,
        discipline_level: data.disciplineLevel,
        pre_notes: data.preNotes,
        target_profit: data.targetProfit,
        max_drawdown_limit: data.maxDrawdownLimit,
        clock_in: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return inserted.id;
  } catch (e) {
    console.error("clockIn error:", e);
    alert("Database Connection Info: Please run the latest migration SQL file in your Supabase SQL editor to enable these fields first!");
    return null;
  }
}

export async function clockOut(uid: string, shiftId: string, data: {
  postDiscipline: number;
  emotionsFelt: string;
  lessonsLearned: string;
  behavioralSummary: string;
  sessionDurationMinutes?: number;
}): Promise<void> {
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("trader_shifts")
      .update({
        clock_out: new Date().toISOString(),
        post_discipline: data.postDiscipline,
        emotions_felt: data.emotionsFelt,
        lessons_learned: data.lessonsLearned,
        behavioral_summary: data.behavioralSummary,
        session_duration_minutes: data.sessionDurationMinutes ?? null,
      })
      .eq("id", shiftId)
      .eq("user_id", uid);

    if (error) throw error;
  } catch (e) {
    console.error("clockOut error:", e);
  }
}

function mapRowToShift(row: any): TraderShift {
  return {
    id: row.id,
    userId: row.user_id,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    sleepQuality: row.sleep_quality,
    stressLevel: row.stress_level,
    disciplineLevel: row.discipline_level,
    preNotes: row.pre_notes || "",
    postDiscipline: row.post_discipline,
    emotionsFelt: row.emotions_felt || "",
    lessonsLearned: row.lessons_learned || "",
    behavioralSummary: row.behavioral_summary,
    createdAt: row.created_at,
    targetProfit: row.target_profit ? Number(row.target_profit) : null,
    maxDrawdownLimit: row.max_drawdown_limit ? Number(row.max_drawdown_limit) : null,
    sessionDurationMinutes: row.session_duration_minutes != null ? Number(row.session_duration_minutes) : null,
  };
}
