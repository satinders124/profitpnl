"use client";

import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase-client";
import { doc, getDoc } from "firebase/firestore";

type AuthContextValue = {
  user: User | null;
  plan: string; // "Free Plan" or "Pro Plan"
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  plan: "Free Plan",
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState("Free Plan");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Fetch the current plan from the users collection
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setPlan(userDoc.data().plan || "Free Plan");
          } else {
            setPlan("Free Plan");
          }
        } catch (error) {
          console.error("Error fetching plan:", error);
          setPlan("Free Plan");
        }
      } else {
        setUser(null);
        setPlan("Free Plan");
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    plan,
    loading,
    logout: async () => { await signOut(auth); },
  }), [user, plan, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}