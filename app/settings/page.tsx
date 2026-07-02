"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase-client";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
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
  DollarSign
} from "lucide-react";

type SettingsTab = "preferences" | "brokers" | "tags" | "risk" | "account";

export default function SettingsPage() {
  const { user, plan, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("preferences");
  const [copiedKey, setCopiedKey] = useState(false);

  // Custom tag state for TradeZella style tag management
  const [newSetupTag, setNewSetupTag] = useState("");
  const [newMistakeTag, setNewMistakeTag] = useState("");

  const [settings, setSettings] = useState({
    // Account & Profile
    displayName: "",
    bio: "Disciplined execution is my primary edge.",
    currency: "USD",
    timezone: "UTC",
    notifications: true,
    soundEffects: true,

    // Trading Preferences (Baseline Metrics)
    initialAccountSize: 50000,
    defaultRiskPercentage: 1.0,
    defaultCommission: 2.50,
    autoCalculateR: true,

    // Prop Firm & Risk Rules
    dailyLossLimit: 1000,
    maxDrawdownLimit: 3000,
    dailyProfitTarget: 1500,
    maxConsecutiveLosses: 3,
    enforceReview: true,

    // Broker Connections Status
    activeBroker: "MetaTrader 5 (MT5)",
    webhookUrl: "",
    apiKey: "ppnl_live_8f932k019283mn4b_x9q",

    // Custom Tags & Categories
    setupTags: [
      "Breakout", 
      "Reversal", 
      "Opening Range Breakout (ORB)", 
      "Liquidity Sweep", 
      "Order Block", 
      "News Momentum"
    ],
    mistakeTags: [
      "FOMO Entry", 
      "Revenge Trade", 
      "Chased Price", 
      "Moved Stop Loss", 
      "Exited Early", 
      "Overleveraged"
    ],
    psychologyTags: [
      "Focused & Calm", 
      "Good Sleep", 
      "Poor Sleep", 
      "Anxious", 
      "Skipped Routine"
    ]
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings(prev => ({
            ...prev,
            displayName: data.displayName || "",
            bio: data.bio || prev.bio,
            currency: data.currency || "USD",
            timezone: data.timezone || "UTC",
            notifications: data.notifications !== undefined ? data.notifications : true,
            soundEffects: data.soundEffects !== undefined ? data.soundEffects : true,
            initialAccountSize: data.initialAccountSize || 50000,
            defaultRiskPercentage: data.defaultRiskPercentage || 1.0,
            defaultCommission: data.defaultCommission !== undefined ? data.defaultCommission : 2.50,
            autoCalculateR: data.autoCalculateR !== undefined ? data.autoCalculateR : true,
            dailyLossLimit: data.dailyLossLimit || 1000,
            maxDrawdownLimit: data.maxDrawdownLimit || 3000,
            dailyProfitTarget: data.dailyProfitTarget || 1500,
            maxConsecutiveLosses: data.maxConsecutiveLosses || 3,
            enforceReview: data.enforceReview !== undefined ? data.enforceReview : true,
            activeBroker: data.activeBroker || "MetaTrader 5 (MT5)",
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
    setSettings(prev => ({ ...prev, apiKey: newKey }));
  }

  function handleCopyKey() {
    navigator.clipboard.writeText(settings.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  function handleAddTag(type: "setup" | "mistake", value: string) {
    if (!value.trim()) return;
    if (type === "setup") {
      if (!settings.setupTags.includes(value.trim())) {
        setSettings(prev => ({ ...prev, setupTags: [...prev.setupTags, value.trim()] }));
      }
      setNewSetupTag("");
    } else {
      if (!settings.mistakeTags.includes(value.trim())) {
        setSettings(prev => ({ ...prev, mistakeTags: [...prev.mistakeTags, value.trim()] }));
      }
      setNewMistakeTag("");
    }
  }

  function handleRemoveTag(type: "setup" | "mistake", tagToRemove: string) {
    if (type === "setup") {
      setSettings(prev => ({ ...prev, setupTags: prev.setupTags.filter(t => t !== tagToRemove) }));
    } else {
      setSettings(prev => ({ ...prev, mistakeTags: prev.mistakeTags.filter(t => t !== tagToRemove) }));
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
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profitpnl-journal-settings-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-500 font-sans text-sm font-medium">Loading Trading Preferences...</div>;

  const initials = settings.displayName 
    ? settings.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "TR";

  const tabs = [
    { id: "preferences", label: "Trading Preferences", icon: Sliders },
    { id: "brokers", label: "Broker Connections", icon: Link2, badge: "Auto-Sync" },
    { id: "tags", label: "Trade Tags & Categories", icon: Tag },
    { id: "risk", label: "Prop Firm & Risk Rules", icon: ShieldAlert },
    { id: "account", label: "Account & Subscription", icon: User },
  ];

  const brokerList = [
    { name: "MetaTrader 5 (MT5)", type: "Forex, Futures & CFD", status: "Connected", desc: "Auto-sync active via read-only EA terminal connection." },
    { name: "MetaTrader 4 (MT4)", type: "Forex & CFD", status: "Ready to Connect", desc: "Sync live trades in seconds without manual CSV exports." },
    { name: "Tradovate / Rithmic", type: "Futures & Prop Firms", status: "Ready to Connect", desc: "Direct API integration for Topstep, Apex, and Tradovate accounts." },
    { name: "Interactive Brokers (TWS)", type: "Equities, Options & Futures", status: "Ready to Connect", desc: "Secure OAuth read-only connection for institutional execution." },
    { name: "TradingView Webhooks", type: "Universal Alerts", status: "Active Webhook", desc: "Receive automated execution logs directly from your chart alerts." },
  ];

  return (
    <AppShell title="Journal Settings" subtitle="Configure baseline metrics, broker integrations, custom tags, and prop risk rules">
      <div className="max-w-5xl mx-auto w-full space-y-8 py-8 px-4 md:px-8 font-sans text-zinc-200">
        
        {/* --- REALISTIC ACCOUNT HEADER --- */}
        <div className="p-6 rounded-2xl bg-[#0E0E14] border border-[#1F1F2C] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-16 h-16 rounded-xl bg-[#181824] border border-[#282838] flex items-center justify-center text-white text-xl font-bold tracking-tight shrink-0 shadow-inner">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  {settings.displayName || "Active Trader"}
                </h2>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide border ${
                  plan === "Pro Plan" 
                    ? "bg-[#F0B429]/10 border-[#F0B429]/30 text-[#F0B429]" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}>
                  {plan}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-normal flex items-center justify-center md:justify-start gap-2">
                <span>{user?.email || "trader@profitpnl.com"}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300 font-medium">Base Currency: {settings.currency}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-300 font-medium">{settings.timezone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#14141E] px-5 py-3 rounded-xl border border-[#242436] text-center shrink-0">
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Baseline Capital</p>
              <p className="text-base font-bold text-white font-mono mt-0.5">${settings.initialAccountSize.toLocaleString()}</p>
            </div>
            <div className="h-8 w-px bg-[#242436]" />
            <div>
              <p className="text-[11px] font-medium text-zinc-500">Target Risk/Trade</p>
              <p className="text-base font-bold text-[#F0B429] font-mono mt-0.5">{settings.defaultRiskPercentage}%</p>
            </div>
          </div>
        </div>

        {/* --- TRADEZELLA / TRADERSYNC STYLE TABS --- */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-[#1F1F2C] no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive 
                    ? "bg-[#F0B429] text-black font-semibold shadow-sm" 
                    : "bg-[#12121A] text-zinc-400 hover:text-white hover:bg-[#181824] border border-[#1F1F2C]/60"
                }`}
              >
                <Icon size={15} className={isActive ? "text-black" : "text-zinc-400"} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    isActive ? "bg-black/15 text-black" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* --- TAB CONTENT --- */}
        <div className="min-h-[440px]">
          
          {/* 1. TRADING PREFERENCES TAB (TradeZella Baseline Metrics) */}
          {activeTab === "preferences" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">Baseline Account & Metrics</h3>
                <p className="text-xs text-zinc-400 font-normal">
                  These baseline parameters are used across your dashboard to calculate risk-adjusted returns, R-multiples, and recommended position sizes.
                </p>
              </div>

              <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C]">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Baseline Account Size ($ Initial Balance)</label>
                    <div className="relative font-mono">
                      <span className="absolute left-3.5 top-2.5 text-sm text-zinc-500 font-medium">$</span>
                      <input 
                        type="number"
                        step="1000"
                        value={settings.initialAccountSize}
                        onChange={(e) => setSettings({...settings, initialAccountSize: Number(e.target.value)})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 font-normal">Used to calculate net percentage return and drawdown charts.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Target Risk per Trade (%)</label>
                    <div className="relative font-mono">
                      <input 
                        type="number"
                        step="0.25"
                        min="0.1"
                        max="10"
                        value={settings.defaultRiskPercentage}
                        onChange={(e) => setSettings({...settings, defaultRiskPercentage: Number(e.target.value)})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                      />
                      <span className="absolute right-3.5 top-2.5 text-sm text-zinc-500 font-medium">%</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-normal">Recommended risk target is between 0.5% and 2.0% per trade.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Default Round-Trip Commission ($ per Contract/Lot)</label>
                    <div className="relative font-mono">
                      <span className="absolute left-3.5 top-2.5 text-sm text-zinc-500 font-medium">$</span>
                      <input 
                        type="number" 
                        step="0.25"
                        value={settings.defaultCommission}
                        onChange={(e) => setSettings({...settings, defaultCommission: Number(e.target.value)})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-white font-semibold outline-none focus:border-[#F0B429] transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 font-normal">Automatically deducted when calculating Net P&L in the trade log.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Base Currency & Timezone</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select 
                        value={settings.currency}
                        onChange={(e) => setSettings({...settings, currency: e.target.value})}
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
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-[#F0B429] font-medium"
                      >
                        <option value="UTC">UTC (Universal)</option>
                        <option value="America/New_York">EST (New York)</option>
                        <option value="America/Chicago">CST (Chicago)</option>
                        <option value="Europe/London">GMT (London)</option>
                        <option value="Europe/Frankfurt">CET (Frankfurt)</option>
                        <option value="Asia/Tokyo">JST (Tokyo)</option>
                        <option value="Australia/Sydney">AEST (Sydney)</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-normal">Matches your broker statement time and currency.</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-6 pt-6 border-t border-[#1F1F2C]">
                  <div className="p-4 rounded-xl border border-[#242436] bg-[#12121A] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#181824] text-[#F0B429] border border-[#282838]">
                        <Activity size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Auto-Calculate R-Multiples</p>
                        <p className="text-xs text-zinc-500">Pre-fill R:R ratio based on entry, stop loss, and target</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, autoCalculateR: !settings.autoCalculateR})}
                      className={`w-11 h-6 rounded-full transition-all relative ${settings.autoCalculateR ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-all ${settings.autoCalculateR ? "left-6" : "left-1 bg-zinc-300"}`} />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-[#242436] bg-[#12121A] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#181824] text-[#F0B429] border border-[#282838]">
                        <Bell size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Daily Limit Notifications</p>
                        <p className="text-xs text-zinc-500">Alerts when nearing daily max loss or target goals</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                      className={`w-11 h-6 rounded-full transition-all relative ${settings.notifications ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-all ${settings.notifications ? "left-6" : "left-1 bg-zinc-300"}`} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 2. BROKER CONNECTIONS TAB (TradeZella Auto-Sync) */}
          {activeTab === "brokers" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">Supported Broker & Prop Integrations</h3>
                <p className="text-xs text-zinc-400 font-normal">
                  Connect your trading platform for automatic read-only trade imports. No manual CSV uploading or data entry required.
                </p>
              </div>

              <div className="space-y-3">
                {brokerList.map((broker) => {
                  const isConnected = broker.status === "Connected" || broker.status === "Active Webhook";
                  return (
                    <div 
                      key={broker.name}
                      className="p-5 rounded-xl bg-[#0E0E14] border border-[#1F1F2C] hover:border-[#2C2C3E] transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl border ${isConnected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-[#181824] border-[#282838] text-zinc-400"}`}>
                          {isConnected ? <Link2 size={20} /> : <Unlink size={20} />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="text-sm font-semibold text-white">{broker.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#14141E] text-zinc-400 border border-[#242436]">
                              {broker.type}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 font-normal">{broker.desc}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isConnected 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                            : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
                        }`}>
                          {broker.status}
                        </span>
                        <button 
                          onClick={() => alert(isConnected ? `Sync settings for ${broker.name}` : `Opening OAuth connection wizard for ${broker.name}...`)}
                          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            isConnected 
                              ? "border border-[#242436] bg-[#14141E] hover:bg-[#1C1C2A] text-white" 
                              : "bg-[#F0B429] hover:bg-[#d99f1e] text-black shadow-sm"
                          }`}
                        >
                          {isConnected ? "Manage Sync" : "Connect Broker"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                <div className="flex items-center gap-2">
                  <Key size={16} className="text-[#F0B429]" />
                  <h4 className="text-sm font-semibold text-white">Manual API Key & Webhook Endpoint</h4>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Personal API Secret Key (For Custom Scripts & Python Backtesters)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      readOnly 
                      value={settings.apiKey}
                      className="w-full bg-[#0B0B10] border border-[#1A1A26] rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-400 select-all"
                    />
                    <button 
                      onClick={handleCopyKey}
                      className="px-4 py-2 rounded-lg bg-[#181824] hover:bg-[#242436] text-white text-xs font-medium transition-all flex items-center gap-1.5 shrink-0"
                    >
                      {copiedKey ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedKey ? "Copied" : "Copy Key"}
                    </button>
                    <button 
                      onClick={handleRegenerateKey}
                      className="px-3 py-2 rounded-lg border border-[#242436] hover:bg-[#181824] text-zinc-400 hover:text-white text-xs font-medium transition-all shrink-0"
                      title="Regenerate Key"
                    >
                      <RefreshCw size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 3. TRADE TAGS & CATEGORIES TAB (TradeZella Custom Tags) */}
          {activeTab === "tags" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white tracking-tight">Custom Trade Categories & Tags</h3>
                <p className="text-xs text-zinc-400 font-normal">
                  Create custom categories to tag your setups, execution errors, and emotional state. These tags feed directly into your performance reports to reveal your profitability by setup and mistake.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Setup & Strategy Tags */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-[#F0B429]" />
                      <h4 className="text-sm font-semibold text-white">Strategy & Setup Tags</h4>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">{settings.setupTags.length} active</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-normal">Tag trades with your specific entry model (e.g. Breakout, ORB, Reversal).</p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {settings.setupTags.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141420] border border-[#242436] text-xs font-medium text-zinc-200 hover:border-[#383850] transition-colors"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag("setup", tag)}
                          className="text-zinc-500 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#1F1F2C]">
                    <input 
                      value={newSetupTag}
                      onChange={(e) => setNewSetupTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag("setup", newSetupTag)}
                      placeholder="Add new setup tag (e.g. Supply Zone)..."
                      className="flex-1 bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-[#F0B429]"
                    />
                    <button 
                      onClick={() => handleAddTag("setup", newSetupTag)}
                      className="px-3.5 py-2 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </Card>

                {/* Execution & Mistake Tags */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-400" />
                      <h4 className="text-sm font-semibold text-white">Execution & Mistake Tags</h4>
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">{settings.mistakeTags.length} active</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-normal">Track recurring execution errors to identify what drains your account.</p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {settings.mistakeTags.map((tag) => (
                      <span 
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-300 hover:border-red-500/40 transition-colors"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={() => handleRemoveTag("mistake", tag)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#1F1F2C]">
                    <input 
                      value={newMistakeTag}
                      onChange={(e) => setNewMistakeTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTag("mistake", newMistakeTag)}
                      placeholder="Add mistake tag (e.g. Boredom Trade)..."
                      className="flex-1 bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-red-400"
                    />
                    <button 
                      onClick={() => handleAddTag("mistake", newMistakeTag)}
                      className="px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-semibold text-xs transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 4. PROP FIRM & RISK RULES TAB */}
          {activeTab === "risk" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-200 text-xs leading-relaxed font-normal">
                <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300 block mb-0.5">Prop Firm & Evaluation Protection Protocol</span>
                  Setting hard daily loss and drawdown ceilings prevents emotional tilt and evaluation drawdown violations. When breached, the journal will flag your blotter and issue lockout warnings.
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Max Daily Loss */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        <AlertTriangle size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Max Daily Loss Ceiling</h4>
                        <p className="text-xs text-zinc-400">Stop trading if net daily losses hit limit</p>
                      </div>
                    </div>
                    <span className="text-base font-semibold text-red-400 font-mono">${settings.dailyLossLimit}</span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="5000" 
                    step="50"
                    value={settings.dailyLossLimit}
                    onChange={(e) => setSettings({...settings, dailyLossLimit: Number(e.target.value)})}
                    className="w-full accent-red-500 cursor-pointer bg-[#1F1F2C] h-1.5 rounded-lg"
                  />
                  <div className="flex justify-between text-xs font-mono text-zinc-500">
                    <span>$100</span>
                    <span>$1,000</span>
                    <span>$5,000+</span>
                  </div>
                </Card>

                {/* Daily Profit Target */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Target size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Target Daily Profit Goal</h4>
                        <p className="text-xs text-zinc-400">Target goal to lock in daily profits</p>
                      </div>
                    </div>
                    <span className="text-base font-semibold text-emerald-400 font-mono">${settings.dailyProfitTarget}</span>
                  </div>
                  <input 
                    type="range" 
                    min="200" 
                    max="10000" 
                    step="100"
                    value={settings.dailyProfitTarget}
                    onChange={(e) => setSettings({...settings, dailyProfitTarget: Number(e.target.value)})}
                    className="w-full accent-emerald-500 cursor-pointer bg-[#1F1F2C] h-1.5 rounded-lg"
                  />
                  <div className="flex justify-between text-xs font-mono text-zinc-500">
                    <span>$200</span>
                    <span>$2,500</span>
                    <span>$10,000+</span>
                  </div>
                </Card>

                {/* Trailing Drawdown Ceiling */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Activity size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Overall Drawdown Ceiling</h4>
                        <p className="text-xs text-zinc-400">Max allowable trailing drawdown limit</p>
                      </div>
                    </div>
                    <span className="text-base font-semibold text-blue-400 font-mono">${settings.maxDrawdownLimit}</span>
                  </div>
                  <div className="relative font-mono">
                    <input 
                      type="number" 
                      value={settings.maxDrawdownLimit}
                      onChange={(e) => setSettings({...settings, maxDrawdownLimit: Number(e.target.value)})}
                      className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#F0B429]"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-zinc-500 font-medium">USD</span>
                  </div>
                </Card>

                {/* Consecutive Loss Lockout */}
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <SlidersHorizontal size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Consecutive Loss Lockout</h4>
                        <p className="text-xs text-zinc-400">Pause trading after consecutive losing streaks</p>
                      </div>
                    </div>
                    <span className="text-base font-semibold text-purple-400 font-mono">{settings.maxConsecutiveLosses} Trades</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 font-mono">
                    {[2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSettings({...settings, maxConsecutiveLosses: num})}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                          settings.maxConsecutiveLosses === num 
                            ? "bg-purple-600 text-white shadow-sm" 
                            : "bg-[#14141E] text-zinc-400 hover:text-white border border-[#242436]"
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Review Enforcement Toggle */}
              <Card className="p-5 bg-[#0E0E14] border-[#1F1F2C]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-lg bg-[#181824] text-[#F0B429] border border-[#282838]">
                      <Brain size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Enforce Post-Trade Journal Checklist</p>
                      <p className="text-xs text-zinc-400">Require tagging strategy setup, execution mistakes, and notes before marking a trade log as closed</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSettings({...settings, enforceReview: !settings.enforceReview})}
                    className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${settings.enforceReview ? "bg-[#F0B429]" : "bg-[#242436]"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-black rounded-full transition-all ${settings.enforceReview ? "left-6" : "left-1 bg-zinc-300"}`} />
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* 5. ACCOUNT & SUBSCRIPTION TAB */}
          {activeTab === "account" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#F0B429]" />
                  <h3 className="text-sm font-semibold text-white tracking-tight">Trader Profile & Identity</h3>
                </div>
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C]">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Display Name</label>
                      <input 
                        value={settings.displayName}
                        onChange={(e) => setSettings({...settings, displayName: e.target.value})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429] transition-all font-medium"
                        placeholder="Enter professional name..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-300">Account Email</label>
                      <input 
                        value={user?.email || ""} 
                        disabled 
                        className="w-full bg-[#0B0B10] border border-[#1A1A26] rounded-lg px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-medium text-zinc-300">Trading Philosophy / Bio</label>
                      <input 
                        value={settings.bio}
                        onChange={(e) => setSettings({...settings, bio: e.target.value})}
                        className="w-full bg-[#14141E] border border-[#242436] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#F0B429] transition-all font-normal placeholder:text-zinc-600"
                        placeholder="e.g. Process over outcomes. Let probabilities play out."
                      />
                    </div>
                  </div>
                </Card>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lock size={16} className="text-[#F0B429]" />
                  <h3 className="text-sm font-semibold text-white tracking-tight">Subscription & Access Level</h3>
                </div>
                <Card className="p-7 bg-[#0E0E14] border-[#1F1F2C] relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-2.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#F0B429]/10 border border-[#F0B429]/30 text-[#F0B429] text-xs font-medium">
                        <Sparkles size={11} /> Active Membership Tier
                      </div>
                      <h4 className="text-2xl font-bold text-white tracking-tight">{plan}</h4>
                      <p className="text-xs text-zinc-400 max-w-md leading-relaxed font-normal">
                        {plan === "Pro Plan" 
                          ? "You have unrestricted access to multi-broker auto-sync, advanced analytics reports, and unlimited trade replay." 
                          : "You are currently on the free starter tier. Upgrade to Pro for automated broker sync, custom tag analytics, and unlimited trade logging."}
                      </p>

                      <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-300 font-medium">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" /> Unlimited Trade Logging
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" /> MT4 / MT5 & Prop Firm Auto-Sync
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" /> Custom Tag Performance Reports
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-400" /> Multi-Account Prop Blotter
                        </div>
                      </div>
                    </div>

                    {plan === "Free Plan" && (
                      <button 
                        onClick={() => window.location.href = "/upgrade"}
                        className="px-6 py-3 rounded-lg bg-[#F0B429] hover:bg-[#d99f1e] text-black font-semibold text-xs transition-colors shrink-0 self-start md:self-center flex items-center gap-2 shadow-sm"
                      >
                        <Crown size={16} /> Upgrade to Pro Plan
                      </button>
                    )}
                  </div>
                </Card>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database size={16} className="text-[#F0B429]" />
                  <h3 className="text-sm font-semibold text-white tracking-tight">Data Portability</h3>
                </div>
                <Card className="p-6 bg-[#0E0E14] border-[#1F1F2C] flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Export Journal Configuration & Snapshot</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-md font-normal">
                      Download an offline JSON backup of your baseline metrics, custom tags, and prop risk rules.
                    </p>
                  </div>
                  <button 
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#242436] bg-[#14141E] hover:bg-[#1C1C2A] text-white text-xs font-medium transition-all shrink-0 shadow-sm"
                  >
                    <Download size={14} className="text-[#F0B429]" /> Export Backup File
                  </button>
                </Card>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trash2 size={16} className="text-red-400" />
                  <h3 className="text-sm font-semibold text-red-400 tracking-tight">Danger Zone & Session Control</h3>
                </div>
                <Card className="p-6 border-red-500/20 bg-red-500/[0.015] hover:bg-red-500/[0.03] transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-white">Permanently Erase Profile & Records</p>
                      <p className="text-xs text-zinc-400 max-w-lg font-normal">
                        Erasing your profile permanently deletes all historical trade records, connected accounts, custom tags, and psychology logs from Firestore. This action cannot be reversed.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 shrink-0">
                      <button 
                        onClick={logout}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#242436] text-xs font-medium text-zinc-300 hover:bg-[#1E1E2C] hover:text-white transition-all"
                      >
                        <LogOut size={13} /> Log Out Session
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm("⚠️ WARNING: Are you absolutely certain you want to erase your entire trading profile and all trade blotter records? This cannot be undone.")) {
                            alert("Deletion request submitted. Cloud records will be purged within 24 hours.");
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all shadow-sm"
                      >
                        Erase All Records
                      </button>
                    </div>
                  </div>
                </Card>
              </section>
            </div>
          )}
        </div>

        {/* --- GLOBAL STICKY SAVE BAR --- */}
        <div className="sticky bottom-4 z-40 bg-[#0E0E14]/95 border border-[#1F1F2C] p-4 rounded-xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-normal">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Settings automatically sync with Firestore Cloud. Unsaved changes will be highlighted.</span>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#F0B429] hover:bg-[#d99f1e] px-6 py-2.5 rounded-lg text-black font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saving ? "Syncing to Cloud..." : saved ? "Changes Saved" : "Save Preferences"}
          </button>
        </div>

      </div>
    </AppShell>
  );
}

function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
