"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase-client";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import {
  User,
  Bell,
  Globe,
  Lock,
  LogOut,
  Trash2,
  Save,
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
  Loader2 as LoaderIcon,
} from "lucide-react";

type SettingsTab = "preferences" | "brokers" | "tags" | "risk" | "account";

export default function SettingsPage() {
  const { user, plan, planSource, trialEndsAtMs, hasUsedTrial, logout, refreshPlan } =
    useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [copiedKey, setCopiedKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [comingSoonBroker, setComingSoonBroker] = useState<string | null>(null);

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
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings((prev) => ({
            ...prev,
            displayName: data.displayName || "",
            bio: data.bio || prev.bio,
            currency: data.currency || "USD",
            timezone: data.timezone || "UTC",
            notifications:
              data.notifications !== undefined ? data.notifications : true,
            soundEffects:
              data.soundEffects !== undefined ? data.soundEffects : true,
            initialAccountSize: data.initialAccountSize || 50000,
            defaultRiskPercentage: data.defaultRiskPercentage || 1.0,
            defaultCommission:
              data.defaultCommission !== undefined
                ? data.defaultCommission
                : 2.5,
            autoCalculateR:
              data.autoCalculateR !== undefined ? data.autoCalculateR : true,
            dailyLossLimit: data.dailyLossLimit || 1000,
            maxDrawdownLimit: data.maxDrawdownLimit || 3000,
            dailyProfitTarget: data.dailyProfitTarget || 1500,
            maxConsecutiveLosses: data.maxConsecutiveLosses || 3,
            enforceReview:
              data.enforceReview !== undefined ? data.enforceReview : true,
            activeBroker: data.activeBroker || "",
            connectedBrokers: data.connectedBrokers || [],
            webhookUrl: data.webhookUrl || "",
            apiKey: data.apiKey || prev.apiKey,
            setupTags: data.setupTags || prev.setupTags,
            mistakeTags: data.mistakeTags || prev.mistakeTags,
            psychologyTags: data.psychologyTags || prev.psychologyTags,
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
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, settings, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleRegenerateKey() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let rand = "";
    for (let i = 0; i < 16; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newKey = `ppnl_live_${rand}`;
    setSettings((prev) => ({ ...prev, apiKey: newKey }));
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(settings.apiKey);
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
        uid: user?.uid,
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

  async function handleLogout() {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
      alert("Failed to log out. Please try again.");
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (deleteConfirmText !== "DELETE") return;

    setDeletingAccount(true);
    try {
      // 1. Delete all subcollections (trades, journals, etc.)
      const subcollections = ["trades", "journals", "playbooks", "accounts"];
      for (const collName of subcollections) {
        try {
          const subSnap = await getDocs(
            collection(db, "users", user.uid, collName)
          );
          if (subSnap.size > 0) {
            const batch = writeBatch(db);
            subSnap.forEach((d) => batch.delete(d.ref));
            await batch.commit();
          }
        } catch {
          // subcollection may not exist — that's fine
        }
      }

      // 2. Delete the user document itself
      await deleteDoc(doc(db, "users", user.uid));

      // 3. Delete the Firebase Auth account
      await deleteUser(auth.currentUser!);

      // 4. Sign out (onAuthStateChanged will handle redirect)
      await logout();
    } catch (err: unknown) {
      console.error("Account deletion error:", err);
      // Re-auth required for deleteAccount — redirect to login
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        String((err as { code: string }).code).includes("requires-recent-login")
      ) {
        alert(
          "For security, please log out and log back in, then try deletion again within 5 minutes."
        );
      } else {
        alert("Failed to delete account. Some data may have been removed. Please contact support.");
      }
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } finally {
      setDeletingAccount(false);
    }
  }

  // ── Trial helpers ──
  const isOnTrial = planSource === "trial" && plan === "Pro Plan";
  const trialDaysRemaining = isOnTrial && trialEndsAtMs
    ? Math.max(0, Math.ceil((trialEndsAtMs - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
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
    { id: "preferences", label: "Trading Preferences", icon: Sliders },
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
                    onClick={() =>
                      setSettings({
                        ...settings,
                        soundEffects: !settings.soundEffects,
                      })
                    }
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
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/trial/start", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ uid: user?.uid }),
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
                            }
                          }}
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20"
                        >
                          <Zap size={14} />
                          Start 7-Day Free Trial
                        </button>
                      )}
                      {isFree && !canStartTrial && (
                        <button
                          onClick={() =>
                            (window.location.href = "/upgrade")
                          }
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20"
                        >
                          <Crown size={14} />
                          Upgrade to Pro — $19/mo
                        </button>
                      )}
                      {isOnTrial && (
                        <button
                          onClick={() =>
                            (window.location.href = "/upgrade")
                          }
                          className="px-5 py-2.5 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-[#F0B429]/20"
                        >
                          <Crown size={14} />
                          Upgrade Now — Keep Pro
                        </button>
                      )}
                      {isProPaid && (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                "/api/payments/manage",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({ uid: user?.uid }),
                                }
                              );
                              const data = await res.json();
                              if (data.url) {
                                window.location.href = data.url;
                              } else if (res.status === 503) {
                                setComingSoonBroker("Billing Portal");
                                setTimeout(() => setComingSoonBroker(null), 3000);
                              } else {
                                // 400 = no billing account yet, or other error
                                setComingSoonBroker(data.error || "Billing Portal");
                                setTimeout(() => setComingSoonBroker(null), 4000);
                              }
                            } catch {
                              setComingSoonBroker("Connection error — please try again.");
                              setTimeout(() => setComingSoonBroker(null), 3000);
                            }
                          }}
                          className="px-5 py-2.5 rounded-lg border border-[#242436] bg-[#14141E] hover:bg-[#1C1C2A] text-white font-semibold text-xs transition-colors flex items-center gap-2"
                        >
                          <CreditCard size={14} />
                          Manage Subscription
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
                        onClick={async () => {
                          try {
                            const res = await fetch(
                              "/api/payments/manage",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ uid: user?.uid }),
                              }
                            );
                            const data = await res.json();
                            if (data.url) {
                              window.location.href = data.url;
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
                          }
                        }}
                        className="text-[#F0B429] hover:underline inline-flex items-center gap-1"
                      >
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
        <div className="fixed bottom-0 left-0 right-0 bg-[#080810]/95 backdrop-blur-md border-t border-[#1F1F2C] px-4 py-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <p className="text-zinc-500 text-xs hidden md:block">
              Settings automatically sync with Firestore Cloud. Unsaved changes
              will be highlighted.
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
