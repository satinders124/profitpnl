import type { SupabaseClient } from "@supabase/supabase-js";

export type EmailEventStatus = "sent" | "skipped" | "failed";

export type EmailEvent = {
  id: string;
  userId: string | null;
  recipientEmail: string | null;
  eventType: string;
  status: EmailEventStatus;
  reason: string | null;
  provider: string;
  providerMessage: string | null;
  source: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type EmailEventRow = {
  id: string;
  user_id: string | null;
  recipient_email: string | null;
  event_type: string;
  status: EmailEventStatus;
  reason: string | null;
  provider: string;
  provider_message: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type LogEmailEventInput = {
  userId?: string | null;
  recipientEmail?: string | null;
  eventType: string;
  status: EmailEventStatus;
  reason?: string | null;
  provider?: string;
  providerMessage?: string | null;
  source?: string;
  metadata?: Record<string, unknown>;
};

function isMissingEmailEventsTable(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("email_events") && (message.includes("does not exist") || message.includes("schema cache"))
  );
}

export function mapEmailEvent(row: EmailEventRow): EmailEvent {
  return {
    id: row.id,
    userId: row.user_id,
    recipientEmail: row.recipient_email,
    eventType: row.event_type,
    status: row.status,
    reason: row.reason,
    provider: row.provider,
    providerMessage: row.provider_message,
    source: row.source,
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export async function logEmailEvent(supabase: SupabaseClient, input: LogEmailEventInput) {
  const { error } = await supabase.from("email_events").insert({
    user_id: input.userId || null,
    recipient_email: input.recipientEmail || null,
    event_type: input.eventType,
    status: input.status,
    reason: input.reason || null,
    provider: input.provider || "sendgrid",
    provider_message: input.providerMessage || null,
    source: input.source || "system",
    metadata: input.metadata || {},
  });

  if (error) {
    if (isMissingEmailEventsTable(error)) {
      console.warn("email_events table missing. Run the email events migration to enable delivery audit logs.");
      return { ok: false, missingTable: true, error: error.message };
    }
    console.error("Email event log error:", error);
    return { ok: false, missingTable: false, error: error.message };
  }

  return { ok: true, missingTable: false, error: null };
}

export async function getRecentEmailEvents(supabase: SupabaseClient, limit = 50) {
  const { data, error } = await supabase
    .from("email_events")
    .select("id, user_id, recipient_email, event_type, status, reason, provider, provider_message, source, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingEmailEventsTable(error)) {
      return { events: [] as EmailEvent[], missingTable: true, error: null };
    }
    throw error;
  }

  return { events: ((data || []) as EmailEventRow[]).map(mapEmailEvent), missingTable: false, error: null };
}
