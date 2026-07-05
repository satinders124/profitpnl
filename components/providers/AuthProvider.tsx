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
  const [loading, setLoading] = useState(true);

  const fetchPlanData = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("plan, plan_source, trial_ends_at, has_used_trial, display_name")
        .eq("id", uid)
        .single();

      if (data) {
        setPlan(data.plan || "Free Plan");
        setPlanSource(data.plan_source || "");
        setHasUsedTrial(!!data.has_used_trial);
        setDisplayName(data.display_name || "");

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

  const refreshPlan = useCallback(async () => {
    if (user) {
      await fetchPlanData(user.id);
    }
  }, [user, fetchPlanData]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchPlanData(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          fetchPlanData(session.user.id);
        } else {
          setUser(null);
          setPlan("Free Plan");
          setPlanSource("");
          setTrialEndsAtMs(null);
          setHasUsedTrial(false);
          setDisplayName("");
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchPlanData]);

  const value = useMemo(
    () => ({
      user,
      plan,
      planSource,
      trialEndsAtMs,
      hasUsedTrial,
      displayName,
      loading,
      logout: async () => {
        await supabase.auth.signOut();
      },
      refreshPlan,
    }),
    [user, plan, planSource, trialEndsAtMs, hasUsedTrial, displayName, loading, refreshPlan, supabase]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
