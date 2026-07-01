"use client";

import { ProtectedRoute } from "@/components/providers/ProtectedRoute";
import { useAuth } from "@/components/providers/AuthProvider";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#080810] p-5 text-[#F0F0FF]">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between border-b border-[#1E1E38] pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em]">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-[#5A5A80]">
                Logged in as {user?.email}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-xl border border-[#1E1E38] px-4 py-2 text-sm font-bold text-[#A0A0C0]"
            >
              Logout
            </button>
          </div>

          <div className="profit-card mt-6 p-6">
            <div className="text-lg font-black">ProfitPnL Next.js app ready ✅</div>
            <p className="mt-2 text-sm leading-7 text-[#A0A0C0]">
              Firebase Auth foundation is ready. Next we’ll add the real app
              shell, sidebar, mobile nav, Firestore data layer, and migrate your
              Dashboard.
            </p>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}