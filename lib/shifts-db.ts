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
}

export async function getActiveShift(uid: string): Promise<TraderShift | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trader_shifts")
    .select("*")
    .eq("user_id", uid)
    .is("clock_out", null)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return mapRowToShift(data);
}

export async function getRecentShifts(uid: string, limit = 10): Promise<TraderShift[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("trader_shifts")
    .select("*")
    .eq("user_id", uid)
    .not("clock_out", "is", null)
    .order("clock_in", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapRowToShift);
}

export async function clockIn(uid: string, data: {
  sleepQuality: number;
  stressLevel: number;
  disciplineLevel: number;
  preNotes: string;
}): Promise<string> {
  const supabase = createClient();
  const { data: inserted, error } = await supabase
    .from("trader_shifts")
    .insert({
      user_id: uid,
      sleep_quality: data.sleepQuality,
      stress_level: data.stressLevel,
      discipline_level: data.disciplineLevel,
      pre_notes: data.preNotes,
      clock_in: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  return inserted.id;
}

export async function clockOut(uid: string, shiftId: string, data: {
  postDiscipline: number;
  emotionsFelt: string;
  lessonsLearned: string;
  behavioralSummary: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("trader_shifts")
    .update({
      clock_out: new Date().toISOString(),
      post_discipline: data.postDiscipline,
      emotions_felt: data.emotionsFelt,
      lessons_learned: data.lessonsLearned,
      behavioral_summary: data.behavioralSummary,
    })
    .eq("id", shiftId)
    .eq("user_id", uid);

  if (error) throw error;
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
  };
}
