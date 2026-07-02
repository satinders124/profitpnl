"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/components/providers/AuthProvider";
import { db } from "@/lib/firebase-client";
import { doc, updateDoc, getDoc } from "firebase/firestore";
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
  ChevronRight
} from "lucide-react";

export default function SettingsPage() {
  const { user, plan, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    displayName: "",
    currency: "USD",
    notifications: true,
    timezone: "UTC",
  });

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSettings({
            displayName: data.displayName || "",
            currency: data.currency || "USD",
            notifications: data.notifications !== undefined ? data.notifications : true,
            timezone: data.timezone || "UTC",
          });
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
      await updateDoc(doc(db, "users", user.uid), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-zinc-500">Loading Command Center...</div>;

  // Get initials for the avatar (e.g., "John Doe" -> "JD")
  const initials = settings.displayName 
    ? settings.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "TR";

  return (
    <AppShell title="Settings" subtitle="Configure your trading engine and profile">
      <div className="max-w-4xl mx-auto w-full space-y-10 py-8 px-4">
        
        {/* PREMIUM PROFILE HEADER */}
        <div className="relative p-8 rounded-[2.5rem] bg-gradient-to-br from-[#161628] to-[#0D0D1A] border border-[#1E1E38] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F0B429]/5 blur-[100px] rounded-full" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gold-gradient flex items-center justify-center text-black text-3xl font-black shadow-[0_0_20px_rgba(240,180,41,0.4)]">
                {initials}
              </div>
              <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-[#0D0D1A] border border-[#F0B429] text-[#F0B429]">
                <CheckCircle2 size={14} />
              </div>
            </div>

            <div className="text-center md:text-left space-y-1">
              <h2 className="text-3xl font-black text-white tracking-tight">
                {settings.displayName || "Elite Trader"}
              </h2>
              <p className="text-sm text-[#5A5A80] font-medium flex items-center justify-center md:justify-start gap-2">
                <User size={14} /> {user?.email}
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  plan === "Pro Plan" ? "bg-[#F0B429]/10 border-[#F0B429]/30 text-[#F0B429]" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                }`}>
                  {plan}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8">
          {/* SECTION 1: PROFILE SETTINGS */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <SettingsIcon size={18} className="text-[#F0B429]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Account Customization</h3>
            </div>
            <Card className="p-6 bg-[#0D0D1A]/60 border-[#1E1E38] backdrop-blur-xl">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[#5A5A80] ml-1">Display Name</label>
                  <input 
                    value={settings.displayName}
                    onChange={(e) => setSettings({...settings, displayName: e.target.value})}
                    className="w-full bg-[#111120] border border-[#1E1E38] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429] transition-all"
                    placeholder="Enter your professional name..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[#5A5A80] ml-1">Account Email</label>
                  <input 
                    value={user?.email || ""} 
                    disabled 
                    className="w-full bg-[#0D0D1A] border border-[#1E1E38] rounded-xl px-4 py-3 text-sm text-[#5A5A80] cursor-not-allowed"
                  />
                </div>
              </div>
            </Card>
          </section>

          {/* SECTION 2: ENGINE PREFERENCES */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Globe size={18} className="text-[#F0B429]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Engine Preferences</h3>
            </div>
            <Card className="p-6 bg-[#0D0D1A]/60 border-[#1E1E38] backdrop-blur-xl">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[#5A5A80] ml-1">Preferred Currency</label>
                  <select 
                    value={settings.currency}
                    onChange={(e) => setSettings({...settings, currency: e.target.value})}
                    className="w-full bg-[#111120] border border-[#1E1E38] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429]"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-[#5A5A80] ml-1">Timezone</label>
                  <input 
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                    className="w-full bg-[#111120] border border-[#1E1E38] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-[#F0B429]"
                    placeholder="e.g. UTC+10"
                  />
                </div>
              </div>

              <div className="mt-6 p-4 rounded-2xl border border-[#1E1E38] bg-[#111120] flex items-center justify-between transition-all hover:border-[#F0B429]/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#1E1E38] text-[#A0A0C0]">
                    <Bell size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Engine Notifications</p>
                    <p className="text-[10px] text-[#5A5A80]">Alerts on drawdown and target hits</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSettings({...settings, notifications: !settings.notifications})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.notifications ? "bg-[#F0B429]" : "bg-[#1E1E38]"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notifications ? "left-7" : "left-1"}`} />
                </button>
              </div>
            </Card>
          </section>

          {/* SECTION 3: SUBSCRIPTION */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Lock size={18} className="text-[#F0B429]" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Membership</h3>
            </div>
            <Card className="p-6 bg-gradient-to-br from-[#161628] to-[#0D0D1A] border-[#F0B429]/30 relative overflow-hidden shadow-lg">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Crown size={80} className="text-[#F0B429]" />
               </div>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                 <div>
                   <p className="text-xs font-bold text-[#5A5A80] uppercase tracking-widest">Current Tier</p>
                   <h4 className="text-2xl font-black text-white">{plan}</h4>
                   <p className="text-sm text-[#A0A0C0] mt-1">
                     {plan === "Pro Plan" ? "Full elite access enabled." : "Limited free tier active."}
                   </p>
                 </div>
                 {plan === "Free Plan" && (
                   <button 
                    onClick={() => window.location.href = "/upgrade"}
                    className="gold-gradient px-6 py-3 rounded-xl text-black font-black text-sm transition-transform active:scale-95 shadow-lg"
                   >
                     Upgrade to Pro
                   </button>
                 )}
               </div>
            </Card>
          </section>

          {/* SECTION 4: DANGER ZONE */}
          <section className="space-y-4 pb-12">
            <div className="flex items-center gap-2 px-2">
              <Trash2 size={18} className="text-red-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-red-400">Danger Zone</h3>
            </div>
            <Card className="p-6 border-red-400/20 bg-red-400/[0.02] hover:bg-red-400/[0.05] transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Delete Profile</p>
                  <p className="text-xs text-zinc-500">Permanently erase all trade logs, accounts, and psychology entries.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1E1E38] text-xs font-bold text-[#A0A0C0] hover:bg-[#1E1E38]/30 transition-all"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm("Are you absolutely sure? This cannot be undone.")) {
                        alert("Account deletion requested.");
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Delete Everything
                  </button>
                </div>
              </div>
            </Card>
          </section>
        </div>

        <div className="flex justify-center md:justify-end py-6">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 gold-gradient px-10 py-4 rounded-2xl text-black font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_25px_rgba(240,180,41,0.3)]"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
            {saving ? "Syncing..." : saved ? "Settings Saved!" : "Save Changes"}
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