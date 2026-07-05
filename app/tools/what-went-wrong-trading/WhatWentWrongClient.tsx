"use client";

import { useMemo, useState } from "react";
import { ToolShell } from "@/components/tools/ToolShell";
import { FieldLabel, NumberField, DirectionToggle } from "@/components/tools/inputs";
import type { Direction } from "@/lib/tools/calculations";

export default function WhatWentWrongClient() {
  const [direction, setDirection] = useState<Direction>("long");
  const [entry, setEntry] = useState("100");
  const [stop, setStop] = useState("95");
  const [exit, setExit] = useState("96");
  const [emotion, setEmotion] = useState("FOMO");
  const [notes, setNotes] = useState("Entered after missing the first move and moved stop early.");

  const review = useMemo(() => {
    const e = Number(entry), s = Number(stop), x = Number(exit);
    const risk = direction === "long" ? e - s : s - e;
    const result = direction === "long" ? x - e : e - x;
    const r = risk > 0 ? result / risk : 0;
    const text = `${emotion} ${notes}`.toLowerCase();
    const issues: string[] = [];
    if (r <= -1) issues.push("Full-risk loss: review whether invalidation was correct or entry was late.");
    if (r > -1 && r < 0) issues.push("Partial loss: exit management or stop movement may have reduced clarity.");
    if (text.includes("fomo") || text.includes("miss")) issues.push("FOMO likely affected entry timing.");
    if (text.includes("moved stop") || text.includes("stop")) issues.push("Stop-loss interference appears in your notes.");
    if (text.includes("revenge")) issues.push("Revenge trading risk detected.");
    if (!issues.length) issues.push("Main issue is not obvious. Add setup, session, screenshot, and rule checklist for deeper review.");
    return { r, issues, tags: issues.map((i) => i.split(":")[0].toLowerCase().replace(/\s+/g, "-")), action: "Before next session, write one rule that would have prevented this exact trade and grade it after the next 10 trades." };
  }, [direction, entry, stop, exit, emotion, notes]);

  return (
    <ToolShell eyebrow="Post-Trade Review" title="What Went Wrong With My Trade?" description="Turn a losing or messy trade into journal tags, likely mistakes, and one concrete improvement action." currentPath="/tools/what-went-wrong-trading">
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="profit-card p-6 lg:col-span-3">
          <div className="mb-5"><FieldLabel>Direction</FieldLabel><DirectionToggle value={direction} onChange={setDirection} /></div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div><FieldLabel>Entry</FieldLabel><NumberField value={entry} onChange={setEntry} /></div>
            <div><FieldLabel>Stop</FieldLabel><NumberField value={stop} onChange={setStop} /></div>
            <div><FieldLabel>Exit</FieldLabel><NumberField value={exit} onChange={setExit} /></div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div><FieldLabel>Emotion</FieldLabel><input value={emotion} onChange={(e) => setEmotion(e.target.value)} className="w-full rounded-xl border border-line bg-ink2 px-3.5 py-3 text-sm text-txt outline-none focus:border-gold/70" /></div>
            <div><FieldLabel>Trade Notes</FieldLabel><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[110px] w-full rounded-xl border border-line bg-ink2 px-3.5 py-3 text-sm text-txt outline-none focus:border-gold/70" /></div>
          </div>
        </section>
        <aside className="profit-card p-6 lg:col-span-2">
          <p className="font-mono2 text-xs uppercase tracking-widest text-gold">Review</p>
          <p className={`mt-3 font-mono2 text-4xl font-black ${review.r >= 0 ? "text-bull" : "text-bear"}`}>{review.r >= 0 ? "+" : ""}{review.r.toFixed(2)}R</p>
          <div className="mt-4 space-y-2">{review.issues.map((issue) => <p key={issue} className="rounded-xl border border-line bg-ink2/70 p-3 text-sm text-muted2">{issue}</p>)}</div>
          <p className="mt-4 rounded-xl border border-gold/25 bg-gold/10 p-3 text-sm leading-relaxed text-gold">{review.action}</p>
        </aside>
      </div>
    </ToolShell>
  );
}
