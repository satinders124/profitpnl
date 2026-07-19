"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase-client";

type EmailHealth = {
  ok: boolean;
  checkedAt: string;
  totalProfiles: number;
  appUrl: string;
  env: {
    sendgridApiKeyConfigured: boolean;
    sendgridApiKeyPreview: string | null;
    sendgridFromEmailConfigured: boolean;
    sendgridFromEmail: string | null;
    cronSecretConfigured: boolean;
    cronSecretPreview: string | null;
    appUrlConfigured: boolean;
  };
  activeCron: {
    path: string;
    schedule: string;
    localMeaning: string;
  };
  testActions: string[];
};

type TestAction = "daily-plan" | "weekly-report";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${ok ? "border-[#00D084]/30 bg-[#00D084]/10 text-[#00D084]" : "border-[#FF4565]/30 bg-[#FF4565]/10 text-[#FF4565]"}`}>
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {label}
    </span>
  );
}

function EnvRow({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-white">{label}</p>
        <StatusPill ok={ok} label={ok ? "Ready" : "Missing"} />
      </div>
      <p className="font-mono text-xs text-[#8080A0]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#5A5A80]">{hint}</p>
    </div>
  );
}

export default function AdminEmailOpsPage() {
  const [health, setHealth] = useState<EmailHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<TestAction | "">("");
  const [testEmail, setTestEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await createClient().auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const adminForbiddenMessage = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession();
    const email = session?.user?.email || "this login";
    return `Forbidden: ${email} is not configured as an admin. Add this email to ADMIN_EMAILS in Vercel, then redeploy.`;
  }, []);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/email-ops", { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? await adminForbiddenMessage() : json.error || "Could not load email health.");
      setHealth(json as EmailHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load email health.");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, adminForbiddenMessage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHealth();
  }, [loadHealth]);

  async function sendTest(action: TestAction) {
    if (sending) return;
    const cleanEmail = testEmail.trim();
    if (!cleanEmail) {
      setError("Enter a testing email first.");
      return;
    }

    setSending(action);
    setNotice("");
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/email-ops", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action, testEmail: cleanEmail }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 403 ? await adminForbiddenMessage() : json.error || "Could not send test email.");
      setNotice(`${action === "daily-plan" ? "Daily Plan" : "Weekly Report"} test email sent to ${json.sentTo || cleanEmail}. Check inbox and spam.`);
      await loadHealth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send test email.");
    } finally {
      setSending("");
    }
  }

  const env = health?.env;
  const emailReady = Boolean(env?.sendgridApiKeyConfigured && env.sendgridFromEmailConfigured);
  const cronReady = Boolean(env?.cronSecretConfigured);

  return (
    <AppShell title="Email Ops Center" subtitle="Verify reminder infrastructure, SendGrid config, and test Daily/Weekly emails.">
      <div className="mx-auto max-w-6xl space-y-7 pb-24">
        {error ? <div className="rounded-2xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-sm font-bold text-[#FF4565]">{error}</div> : null}
        {notice ? <div className="rounded-2xl border border-[#00D084]/30 bg-[#00D084]/10 px-4 py-3 text-sm font-bold text-[#00D084]">{notice}</div> : null}

        <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#07070D] p-0 shadow-2xl shadow-black/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.20),transparent_34%),radial-gradient(circle_at_88%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#F0B429]">
                <Mail size={12} /> Sprint 1 Reliability
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tighter text-white sm:text-5xl">Email Ops Center</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                Test Daily Plan nudges and Weekly ProfitPnL Reports before relying on cron. This page tells us whether email infrastructure is ready or misconfigured.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill ok={emailReady} label={emailReady ? "SendGrid Ready" : "SendGrid Missing"} />
                <StatusPill ok={cronReady} label={cronReady ? "Cron Secret Ready" : "Cron Secret Missing"} />
                <StatusPill ok={Boolean(env?.appUrlConfigured)} label={env?.appUrlConfigured ? "App URL Ready" : "Default URL"} />
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#1E1E38] bg-[#0B0B16]/90 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#5A5A80]">Active Cron</p>
              {loading ? (
                <p className="mt-4 flex items-center text-sm text-[#8080A0]"><Loader2 className="mr-2 animate-spin" size={16} /> Checking…</p>
              ) : (
                <>
                  <p className="mt-2 font-mono text-lg font-black text-white">{health?.activeCron.path || "/api/cron/daily"}</p>
                  <p className="mt-1 text-xs text-[#8080A0]">{health?.activeCron.schedule || "0 22 * * *"} · {health?.activeCron.localMeaning || "08:00 Australia/Brisbane"}</p>
                  <p className="mt-4 text-xs leading-5 text-[#5A5A80]">Profiles checked by cron: {health?.totalProfiles ?? 0}</p>
                  <p className="mt-1 font-mono text-[10px] text-[#5A5A80]">Last health check: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : "—"}</p>
                </>
              )}
            </div>
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Configuration Health</p>
              <h2 className="mt-1 text-lg font-black text-white">Production email readiness</h2>
            </div>
            <button onClick={loadHealth} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-4 py-2.5 text-xs font-black text-zinc-300 hover:text-[#F0B429] disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={15} /> : <RefreshCw size={15} />} Refresh
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <EnvRow label="SENDGRID_API_KEY" value={env?.sendgridApiKeyPreview || "missing"} ok={Boolean(env?.sendgridApiKeyConfigured)} hint="Required for every reminder and report email." />
            <EnvRow label="SENDGRID_FROM_EMAIL" value={env?.sendgridFromEmail || "missing"} ok={Boolean(env?.sendgridFromEmailConfigured)} hint="Must be a verified sender/domain in SendGrid." />
            <EnvRow label="CRON_SECRET" value={env?.cronSecretPreview || "missing"} ok={Boolean(env?.cronSecretConfigured)} hint="Required for Vercel cron and manual curl tests." />
            <EnvRow label="APP URL" value={health?.appUrl || "https://profitpnl.com"} ok={Boolean(env?.appUrlConfigured)} hint="Used inside buttons and report links." />
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Test Before Trusting Cron</p>
              <h2 className="mt-1 text-lg font-black text-white">Send test reminder emails</h2>
              <p className="mt-1 text-xs text-[#8080A0]">Use your own inbox first. After the test lands, cron can be trusted to use the same templates.</p>
            </div>
            <a href="/settings" className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#1E1E38] bg-[#111124] px-4 py-2.5 text-xs font-black text-zinc-300 hover:text-white">
              Notification Settings <ExternalLink size={14} />
            </a>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5A5A80]" size={16} />
              <input
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="testing@email.com"
                inputMode="email"
                className="w-full rounded-2xl border border-[#1E1E38] bg-[#080810] py-3 pl-11 pr-4 text-sm font-semibold text-white outline-none transition focus:border-[#F0B429]"
              />
            </div>
            <button onClick={() => sendTest("daily-plan")} disabled={Boolean(sending)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#F0B429]/35 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429] transition hover:bg-[#F0B429]/15 disabled:opacity-60">
              {sending === "daily-plan" ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Send Daily Test
            </button>
            <button onClick={() => sendTest("weekly-report")} disabled={Boolean(sending)} className="gold-gradient inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-60">
              {sending === "weekly-report" ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              Send Weekly Test
            </button>
          </div>
        </Card>

        <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-5 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">Manual Cron Test</p>
              <h2 className="mt-1 text-lg font-black text-white">Windows CMD curl</h2>
              <p className="mt-1 text-xs text-[#8080A0]">Use this after deploy to verify the active cron endpoint returns emailConfigured and sent counts.</p>
            </div>
            <ShieldCheck className="text-[#F0B429]" />
          </div>
          <div className="mt-4 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
            <p className="font-mono text-xs leading-6 text-zinc-300">curl -i &quot;{health?.appUrl || "https://www.profitpnl.com"}/api/cron/daily&quot; -H &quot;Authorization: Bearer YOUR_CRON_SECRET&quot;</p>
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-[#8080A0]"><Clock3 size={14} /> Vercel Hobby runs this once per day. External schedulers can call it more often if needed.</p>
        </Card>
      </div>
    </AppShell>
  );
}
