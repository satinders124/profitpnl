"use client";

import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";

type AuthContextValue = {
  user: User | null;
  plan: string;              // "Free Plan" or "Pro Plan"
  planSource: string;         // "free" | "trial" | "paid" | ""
  trialEndsAtMs: number | null;
  hasUsedTrial: boolean;
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
  loading: true,
  logout: async () => {},
  refreshPlan: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState("Free Plan");
  const [planSource, setPlanSource] = useState("");
  const [trialEndsAtMs, setTrialEndsAtMs] = useState<number | null>(null);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [loading, setLoading] = useState(true);

  /**
   * Fetches the user's subscription fields from Firestore and updates state.
   * Called on login and can be called manually (e.g. after starting a trial
   * or completing a Stripe checkout) so the UI reflects the new plan
   * without requiring a full page reload.
   */
  const fetchPlanData = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setPlan(data.plan || "Free Plan");
        setPlanSource(data.planSource || "");
        setHasUsedTrial(!!data.hasUsedTrial);

        // trialEndsAt is a Firestore Timestamp — extract milliseconds
        const trialTs = data.trialEndsAt;
        if (trialTs && typeof trialTs.toMillis === "function") {
          setTrialEndsAtMs(trialTs.toMillis());
        } else if (typeof trialTs === "number") {
          setTrialEndsAtMs(trialTs);
        } else {
          setTrialEndsAtMs(null);
        }
      } else {
        setPlan("Free Plan");
        setPlanSource("");
        setTrialEndsAtMs(null);
        setHasUsedTrial(false);
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
      setPlan("Free Plan");
      setPlanSource("");
      setTrialEndsAtMs(null);
      setHasUsedTrial(false);
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    if (user) {
      await fetchPlanData(user.uid);
    }
  }, [user, fetchPlanData]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchPlanData(firebaseUser.uid);
      } else {
        setUser(null);
        setPlan("Free Plan");
        setPlanSource("");
        setTrialEndsAtMs(null);
        setHasUsedTrial(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [fetchPlanData]);

  const value = useMemo(
    () => ({
      user,
      plan,
      planSource,
      trialEndsAtMs,
      hasUsedTrial,
      loading,
      logout: async () => {
        await signOut(auth);
      },
      refreshPlan,
    }),
    [user, plan, planSource, trialEndsAtMs, hasUsedTrial, loading, refreshPlan]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
