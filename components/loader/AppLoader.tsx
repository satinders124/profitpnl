"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/loader/Loader";

const SESSION_KEY = "ppnl_loader_played";

/**
 * Wraps the whole app and shows the animated Loader once per browser
 * session — the first time someone lands on the site — then reveals the
 * real app underneath. Subsequent navigation within the same session
 * (tab left open) won't replay it; closing the tab and coming back
 * (new session) will show it again.
 */
export function AppLoader({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let alreadyPlayed = false;

    try {
      alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage unavailable (privacy mode, etc.) — just show it once.
    }

    setVisible(!alreadyPlayed);
  }, []);

  function handleDone() {
    setVisible(false);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore
    }
  }

  // Avoid a flash of real content on the very first server-rendered paint,
  // before we know whether the loader should show.
  if (visible === null) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <>
      {visible && <Loader onDone={handleDone} />}
      {children}
    </>
  );
}
