import { createClient } from "@/lib/supabase-client";

function isMissingOnboardingColumn(error: { code?: string; message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() || "";
  return error?.code === "42703" || error?.code === "PGRST204" || message.includes("onboarding_completed");
}

async function countRows(table: "accounts" | "playbook" | "trades", uid: string) {
  const supabase = createClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);

  if (error) return 0;
  return count || 0;
}

export async function userNeedsOnboarding(uid: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", uid)
    .maybeSingle();

  if (!error && typeof data?.onboarding_completed === "boolean") {
    return !data.onboarding_completed;
  }

  if (error && !isMissingOnboardingColumn(error)) {
    // If the profile check failed for a transient reason, avoid trapping an
    // existing user in onboarding. The fallback counts below handle schema lag.
    console.warn("Onboarding status profile check failed:", error.message);
  }

  const [accounts, playbook, trades] = await Promise.all([
    countRows("accounts", uid),
    countRows("playbook", uid),
    countRows("trades", uid),
  ]);

  return accounts + playbook + trades === 0;
}
