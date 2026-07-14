"use client";

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";

type AuthContextValue = {
  user: User | null;
  plan: string;
  planSource: string;
  trialEndsAtMs: number | null;
  hasUsedTrial: boolean;
  displayName: string;
  soundEffects: boolean;
  isAffiliate: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshPlan: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  plan: "Free Plan",
  planSource: "",
  trialEndsAtMs: null,
  hasUsedTrial: false,
  displayName: "",
  soundEffects: true,
  isAffiliate: false,
  loading: true,
  logout: async () => {},
  refreshPlan: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState("Free Plan");
  const [planSource, setPlanSource] = useState("");
  const [trialEndsAtMs, setTrialEndsAtMs] = useState<number | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [soundEffects, setSoundEffects] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPlanData = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("plan, plan_source, trial_ends_at, has_used_trial, display_name, sound_effects")
        .eq("id", uid)
        .single();

      if (data) {
        setPlan(data.plan || "Free Plan");
        setPlanSource(data.plan_source || "");
        setHasUsedTrial(!!data.has_used_trial);
        setDisplayName(data.display_name || "");
        setSoundEffects(data.sound_effects !== false);

        if (data.trial_ends_at) {
          setTrialEndsAtMs(new Date(data.trial_ends_at).getTime());
        } else {
          setTrialEndsAtMs(null);
        }
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
    }
  }, [supabase]);

  const fetchAffiliateFlag = useCallback(async (uid: string, email?: string | null) => {
    try {
      const { data: byUserId } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", uid)
        .maybeSingle();

      if (byUserId?.id) {
        setIsAffiliate(true);
        return;
      }

      if (email) {
        const { data: byEmail } = await supabase
          .from("affiliates")
          .select("id")
          .ilike("email", email)
          .maybeSingle();
        setIsAffiliate(!!byEmail?.id);
      } else {
        setIsAffiliate(false);
      }
    } catch {
      setIsAffiliate(false);
    }
  }, [supabase]);

  const refreshPlan = useCallback(async () => {
    if (user) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ uid: user.id }),
        });
        const data = await res.json();
        if (data && data.plan === "Pro Plan" && data.planSource === "paid") {
          setPlan("Pro Plan");
          setPlanSource("paid");
        }
      } catch {
        // ignore verify errors during refresh
      }
      await fetchPlanData(user.id);
    }
  }, [user, fetchPlanData, supabase]);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const params = new URLSearchParams(window.location.search);
    const upgrade = params.get("upgrade");
    const sessionId = params.get("session_id");

    if (upgrade === "success" || sessionId) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch("/api/payments/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ session_id: sessionId, uid: user.id }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data && (data.success || data.plan === "Pro Plan")) {
              setPlan("Pro Plan");
              setPlanSource("paid");
              fetchPlanData(user.id);
            }
          })
          .catch((e) => console.error("Verify payment error:", e));
      });
    }
  }, [user, fetchPlanData, supabase]);

  useEffect(() => {
    // If user landed on homepage or any other page with a Supabase password recovery hash/query, route to /reset-password
    if (typeof window !== "undefined") {
      const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
      if (isRecovery && window.location.pathname !== "/reset-password") {
        window.location.href = `/reset-password${window.location.hash || window.location.search}`;
        return;
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchPlanData(session.user.id);
        fetchAffiliateFlag(session.user.id, session.user.email);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && typeof window !== "undefined" && window.location.pathname !== "/reset-password") {
          window.location.href = `/reset-password${window.location.hash || window.location.search}`;
          return;
        }

        // Fix auto-logout bug when tab switches, focus triggers or PWA background refreshes:
        // COMMUNITY BUG: Supabase onAuthStateChange triggers on window/tab refocus with events like INITIAL_SESSION
        // with empty/null session temporarily before recovering, or triggers invalid SIGNED_OUT events.
        // We only clean the user session if the event is explicitly SIGNED_OUT.
        if (event === "SIGNED_OUT") {
          setUser(null);
          setPlan("Free Plan");
          setPlanSource("");
          setTrialEndsAtMs(null);
          setHasUsedTrial(false);
          setDisplayName("");
          setSoundEffects(true);
          setIsAffiliate(false);
        } else if (session?.user) {
          setUser(session.user);
          fetchPlanData(session.user.id);
          fetchAffiliateFlag(session.user.id, session.user.email);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchPlanData, fetchAffiliateFlag]);

  const value = useMemo(
    () => ({
      user,
      plan,
      planSource,
      trialEndsAtMs,
      hasUsedTrial,
      displayName,
      soundEffects,
      isAffiliate,
      loading,
      logout: async () => {
        await supabase.auth.signOut();
      },
      refreshPlan,
    }),
    [user, plan, planSource, trialEndsAtMs, hasUsedTrial, displayName, soundEffects, isAffiliate, loading, refreshPlan, supabase]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
