"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  return new Ctx();
}

function resume(ctx: AudioContext) {
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}

function tone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.08
) {
  resume(ctx);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function twoTone(
  ctx: AudioContext,
  f1: number,
  f2: number,
  dur1: number,
  dur2: number,
  gap: number,
  type: OscillatorType = "sine",
  gain = 0.08
) {
  resume(ctx);
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const g1 = ctx.createGain();
  osc1.type = type;
  osc1.frequency.setValueAtTime(f1, now);
  g1.gain.setValueAtTime(gain, now);
  g1.gain.exponentialRampToValueAtTime(0.001, now + dur1);
  osc1.connect(g1);
  g1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + dur1);

  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = type;
  osc2.frequency.setValueAtTime(f2, now + gap);
  g2.gain.setValueAtTime(gain, now + gap);
  g2.gain.exponentialRampToValueAtTime(0.001, now + gap + dur2);
  osc2.connect(g2);
  g2.connect(ctx.destination);
  osc2.start(now + gap);
  osc2.stop(now + gap + dur2);
}

export function useSoundEffects() {
  const { soundEffects } = useAuth();
  const ctxRef = useRef<AudioContext | null>(null);

  const ctx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = getAudioContext();
    }
    return ctxRef.current;
  }, []);

  const playSuccess = useCallback(() => {
    if (!soundEffects) return;
    const c = ctx();
    if (!c) return;
    twoTone(c, 523.25, 783.99, 0.18, 0.22, 0.08, "sine", 0.1);
  }, [soundEffects, ctx]);

  const playError = useCallback(() => {
    if (!soundEffects) return;
    const c = ctx();
    if (!c) return;
    twoTone(c, 200, 150, 0.2, 0.25, 0.1, "triangle", 0.1);
  }, [soundEffects, ctx]);

  const playSend = useCallback(() => {
    if (!soundEffects) return;
    const c = ctx();
    if (!c) return;
    tone(c, 880, 0.08, "sine", 0.06);
  }, [soundEffects, ctx]);

  const playReceive = useCallback(() => {
    if (!soundEffects) return;
    const c = ctx();
    if (!c) return;
    tone(c, 660, 0.14, "sine", 0.08);
  }, [soundEffects, ctx]);

  const playClick = useCallback(() => {
    if (!soundEffects) return;
    const c = ctx();
    if (!c) return;
    tone(c, 1200, 0.04, "sine", 0.04);
  }, [soundEffects, ctx]);

  return { playSuccess, playError, playSend, playReceive, playClick };
}
