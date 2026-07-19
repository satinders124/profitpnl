"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { createClient } from "@/lib/supabase-client";
import { getProfile, updateProfile } from "@/lib/db";
import {
  User,
  Bell,
  Mail,
  Globe,
  Lock,
  LogOut,
  Trash2,
  Save,
  Send,
  CheckCircle2,
  Crown,
  Settings as SettingsIcon,
  ShieldAlert,
  Target,
  Brain,
  Database,
  Key,
  Copy,
  Check,
  Volume2,
  VolumeX,
  AlertTriangle,
  Download,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  Monitor,
  Activity,
  Sparkles,
  Link2,
  Unlink,
  Tag,
  Plus,
  X,
  Briefcase,
  DollarSign,
  CreditCard,
  Calendar,
  Clock,
  Zap,
  ChevronRight,
  Receipt,
  Heart,
  Timer,
  ArrowUpRight,
  Shield,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
  AlertCircle,
  Loader2,
  Loader2 as LoaderIcon,
} from "lucide-react";

type SettingsTab = "preferences" | "notifications" | "brokers" | "tags" | "risk" | "account";

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-all ${enabled ? "bg-[#F0B429]" : "bg-[#242436]"}`}
    >
      <span
        className={`absolute top-[3px] h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-all ${enabled ? "right-[3px]" : "left-[3px]"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, plan, planSource, trialEndsAtMs, hasUsedTrial, logout, refreshPlan } =
    useAuth();
  const { playClick, playSuccess } = useSoundEffects();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);
  const [testingEmail, setTestingEmail] = useState<"daily-plan" | "weekly-report" | "">("");
  const [notificationTestNotice, setNotificationTestNotice] = useState("");
  const [notificationTestError, setNotificationTestError] = useState("");
  const [comingSoonBroker, setComingSoonBroker] = useState<string | null>(null);
  const [upgradeToast, setUpgradeToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "success") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUpgradeToast("🎉 Upgrade successful! You are now subscribed to ProfitPnL Pro.");
        refreshPlan();
        setTimeout(() => setUpgradeToast(null), 7000);
      }
    }
  }, [refreshPlan]);

  // Custom tag state
  const [newSetupTag, setNewSetupTag] = useState("");
  const [newMistakeTag, setNewMistakeTag] = useState("");
  const [newPsychologyTag, setNewPsychologyTag] = useState("");

  const [settings, setSettings] = useState({
    // Account & Profile
    displayName: "",
    bio: "Disciplined execution is my primary edge.",
    currency: "USD",
    timezone: "UTC",
    notifications: true,
    soundEffects: true,
    dailyPlanRemindersEnabled: true,
    dailyPlanReminderTime: "08:00",
    weeklyReviewRemindersEnabled: true,
    weeklyReviewReminderDay: "Fri",
    weeklyReviewReminderTime: "17:00",
    emailReportsEnabled: true,
    tradingviewUsername: "", // Tradingview custom username to authorize settings

    // Trading Preferences
    initialAccountSize: 50000,
    defaultRiskPercentage: 1.0,
    defaultCommission: 2.5,
    autoCalculateR: true,

    // Prop Firm & Risk Rules
    dailyLossLimit: 1000,
    maxDrawdownLimit: 3000,
    dailyProfitTarget: 1500,
    maxConsecutiveLosses: 3,
    enforceReview: true,

    // Broker Connections
    activeBroker: "",
    connectedBrokers: [] as string[],
    webhookUrl: "",
    apiKey: "",

    // Custom Tags & Categories
    setupTags: [
      "Breakout",
      "Reversal",
      "Opening Range Breakout (ORB)",
      "Liquidity Sweep",
      "Order Block",
      "News Momentum",
    ],
    mistakeTags: [
      "FOMO Entry",
      "Revenge Trade",
      "Chased Price",
      "Moved Stop Loss",
      "Exited Early",
      "Overleveraged",
    ],
    psychologyTags: [
      "Focused & Calm",
      "Good Sleep",
      "Poor Sleep",
      "Anxious",
      "Skipped Routine",
    ],
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const data = await getProfile(user.id);
        if (data) {
          setSettings((prev) => ({
            ...prev,
            displayName: data.display_name || "",
            bio: data.bio || prev.bio,
            currency: data.currency || "USD",
            timezone: data.timezone || "UTC",
            notifications: data.notifications ?? true,
            soundEffects: data.sound_effects ?? true,
            dailyPlanRemindersEnabled: data.daily_plan_reminders_enabled ?? true,
            dailyPlanReminderTime: data.daily_plan_reminder_time || "08:00",
            weeklyReviewRemindersEnabled: data.weekly_review_reminders_enabled ?? true,
            weeklyReviewReminderDay: data.weekly_review_reminder_day || "Fri",
            weeklyReviewReminderTime: data.weekly_review_reminder_time || "17:00",
            emailReportsEnabled: data.email_reports_enabled ?? true,
            tradingviewUsername: data.tradingview_username || "",
            initialAccountSize: Number(data.initial_account_size) || 50000,
            defaultRiskPercentage: Number(data.default_risk_percentage) || 1.0,
            defaultCommission: data.default_commission != null ? Number(data.default_commission) : 2.5,
            autoCalculateR: data.auto_calculate_r ?? true,
            dailyLossLimit: Number(data.daily_loss_limit) || 1000,
            maxDrawdownLimit: Number(data.max_drawdown_limit) || 3000,
            dailyProfitTarget: Number(data.daily_profit_target) || 1500,
            maxConsecutiveLosses: Number(data.max_consecutive_losses) || 3,
            enforceReview: data.enforce_review ?? true,
            activeBroker: data.active_broker || "",
            connectedBrokers: data.connected_brokers || [],
            webhookUrl: data.webhook_url || "",
            apiKey: data.api_key || prev.apiKey,
            setupTags: data.setup_tags || prev.setupTags,
            mistakeTags: data.mistake_tags || prev.mistakeTags,
            psychologyTags: data.psychology_tags || prev.psychologyTags,
          }));
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user.id, {
        display_name: settings.displayName,
        bio: settings.bio,
        currency: settings.currency,
        timezone: settings.timezone,
        notifications: settings.notifications,
        sound_effects: settings.soundEffects,
        daily_plan_reminders_enabled: settings.dailyPlanRemindersEnabled,
        daily_plan_reminder_time: settings.dailyPlanReminderTime,
        weekly_review_reminders_enabled: settings.weeklyReviewRemindersEnabled,
        weekly_review_reminder_day: settings.weeklyReviewReminderDay,
        weekly_review_reminder_time: settings.weeklyReviewReminderTime,
        email_reports_enabled: settings.emailReportsEnabled,
        tradingview_username: settings.tradingviewUsername,
        initial_account_size: settings.initialAccountSize,
        default_risk_percentage: settings.defaultRiskPercentage,
        default_commission: settings.defaultCommission,
        auto_calculate_r: settings.autoCalculateR,
        daily_loss_limit: settings.dailyLossLimit,
        max_drawdown_limit: settings.maxDrawdownLimit,
        daily_profit_target: settings.dailyProfitTarget,
        max_consecutive_losses: settings.maxConsecutiveLosses,
        enforce_review: settings.enforceReview,
        active_broker: settings.activeBroker,
        connected_brokers: settings.connectedBrokers,
        webhook_url: settings.webhookUrl,
        api_key: settings.apiKey,
        setup_tags: settings.setupTags,
        mistake_tags: settings.mistakeTags,
        psychology_tags: settings.psychologyTags,
      });
      setSaved(true);
      playSuccess();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  async function sendNotificationTestEmail(type: "daily-plan" | "weekly-report") {
    if (testingEmail) return;
    setTestingEmail(type);
    setNotificationTestNotice("");
    setNotificationTestError("");
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ type }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not send test email.");
      setNotificationTestNotice(`${type === "daily-plan" ? "Daily Plan" : "Weekly Report"} test email sent to ${json.sentTo || user?.email || "your inbox"}. Check inbox and spam.`);
      setTimeout(() => setNotificationTestNotice(""), 7000);
    } catch (error) {
      setNotificationTestError(error instanceof Error ? error.message : "Could not send test email.");
      setTimeout(() => setNotificationTestError(""), 7000);
    } finally {
      setTestingEmail("");
    }
  }

  function handleRegenerateKey() {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    const rand = Array.from(array, (byte) => byte.toString(36)).join("");
    const newKey = `ppnl_live_${rand.slice(0, 16)}`;
    setSettings((prev) => ({ ...prev, apiKey: newKey }));
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(settings.apiKey || "ppnl_live_8f932k019283mn4b_x9q");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleAddTag(
    type: "setup" | "mistake" | "psychology",
    value: string
  ) {
    if (!value.trim()) return;
    const trimmed = value.trim();
    if (type === "setup") {
      if (!settings.setupTags.includes(trimmed)) {
        setSettings((prev) => ({
          ...prev,
          setupTags: [...prev.setupTags, trimmed],
        }));
      }
      setNewSetupTag("");
    } else if (type === "mistake") {
      if (!settings.mistakeTags.includes(trimmed)) {
        setSettings((prev) => ({
          ...prev,
          mistakeTags: [...prev.mistakeTags, trimmed],
        }));
      }
      setNewMistakeTag("");
    } else {
      if (!settings.psychologyTags.includes(trimmed)) {
        setSettings((prev) => ({
          ...prev,
          psychologyTags: [...prev.psychologyTags, trimmed],
        }));
      }
      setNewPsychologyTag("");
    }
  }

  function handleRemoveTag(
    type: "setup" | "mistake" | "psychology",
    tagToRemove: string
  ) {
    if (type === "setup") {
      setSettings((prev) => ({
        ...prev,
        setupTags: prev.setupTags.filter((t) => t !== tagToRemove),
      }));
    } else if (type === "mistake") {
      setSettings((prev) => ({
        ...prev,
        mistakeTags: prev.mistakeTags.filter((t) => t !== tagToRemove),
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        psychologyTags: prev.psychologyTags.filter((t) => t !== tagToRemove),
      }));
    }
  }

  function handleExportData() {
    const exportBundle = {
      user: {
        uid: user?.id,
        email: user?.email,
        plan,
      },
      settings,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profitpnl-journal-settings-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleLogout() {
    setShowLogoutConfirm(true);
  }

  async function confirmLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to log out. Please try again.");
    }
  }

  async function openBillingPortal() {
    if (managingBilling) return;
    setManagingBilling(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/payments/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ uid: user?.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else if (res.status === 503) {
        setComingSoonBroker("Billing Portal");
        setTimeout(() => setComingSoonBroker(null), 3000);
      } else {
        setComingSoonBroker(data.error || "Billing Portal");
        setTimeout(() => setComingSoonBroker(null), 4000);
      }
    } catch {
      setComingSoonBroker("Connection error — please try again.");
      setTimeout(() => setComingSoonBroker(null), 3000);
    } finally {
      setManagingBilling(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (deleteConfirmText !== "DELETE") return;

    setDeletingAccount(true);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Sign out locally
      await logout();
    } catch (err) {
      console.error("Account deletion error:", err);
      const message = err instanceof Error ? err.message : "Failed to delete account. Please contact support.";
      alert(message);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } finally {
      setDeletingAccount(false);
    }
  }

  // ── Trial helpers ──
  const isOnTrial = planSource === "trial" && plan === "Pro Plan";
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(0);
  useEffect(() => {
    if (isOnTrial && trialEndsAtMs) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrialDaysRemaining(
        Math.max(0, Math.ceil((trialEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24)))
      );
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrialDaysRemaining(0);
    }
  }, [isOnTrial, trialEndsAtMs]);
  const trialExpired = isOnTrial && trialDaysRemaining <= 0;

  const isPro = plan === "Pro Plan";
  const isFree = plan === "Free Plan";
  const isProPaid = isPro && planSource !== "trial";
  const canStartTrial = isFree && !hasUsedTrial;

  // ── Render ──
  if (loading)
    return (
      <AppShell title="Settings">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <LoaderIcon
              className="animate-spin text-[#F0B429]"
              size={28}
            />
            <span className="text-zinc-400 text-sm">
              Loading Trading Preferences...
            </span>
          </div>
        </div>
      </AppShell>
    );

  const initials = settings.displayName
    ? settings.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "TR";

  const tabs: {
    id: SettingsTab;
    label: string;
    icon: typeof Sliders;
    badge?: string;
  }[] = [
    { id: "preferences", label: "Trading Profile", icon: Sliders },
    { id: "notifications", label: "Notifications", icon: Bell, badge: "Daily Plan" },
    {
      id: "brokers",
      label: "Broker Connections",
      icon: Link2,
      badge: "Auto-Sync",
    },
    { id: "tags", label: "Trade Tags & Categories", icon: Tag },
    { id: "risk", label: "Prop Firm & Risk Rules", icon: ShieldAlert },
    { id: "account", label: "Account & Subscription", icon: User },
  ];

  // Broker connection statuses are derived from real saved data —
  // no hardcoded "Connected" badges. A broker only shows as connected
  // when the user has actually configured it.
  const brokerList = [
    {
      id: "mt5",
      name: "MetaTrader 5 (MT5)",
      type: "Forex, Futures & CFD",
      desc: "Auto-sync via read-only EA terminal connection.",
    },
    {
      id: "mt4",
      name: "MetaTrader 4 (MT4)",
      type: "Forex & CFD",
      desc: "Sync live trades in seconds without manual CSV exports.",
    },
    {
      id: "tradovate",
      name: "Tradovate / Rithmic",
      type: "Futures & Prop Firms",
      desc: "Direct API integration for Topstep, Apex, and Tradovate accounts.",
    },
    {
      id: "ib",
      name: "Interactive Brokers (TWS)",
      type: "Equities, Options & Futures",
      desc: "Secure OAuth read-only connection for institutional execution.",
    },
    {
      id: "tv",
      name: "TradingView Webhooks",
      type: "Universal Alerts",
      desc: "Receive automated execution logs directly from your chart alerts.",
    },
  ];

  // A broker is "connected" only if it's in the user's connectedBrokers list,
  // or (for TradingView) if a webhook URL has been saved.
  const connectedBrokers: string[] = (settings as unknown as Record<string, unknown>).connectedBrokers as string[] || [];
  const isBrokerConnected = (id: string) => {
    if (id === "tv") return !!settings.webhookUrl?.trim();
    return connectedBrokers.includes(id);
  };

  function handleToggleBroker(id: string) {
    // Broker integrations are not built yet — show "Coming Soon" toast
    const broker = brokerList.find((b) => b.id === id);
    setComingSoonBroker(broker?.name || id);
    setTimeout(() => setComingSoonBroker(null), 3000);
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        {/* ─── ACCOUNT HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 bg-[#0C0C14] border border-[#1F1F2C] rounded-2xl">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F0B429] to-[#d99f1e] flex items-center justify-center text-black font-black text-lg shadow-lg shadow-[#F0B429]/10">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-lg leading-tight">
              {settings.displayName || "Active Trader"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                {isPro ? (
                  <Crown className="text-[#F0B429]" size={12} />
                ) : (
                  <Shield className="text-zinc-500" size={12} />
                )}
                <span
                  className={
                    isPro ? "text-[#F0B429] font-semibold" : "text-zinc-400"
                  }
                >
                  {plan}
                </span>
                {isOnTrial && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F0B429]/15 text-[#F0B429] border border-[#F0B429]/25">
                    TRIAL — {trialDaysRemaining}d left
                  </span>
                )}
              </span>
              <span>•</span>
              <span>{user?.email || "trader@profitpnl.com"}</span>
              <span>•</span>
              <span>
                Base Currency: {settings.currency}
              </span>
              <span>•</span>
              <span>{settings.timezone}</span>
            </div>
          </div>
          <div className="flex gap-3 text-center shrink-0">
            <div className="px-4 py-2 bg-[#12121A] border border-[#1F1F2C]/60 rounded-lg">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Baseline Capital
              </p>
              <p className="text-white font-bold text-sm">
                ${settings.initialAccountSize.toLocaleString()}
              </p>
            </div>
            <div className="px-4 py-2 bg-[#12121A] border border-[#1F1F2C]/60 rounded-lg">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                Target Risk/Trade
              </p>
              <p className="text-white font-bold text-sm">
                {settings.defaultRiskPercentage}%
              </p>
            </div>
          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#F0B429] text-black font-semibold shadow-sm"
                    : "bg-[#12121A] text-zinc-400 hover:text-white hover:bg-[#181824] border border-[#1F1F2C]/60"
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F0B429]/20 text-[#F0B429]">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB CONTENT ─── */}
        <div className="space-y-6">
          {/* ═══════════════════════════════════════════════════
              1. TRADING PREFERENCES TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              <Card className="p-6 space-y-6">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Sliders size={16} className="text-[#F0B429]" />
                  Baseline Account & Metrics
                </h3>
                <p className="text-zinc-500 text-xs -mt-3">
                  These baseline parameters are used across your dashboard to
                  calculate risk-adjusted returns, R-multiples, and recommended
                  position sizes.
                </p>

                {/* Baseline Account Size */}
                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Baseline Account Size ($ Initial Balance)
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                      size={14}
                    />
                    <input
                      type="number"
                      value={settings.initialAccountSize}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          initialAccountSize: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                    />
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Used to calculate net percentage return and drawdown charts.
                  </p>
                </div>

                {/* Target Risk per Trade */}
                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Target Risk per Trade (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={settings.defaultRiskPercentage}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultRiskPercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                    />
                    <span className="text-zinc-500 text-sm font-semibold">
                      %
                    </span>
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Recommended risk target is between 0.5% and 2.0% per trade.
                  </p>
                </div>

                {/* Default Commission */}
                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Default Round-Trip Commission ($ per Contract/Lot)
                  </label>
                  <div className="relative">
                    <DollarSign
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                      size={14}
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={settings.defaultCommission}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultCommission: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                    />
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    Automatically deducted when calculating Net P&L in the trade
                    log.
                  </p>
                </div>

                {/* Currency & Timezone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-zinc-300 text-xs font-semibold">
                      Base Currency
                    </label>
                    <select
                      value={settings.currency}
                      onChange={(e) =>
                        setSettings({ ...settings, currency: e.target.value })
                      }
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-medium"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AUD">AUD ($)</option>
                      <option value="CAD">CAD ($)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CHF">CHF (Fr)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-zinc-300 text-xs font-semibold">
                      Timezone
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={(e) =>
                        setSettings({ ...settings, timezone: e.target.value })
                      }
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-medium"
                    >
                      <option value="UTC">UTC (Universal)</option>
                      <option value="EST">EST (New York)</option>
                      <option value="CST">CST (Chicago)</option>
                      <option value="GMT">GMT (London)</option>
                      <option value="CET">CET (Frankfurt)</option>
                      <option value="JST">JST (Tokyo)</option>
                      <option value="AEST">AEST (Sydney)</option>
                    </select>
                  </div>
                </div>
                <p className="text-zinc-600 text-[11px] -mt-3">
                  Matches your broker statement time and currency.
                </p>
              </Card>

              {/* Toggles Card */}
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <SettingsIcon size={16} className="text-[#F0B429]" />
                  Automation & Notifications
                </h3>

                {/* Auto-Calculate R */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Auto-Calculate R-Multiples
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Pre-fill R:R ratio based on entry, stop loss, and target
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        autoCalculateR: !settings.autoCalculateR,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-all relative ${settings.autoCalculateR ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${settings.autoCalculateR ? "right-[3px]" : "left-[3px]"}`}
                    />
                  </button>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold flex items-center gap-2">
                      <Bell size={14} className="text-[#F0B429]" />
                      Daily Limit Notifications
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Alerts when nearing daily max loss or target goals
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        notifications: !settings.notifications,
                      })
                    }
                    className={`w-11 h-6 rounded-full transition-all relative ${settings.notifications ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${settings.notifications ? "right-[3px]" : "left-[3px]"}`}
                    />
                  </button>
                </div>

                {/* Sound Effects */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold flex items-center gap-2">
                      {settings.soundEffects ? (
                        <Volume2 size={14} className="text-[#F0B429]" />
                      ) : (
                        <VolumeX size={14} className="text-zinc-500" />
                      )}
                      Sound Effects
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Play audio cues on trade fills, journal saves, and goal
                      alerts
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const next = !settings.soundEffects;
                      setSettings({ ...settings, soundEffects: next });
                      if (next) playClick();
                    }}
                    className={`w-11 h-6 rounded-full transition-all relative ${settings.soundEffects ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                  >
                    <div
                      className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${settings.soundEffects ? "right-[3px]" : "left-[3px]"}`}
                    />
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              2. NOTIFICATIONS TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <Card className="relative overflow-hidden border-[#F0B429]/25 bg-[#0D0D1A] p-0 shadow-xl shadow-black/20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_10%,rgba(240,180,41,0.18),transparent_34%),radial-gradient(circle_at_90%_0%,rgba(0,208,132,0.10),transparent_30%)]" />
                <div className="relative grid gap-5 p-6 lg:grid-cols-[1.25fr_0.75fr]">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#F0B429]/30 bg-[#F0B429]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#F0B429]">
                      <Mail size={12} /> Notification Control Center
                    </div>
                    <h3 className="mt-4 text-2xl font-black tracking-tight text-white">Daily Plan and Weekly Report emails</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#A0A0C0]">
                      Control the reminders that keep ProfitPnL in your pre-market and weekly review routine. Send yourself a test email any time to verify inbox delivery.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[#1E1E38] bg-[#080810]/90 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5A5A80]">Current status</p>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2">
                        <span className="text-[#8080A0]">Email Reports</span>
                        <span className={`font-black ${settings.emailReportsEnabled ? "text-[#00D084]" : "text-[#FF4565]"}`}>{settings.emailReportsEnabled ? "Enabled" : "Paused"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2">
                        <span className="text-[#8080A0]">Daily Plan</span>
                        <span className="font-black text-white">{settings.dailyPlanRemindersEnabled ? settings.dailyPlanReminderTime : "Off"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#1E1E38] bg-[#111124] px-3 py-2">
                        <span className="text-[#8080A0]">Weekly Report</span>
                        <span className="font-black text-white">{settings.weeklyReviewRemindersEnabled ? `${settings.weeklyReviewReminderDay} ${settings.weeklyReviewReminderTime}` : "Off"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {!settings.emailReportsEnabled && (
                <div className="rounded-2xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-sm font-bold text-[#FF8CA0]">
                  Email reports are paused. Daily Plan reminders and Weekly ProfitPnL Reports will not send until Email Reports is enabled again.
                </div>
              )}
              {notificationTestNotice && (
                <div className="rounded-2xl border border-[#00D084]/30 bg-[#00D084]/10 px-4 py-3 text-sm font-bold text-[#00D084]">
                  {notificationTestNotice}
                </div>
              )}
              {notificationTestError && (
                <div className="rounded-2xl border border-[#FF4565]/30 bg-[#FF4565]/10 px-4 py-3 text-sm font-bold text-[#FF8CA0]">
                  {notificationTestError}
                </div>
              )}

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-6 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-black text-white">
                        <Clock size={17} className="text-[#F0B429]" />
                        Daily Plan Reminder
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-[#8080A0]">
                        If today’s Daily Plan is not locked yet, ProfitPnL sends a pre-market nudge with recent risk context and a direct link to generate the plan.
                      </p>
                    </div>
                    <Toggle
                      enabled={settings.dailyPlanRemindersEnabled}
                      onClick={() => setSettings({ ...settings, dailyPlanRemindersEnabled: !settings.dailyPlanRemindersEnabled })}
                    />
                  </div>

                  <div className="mt-5 space-y-2">
                    <label className="text-xs font-semibold text-zinc-300">Reminder Time</label>
                    <input
                      type="time"
                      value={settings.dailyPlanReminderTime}
                      onChange={(e) => setSettings({ ...settings, dailyPlanReminderTime: e.target.value })}
                      className="w-full rounded-xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none transition focus:border-[#F0B429] [color-scheme:dark] disabled:opacity-50"
                      disabled={!settings.dailyPlanRemindersEnabled}
                    />
                    <p className="text-[11px] text-zinc-600">Timezone: {settings.timezone}. Cron delivery depends on the active production schedule.</p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5A5A80]">Email contents</p>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-[#A0A0C0]">
                      <li>• No accepted plan detected for today</li>
                      <li>• Recent 7-day risk context</li>
                      <li>• Button to Generate & Lock Daily Plan</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => sendNotificationTestEmail("daily-plan")}
                    disabled={Boolean(testingEmail)}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F0B429]/35 bg-[#F0B429]/10 px-5 py-3 text-sm font-black text-[#F0B429] transition hover:bg-[#F0B429]/15 disabled:opacity-60"
                  >
                    {testingEmail === "daily-plan" ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Send Me Daily Plan Test
                  </button>
                </Card>

                <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-6 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="flex items-center gap-2 text-base font-black text-white">
                        <Receipt size={17} className="text-[#F0B429]" />
                        Weekly ProfitPnL Report
                      </h3>
                      <p className="mt-2 text-xs leading-6 text-[#8080A0]">
                        A weekly report with trade count, total R, win rate, best setup, main leak, and review queue so you know what to improve next week.
                      </p>
                    </div>
                    <Toggle
                      enabled={settings.weeklyReviewRemindersEnabled}
                      onClick={() => setSettings({ ...settings, weeklyReviewRemindersEnabled: !settings.weeklyReviewRemindersEnabled })}
                    />
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Report Day</label>
                      <select
                        value={settings.weeklyReviewReminderDay}
                        onChange={(e) => setSettings({ ...settings, weeklyReviewReminderDay: e.target.value })}
                        className="w-full rounded-xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none transition focus:border-[#F0B429] disabled:opacity-50"
                        disabled={!settings.weeklyReviewRemindersEnabled}
                      >
                        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => <option key={day} value={day}>{day}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300">Report Time</label>
                      <input
                        type="time"
                        value={settings.weeklyReviewReminderTime}
                        onChange={(e) => setSettings({ ...settings, weeklyReviewReminderTime: e.target.value })}
                        className="w-full rounded-xl border border-[#1E1E38] bg-[#080810] px-4 py-3 text-sm font-black text-white outline-none transition focus:border-[#F0B429] [color-scheme:dark] disabled:opacity-50"
                        disabled={!settings.weeklyReviewRemindersEnabled}
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5A5A80]">Email contents</p>
                    <ul className="mt-3 space-y-2 text-xs leading-5 text-[#A0A0C0]">
                      <li>• Weekly closed trade count and total R</li>
                      <li>• Win rate, best setup, and main leak</li>
                      <li>• Link to complete Weekly Review</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => sendNotificationTestEmail("weekly-report")}
                    disabled={Boolean(testingEmail)}
                    className="gold-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black text-[#080810] disabled:opacity-60"
                  >
                    {testingEmail === "weekly-report" ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Send Me Weekly Report Test
                  </button>
                </Card>
              </div>

              <Card className="border-[#1E1E38] bg-[#0D0D1A]/95 p-6 shadow-lg">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-black text-white">
                      <Bell size={17} className="text-[#F0B429]" />
                      Master notification controls
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-[#8080A0]">Use the master email switch to pause all report emails without changing your reminder schedule.</p>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-2xl bg-[#F0B429] px-5 py-3 text-sm font-black text-black transition hover:bg-[#d99f1e] disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Notification Settings
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="flex items-center justify-between rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <div>
                      <p className="text-sm font-black text-white">Email reports</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Master switch for Daily Plan and Weekly Report emails.</p>
                    </div>
                    <Toggle
                      enabled={settings.emailReportsEnabled}
                      onClick={() => setSettings({ ...settings, emailReportsEnabled: !settings.emailReportsEnabled })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <div>
                      <p className="text-sm font-black text-white">Daily limit alerts</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">In-app alerts near daily max loss or target goals.</p>
                    </div>
                    <Toggle
                      enabled={settings.notifications}
                      onClick={() => setSettings({ ...settings, notifications: !settings.notifications })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-[#1E1E38] bg-[#080810] p-4">
                    <div>
                      <p className="text-sm font-black text-white">Sound effects</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Audio cues on saves, goals, and review moments.</p>
                    </div>
                    <Toggle
                      enabled={settings.soundEffects}
                      onClick={() => {
                        const next = !settings.soundEffects;
                        setSettings({ ...settings, soundEffects: next });
                        if (next) playClick();
                      }}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              2. BROKER CONNECTIONS TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "brokers" && (
            <div className="space-y-6">
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Link2 size={16} className="text-[#F0B429]" />
                  Supported Broker & Prop Integrations
                </h3>
                <p className="text-zinc-500 text-xs -mt-2">
                  Connect your trading platform for automatic read-only trade
                  imports. No manual CSV uploading or data entry required.
                </p>

                <div className="space-y-3">
                  {brokerList.map((broker) => {
                    const isConnected = isBrokerConnected(broker.id);
                    return (
                      <div
                        key={broker.name}
                        className={`flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-xl border transition-all ${
                          isConnected
                            ? "bg-[#0E1A12] border-emerald-500/20"
                            : "bg-[#12121A] border-[#1F1F2C] hover:border-[#2A2A3C]"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              isConnected
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-[#1A1A26] text-zinc-500"
                            }`}
                          >
                            {isConnected ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <Link2 size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-white text-sm font-semibold">
                              {broker.name}
                            </h4>
                            <p className="text-zinc-500 text-[11px]">
                              {broker.type}
                            </p>
                            <p className="text-zinc-600 text-xs mt-0.5 hidden md:block">
                              {broker.desc}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isConnected
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                : "bg-[#1A1A26] text-zinc-500 border border-[#242436]"
                            }`}
                          >
                            {isConnected ? "Connected" : "Not Connected"}
                          </span>
                          <button
                            onClick={() => {
                              if (isConnected) {
                                // Disconnect still works for any manually connected broker
                                if (broker.id === "tv") {
                                  setSettings((prev) => ({ ...prev, webhookUrl: "" }));
                                } else {
                                  handleToggleBroker(broker.id);
                                }
                              } else {
                                // Connect is not available yet — show Coming Soon
                                handleToggleBroker(broker.id);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                              isConnected
                                ? "border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                                : "bg-[#F0B429] hover:bg-[#d99f1e] text-black shadow-sm"
                            }`}
                          >
                            {isConnected ? "Disconnect" : "Connect"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* API Key & Webhook */}
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Key size={16} className="text-[#F0B429]" />
                  Manual API Key & Webhook Endpoint
                </h3>

                {/* API Key */}
                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Personal API Secret Key (For Custom Scripts & Python
                    Backtesters)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={settings.apiKey || "ppnl_live_8f932k019283mn4b_x9q"}
                        readOnly
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-zinc-300 font-mono outline-none"
                      />
                      <button
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showApiKey ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={handleCopyKey}
                      className="px-3 py-2 rounded-lg bg-[#14141E] border border-[#242436] hover:bg-[#1C1C2A] text-zinc-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <Copy size={14} />
                      )}
                      {copiedKey ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={handleRegenerateKey}
                      className="px-3 py-2 rounded-lg bg-[#14141E] border border-[#242436] hover:bg-[#1C1C2A] text-zinc-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw size={14} />
                      Rotate
                    </button>
                  </div>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Webhook Endpoint URL
                  </label>
                  <div className="relative">
                    <Link2
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      size={14}
                    />
                    <input
                      type="url"
                      value={settings.webhookUrl}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          webhookUrl: e.target.value,
                        })
                      }
                      placeholder="https://your-server.com/webhook/profitpnl"
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] transition-all font-mono placeholder:text-zinc-600 placeholder:font-sans"
                    />
                  </div>
                  <p className="text-zinc-600 text-[11px]">
                    POST endpoint for receiving real-time trade event
                    notifications from ProfitPnL.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              3. TRADE TAGS & CATEGORIES TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "tags" && (
            <div className="space-y-6">
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Tag size={16} className="text-[#F0B429]" />
                  Custom Trade Categories & Tags
                </h3>
                <p className="text-zinc-500 text-xs -mt-2">
                  Create custom categories to tag your setups, execution errors,
                  and emotional state. These tags feed directly into your
                  performance reports to reveal your profitability by setup and
                  mistake.
                </p>

                {/* ── Setup & Strategy Tags ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Target size={14} className="text-[#F0B429]" />
                      Strategy & Setup Tags
                    </h4>
                    <span className="text-[10px] text-zinc-500 bg-[#1A1A26] px-2 py-0.5 rounded-full">
                      {settings.setupTags.length} active
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs">
                    Tag trades with your specific entry model (e.g. Breakout,
                    ORB, Reversal).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.setupTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F0B429]/8 border border-[#F0B429]/20 rounded-lg text-xs text-[#F0B429] font-medium"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag("setup", tag)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSetupTag}
                      onChange={(e) => setNewSetupTag(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleAddTag("setup", newSetupTag)
                      }
                      placeholder="Add new setup tag (e.g. Supply Zone)..."
                      className="flex-1 bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                    <button
                      onClick={() => handleAddTag("setup", newSetupTag)}
                      className="px-3.5 py-2 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                </div>

                {/* ── Execution & Mistake Tags ── */}
                <div className="space-y-3 pt-4 border-t border-[#1F1F2C]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" />
                      Execution & Mistake Tags
                    </h4>
                    <span className="text-[10px] text-zinc-500 bg-[#1A1A26] px-2 py-0.5 rounded-full">
                      {settings.mistakeTags.length} active
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs">
                    Track recurring execution errors to identify what drains
                    your account.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.mistakeTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/8 border border-red-500/20 rounded-lg text-xs text-red-400 font-medium"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag("mistake", tag)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMistakeTag}
                      onChange={(e) => setNewMistakeTag(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleAddTag("mistake", newMistakeTag)
                      }
                      placeholder="Add mistake tag (e.g. Boredom Trade)..."
                      className="flex-1 bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-red-400"
                    />
                    <button
                      onClick={() => handleAddTag("mistake", newMistakeTag)}
                      className="px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                </div>

                {/* ── Psychology & Mindset Tags ── */}
                <div className="space-y-3 pt-4 border-t border-[#1F1F2C]">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Brain size={14} className="text-purple-400" />
                      Psychology & Mindset Tags
                    </h4>
                    <span className="text-[10px] text-zinc-500 bg-[#1A1A26] px-2 py-0.5 rounded-full">
                      {settings.psychologyTags.length} active
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs">
                    Tag your emotional and mental state to reveal patterns
                    between mindset and performance.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {settings.psychologyTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/8 border border-purple-500/20 rounded-lg text-xs text-purple-400 font-medium"
                      >
                        {tag}
                        <button
                          onClick={() =>
                            handleRemoveTag("psychology", tag)
                          }
                          className="text-purple-400/60 hover:text-purple-300 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPsychologyTag}
                      onChange={(e) => setNewPsychologyTag(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" &&
                        handleAddTag("psychology", newPsychologyTag)
                      }
                      placeholder="Add psychology tag (e.g. Tilted, Confident)..."
                      className="flex-1 bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-purple-400"
                    />
                    <button
                      onClick={() =>
                        handleAddTag("psychology", newPsychologyTag)
                      }
                      className="px-3.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              4. PROP FIRM & RISK RULES TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "risk" && (
            <Card className="p-6 space-y-6">
              <div>
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <ShieldAlert size={16} className="text-[#F0B429]" />
                  Prop Firm & Evaluation Protection Protocol
                </h3>
                <p className="text-zinc-500 text-xs mt-1">
                  Setting hard daily loss and drawdown ceilings prevents
                  emotional tilt and evaluation drawdown violations. When
                  breached, the journal will flag your blotter and issue lockout
                  warnings.
                </p>
              </div>

              {/* Max Daily Loss */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    Max Daily Loss Ceiling
                  </h4>
                  <span className="text-red-400 font-bold text-sm">
                    ${settings.dailyLossLimit.toLocaleString()}
                  </span>
                </div>
                <p className="text-zinc-600 text-xs">
                  Stop trading if net daily losses hit limit
                </p>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={settings.dailyLossLimit}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dailyLossLimit: Number(e.target.value),
                    })
                  }
                  className="w-full accent-red-500 cursor-pointer bg-[#1F1F2C] h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>$100</span>
                  <span>$1,000</span>
                  <span>$5,000+</span>
                </div>
              </div>

              {/* Daily Profit Target */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                    <Target size={14} className="text-emerald-400" />
                    Target Daily Profit Goal
                  </h4>
                  <span className="text-emerald-400 font-bold text-sm">
                    ${settings.dailyProfitTarget.toLocaleString()}
                  </span>
                </div>
                <p className="text-zinc-600 text-xs">
                  Target goal to lock in daily profits
                </p>
                <input
                  type="range"
                  min={200}
                  max={10000}
                  step={100}
                  value={settings.dailyProfitTarget}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      dailyProfitTarget: Number(e.target.value),
                    })
                  }
                  className="w-full accent-emerald-500 cursor-pointer bg-[#1F1F2C] h-1.5 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>$200</span>
                  <span>$2,500</span>
                  <span>$10,000+</span>
                </div>
              </div>

              {/* Overall Drawdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-semibold">
                    Overall Drawdown Ceiling
                  </h4>
                </div>
                <p className="text-zinc-600 text-xs">
                  Max allowable trailing drawdown limit
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.maxDrawdownLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        maxDrawdownLimit: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#F0B429]"
                  />
                  <span className="text-zinc-500 text-xs font-semibold shrink-0">
                    USD
                  </span>
                </div>
              </div>

              {/* Consecutive Loss Lockout */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-semibold">
                    Consecutive Loss Lockout
                  </h4>
                  <span className="text-purple-400 font-bold text-sm">
                    {settings.maxConsecutiveLosses} Trades
                  </span>
                </div>
                <p className="text-zinc-600 text-xs">
                  Pause trading after consecutive losing streaks
                </p>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() =>
                        setSettings({
                          ...settings,
                          maxConsecutiveLosses: num,
                        })
                      }
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                        settings.maxConsecutiveLosses === num
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-[#14141E] text-zinc-400 hover:text-white border border-[#242436]"
                      }`}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Enforce Review */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1F1F2C]">
                <div>
                  <p className="text-white text-sm font-semibold">
                    Enforce Post-Trade Journal Checklist
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    Require tagging strategy setup, execution mistakes, and
                    notes before marking a trade log as closed
                  </p>
                </div>
                <button
                  onClick={() =>
                    setSettings({
                      ...settings,
                      enforceReview: !settings.enforceReview,
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.enforceReview ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                >
                  <div
                    className={`w-4.5 h-4.5 bg-white rounded-full absolute top-[3px] transition-all shadow-sm ${settings.enforceReview ? "right-[3px]" : "left-[3px]"}`}
                  />
                </button>
              </div>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════
              5. ACCOUNT & SUBSCRIPTION TAB
          ═══════════════════════════════════════════════════ */}
          {activeTab === "account" && (
            <div className="space-y-6">
              {/* ── Profile Section ── */}
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <User size={16} className="text-[#F0B429]" />
                  Trader Profile & Identity
                </h3>

                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.displayName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        displayName: e.target.value,
                      })
                    }
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429] transition-all font-medium"
                    placeholder="Enter professional name..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    TradingView Username (For Indicator Access)
                  </label>
                  <input
                    type="text"
                    value={settings.tradingviewUsername}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tradingviewUsername: e.target.value,
                      })
                    }
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429] transition-all font-medium"
                    placeholder="Enter your exact TradingView username..."
                  />
                  <p className="text-zinc-600 text-[10px]">
                    Required to grant secure invite-only script access to your indicators (Bias Desk Pro).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-zinc-500 outline-none cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-300 text-xs font-semibold">
                    Trading Philosophy / Bio
                  </label>
                  <textarea
                    rows={3}
                    value={settings.bio}
                    onChange={(e) =>
                      setSettings({ ...settings, bio: e.target.value })
                    }
                    className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429] transition-all font-normal placeholder:text-zinc-600 resize-none"
                    placeholder="e.g. Process over outcomes. Let probabilities play out."
                  />
                </div>
              </Card>

              {/* ════════════════════════════════════════
                  MEMBERSHIP & BILLING SECTION (NEW)
              ════════════════════════════════════════ */}
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Crown size={16} className="text-[#F0B429]" />
                  Membership & Billing
                </h3>

                {/* Current Plan Card */}
                <div
                  className={`relative overflow-hidden p-5 rounded-xl border ${
                    isPro
                      ? "bg-gradient-to-br from-[#1A1608] to-[#0C0C14] border-[#F0B429]/30"
                      : "bg-[#12121A] border-[#1F1F2C]"
                  }`}
                >
                  {isPro && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F0B429]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  )}
                  <div className="relative flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isPro
                              ? "bg-[#F0B429]/15 text-[#F0B429]"
                              : "bg-[#1A1A26] text-zinc-500"
                          }`}
                        >
                          {isPro ? <Crown size={20} /> : <Shield size={20} />}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-base">
                            {plan}
                          </h4>
                          <p className="text-zinc-500 text-xs">
                            {isProPaid && "Paid subscription — active"}
                            {isOnTrial &&
                              `Free trial — ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining`}
                            {isFree && "Free starter tier"}
                          </p>
                        </div>
                      </div>

                      {/* Trial progress bar */}
                      {isOnTrial && (
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#F0B429] font-medium flex items-center gap-1">
                              <Timer size={11} />
                              {trialDaysRemaining} day
                              {trialDaysRemaining !== 1 ? "s" : ""} remaining
                            </span>
                            <span className="text-zinc-500">
                              Ends{" "}
                              {trialEndsAtMs
                                ? new Date(trialEndsAtMs).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )
                                : "—"}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1F1F2C] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#F0B429] to-[#d99f1e] rounded-full transition-all"
                              style={{
                                width: `${Math.max(0, Math.min(100, (trialDaysRemaining / 7) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Plan action button */}
                    <div className="shrink-0">
                      {isFree && canStartTrial && (
                        <button
                          disabled={startingTrial}
                          onClick={async () => {
                            if (startingTrial) return;
                            setStartingTrial(true);
                            try {
                              const { data: { session } } = await createClient().auth.getSession();
                              const res = await fetch("/api/trial/start", {
                                method: "POST",
                                headers: { 
                                  "Content-Type": "application/json",
                                  "Authorization": `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({ uid: user?.id }),
                              });
                              const data = await res.json();
                              if (data.ok) {
                                await refreshPlan();
                                alert(
                                  "🎉 Pro trial activated! You now have 7 days of full Pro access."
                                );
                              } else {
                                alert(data.error || "Failed to start trial.");
                              }
                            } catch {
                              alert("Connection error. Please try again.");
                            } finally {
                              setStartingTrial(false);
                            }
                          }}
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20 disabled:opacity-50"
                        >
                          {startingTrial ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                          {startingTrial ? "Activating..." : "Start 7-Day Free Trial"}
                        </button>
                      )}
                      {isFree && !canStartTrial && (
                        <button
                          onClick={() => window.open("/upgrade", "_blank", "noopener,noreferrer")}
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20"
                        >
                          <Crown size={14} />
                          Upgrade to Pro — $19 USD/mo
                        </button>
                      )}
                      {isOnTrial && (
                        <button
                          onClick={() => window.open("/upgrade", "_blank", "noopener,noreferrer")}
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20"
                        >
                          <Crown size={14} />
                          Upgrade Now — Keep Pro
                        </button>
                      )}
                      {isProPaid && (
                        <button
                          disabled={managingBilling}
                          onClick={openBillingPortal}
                          className="px-5 py-2.5 rounded-lg border border-[#242436] bg-[#14141E] hover:bg-[#1C1C2A] text-white font-semibold text-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {managingBilling ? <Loader2 className="animate-spin" size={14} /> : <CreditCard size={14} />}
                          {managingBilling ? "Opening Portal..." : "Manage Subscription"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature Checklist */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {[
                    { label: "Unlimited Trade Logging", pro: true, free: true },
                    {
                      label: "MT4 / MT5 & Prop Firm Auto-Sync",
                      pro: true,
                      free: false,
                    },
                    {
                      label: "Custom Tag Performance Reports",
                      pro: true,
                      free: false,
                    },
                    {
                      label: "Multi-Account Prop Blotter",
                      pro: true,
                      free: false,
                    },
                    {
                      label: "AI Trading Coach (Unlimited)",
                      pro: true,
                      free: false,
                    },
                    {
                      label: "Verified P&L Certificates",
                      pro: true,
                      free: false,
                    },
                  ].map((feat) => {
                    const active = isPro ? feat.pro : feat.free;
                    return (
                      <div
                        key={feat.label}
                        className="flex items-center gap-2.5"
                      >
                        {active ? (
                          <CheckCircle2
                            size={14}
                            className="text-emerald-400 shrink-0"
                          />
                        ) : (
                          <X
                            size={14}
                            className="text-zinc-600 shrink-0"
                          />
                        )}
                        <span
                          className={`text-xs ${active ? "text-zinc-300" : "text-zinc-600"}`}
                        >
                          {feat.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Billing History (Pro paid users only) */}
                {isProPaid && (
                  <div className="pt-4 border-t border-[#1F1F2C] space-y-3">
                    <h4 className="text-white text-sm font-semibold flex items-center gap-2">
                      <Receipt size={14} className="text-zinc-400" />
                      Billing History
                    </h4>
                    <p className="text-zinc-600 text-xs">
                      View and download past invoices from the{" "}
                      <button
                        onClick={openBillingPortal}
                        disabled={managingBilling}
                        className="text-[#F0B429] hover:underline inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {managingBilling ? <Loader2 className="animate-spin inline" size={12} /> : null}
                        Stripe Customer Portal
                        <ExternalLink size={10} />
                      </button>
                      .
                    </p>
                  </div>
                )}
              </Card>

              {/* ── Data Portability ── */}
              <Card className="p-6 space-y-4">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Database size={16} className="text-[#F0B429]" />
                  Data Portability
                </h3>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-[#12121A] border border-[#1F1F2C] rounded-xl">
                  <div>
                    <p className="text-white text-sm font-semibold">
                      Export Journal Configuration & Snapshot
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Download an offline JSON backup of your baseline metrics,
                      custom tags, and prop risk rules.
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="px-4 py-2 rounded-lg bg-[#14141E] border border-[#242436] hover:bg-[#1C1C2A] text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
                  >
                    <Download size={14} />
                    Export Backup File
                  </button>
                </div>
              </Card>

              {/* ── Session & Danger Zone ── */}
              <Card className="p-6 space-y-5">
                <h3 className="text-white font-bold text-base flex items-center gap-2">
                  <Lock size={16} className="text-zinc-400" />
                  Session & Account Control
                </h3>

                {/* Log Out */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-[#12121A] border border-[#1F1F2C] rounded-xl">
                  <div>
                    <p className="text-white text-sm font-semibold flex items-center gap-2">
                      <LogOut size={14} className="text-zinc-400" />
                      Log Out Session
                    </p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      End your current session. You can log back in anytime.
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg bg-[#14141E] border border-[#242436] hover:bg-[#1C1C2A] text-white text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
                  >
                    <LogOut size={14} />
                    Log Out
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      size={16}
                      className="text-red-400 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-red-300 text-sm font-semibold">
                        Danger Zone — Permanent Account Deletion
                      </p>
                      <p className="text-zinc-500 text-xs mt-1">
                        Erasing your profile permanently deletes all historical
                        trade records, connected accounts, custom tags, and
                        psychology logs from our servers. This action{" "}
                        <strong className="text-red-400">cannot be reversed</strong>.
                      </p>
                    </div>
                  </div>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all shadow-sm flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Erase All Records
                    </button>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <p className="text-zinc-400 text-xs">
                        Type <strong className="text-red-400 font-mono">DELETE</strong>{" "}
                        below to confirm permanent account deletion:
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE to confirm"
                        className="w-full max-w-xs bg-[#14141E] border border-red-500/30 rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-red-500 font-mono"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={
                            deleteConfirmText !== "DELETE" || deletingAccount
                          }
                          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-2 transition-all"
                        >
                          {deletingAccount ? (
                            <LoaderIcon size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          {deletingAccount
                            ? "Deleting..."
                            : "Permanently Delete Account"}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText("");
                          }}
                          className="px-4 py-2 rounded-lg bg-[#14141E] border border-[#242436] text-zinc-400 text-xs font-medium hover:bg-[#1C1C2A] transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* ─── GLOBAL STICKY SAVE BAR ─── */}
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-[#080810]/95 backdrop-blur-md border-t border-[#1F1F2C] px-4 py-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <p className="text-zinc-500 text-xs hidden md:block">
              Settings sync with Supabase. Unsaved changes will be highlighted.
            </p>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                saved
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-[#F0B429] hover:bg-[#d99f1e] text-black"
              }`}
            >
              {saving ? (
                <LoaderIcon size={14} className="animate-spin" />
              ) : saved ? (
                <CheckCircle2 size={14} />
              ) : (
                <Save size={14} />
              )}
              {saving
                ? "Syncing to Cloud..."
                : saved
                  ? "Changes Saved"
                  : "Save Preferences"}
            </button>
          </div>
        </div>

        {/* ─── LOGOUT CONFIRMATION MODAL ─── */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#12121A] border border-[#242436] rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                  <LogOut size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Sign out of ProfitPnL?</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">Are you sure you want to end your current session?</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#181824] border border-[#282838] hover:bg-[#202030] text-zinc-300 text-xs font-semibold transition-colors"
                >
                  No, Stay Logged In
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20"
                >
                  <LogOut size={13} />
                  Yes, Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── UPGRADE TOAST ─── */}
        {upgradeToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#12121A] border border-[#F0B429] rounded-xl shadow-2xl shadow-[#F0B429]/20 max-w-md">
              <div className="w-8 h-8 rounded-lg bg-[#F0B429]/20 flex items-center justify-center shrink-0">
                <Crown size={16} className="text-[#F0B429]" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-bold">Pro Plan Active</p>
                <p className="text-zinc-300 text-xs">{upgradeToast}</p>
              </div>
              <button
                onClick={() => setUpgradeToast(null)}
                className="text-zinc-500 hover:text-white transition-colors ml-2 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ─── COMING SOON / ERROR TOAST ─── */}
        {comingSoonBroker && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-[#12121A] border border-[#F0B429]/30 rounded-xl shadow-2xl shadow-black/50 max-w-md">
              <div className="w-8 h-8 rounded-lg bg-[#F0B429]/15 flex items-center justify-center shrink-0">
                <Clock size={16} className="text-[#F0B429]" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">
                  {comingSoonBroker.length > 40 ? "Notice" : "Coming Soon"}
                </p>
                <p className="text-zinc-400 text-xs">
                  {comingSoonBroker === "Billing Portal" ? (
                    <>
                      <span className="text-[#F0B429]">Billing Portal</span> is being set up. Contact support for billing inquiries.
                    </>
                  ) : comingSoonBroker.length > 40 ? (
                    <span className="text-zinc-300">{comingSoonBroker}</span>
                  ) : (
                    <>
                      <span className="text-[#F0B429]">{comingSoonBroker}</span>
                      {" integration is under development. Use CSV import for now."}
                    </>
                  )}
                </p>
              </div>
              <button
                onClick={() => setComingSoonBroker(null)}
                className="text-zinc-500 hover:text-white transition-colors ml-2 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
