"use client";

import type { ReactNode } from "react";
import {
  ACCOUNT_CURRENCIES,
  CATEGORY_LABELS,
  INSTRUMENTS,
  type InstrumentCategory,
} from "@/lib/tools/instruments";

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted2">{children}</label>
      {hint ? <span className="font-mono2 text-[11px] text-dim">{hint}</span> : null}
    </div>
  );
}

export function NumberField({
  value,
  onChange,
  placeholder,
  step,
  min,
  suffix,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
  suffix?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <input
        aria-label={ariaLabel}
        type="number"
        inputMode="decimal"
        value={value}
        step={step}
        min={min}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line bg-ink2 px-3.5 py-3 text-sm text-txt outline-none transition-colors placeholder:text-dim focus:border-gold/70 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-mono2 text-xs text-dim">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function InstrumentSelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (value: string) => void;
  categories?: InstrumentCategory[];
}) {
  const instruments = categories
    ? INSTRUMENTS.filter((instrument) => categories.includes(instrument.category))
    : INSTRUMENTS;
  const groups = Array.from(new Set(instruments.map((instrument) => instrument.category)));

  return (
    <select
      aria-label="Instrument"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-line bg-ink2 px-3.5 py-3 text-sm text-txt outline-none transition-colors focus:border-gold/70"
    >
      {groups.map((group) => (
        <optgroup key={group} label={CATEGORY_LABELS[group]}>
          {instruments
            .filter((instrument) => instrument.category === group)
            .map((instrument) => (
              <option key={instrument.symbol} value={instrument.symbol}>
                {instrument.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

export function CurrencySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      aria-label="Account currency"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-line bg-ink2 px-3.5 py-3 text-sm text-txt outline-none transition-colors focus:border-gold/70"
    >
      {ACCOUNT_CURRENCIES.map((currency) => (
        <option key={currency} value={currency}>
          {currency}
        </option>
      ))}
    </select>
  );
}

export function DirectionToggle({
  value,
  onChange,
}: {
  value: "long" | "short";
  onChange: (value: "long" | "short") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Trade direction">
      <button
        type="button"
        onClick={() => onChange("long")}
        className={`rounded-xl border px-3.5 py-3 text-sm font-bold transition-colors ${
          value === "long"
            ? "border-bull/60 bg-bull/10 text-bull"
            : "border-line text-muted2 hover:border-gold/40 hover:text-txt"
        }`}
      >
        Long / Buy
      </button>
      <button
        type="button"
        onClick={() => onChange("short")}
        className={`rounded-xl border px-3.5 py-3 text-sm font-bold transition-colors ${
          value === "short"
            ? "border-bear/60 bg-bear/10 text-bear"
            : "border-line text-muted2 hover:border-gold/40 hover:text-txt"
        }`}
      >
        Short / Sell
      </button>
    </div>
  );
}

export function ResultRow({
  label,
  value,
  emphasis = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "bull" | "bear" | "gold" | "neutral";
}) {
  const toneClass =
    tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : tone === "gold" ? "text-gold" : "text-txt";

  return (
    <div className="flex items-center justify-between gap-5 border-b border-line/60 py-3 last:border-b-0">
      <span className="text-sm text-muted2">{label}</span>
      <span className={`text-right font-mono2 ${emphasis ? "text-xl font-bold" : "text-sm font-semibold"} ${toneClass}`}>
        {value}
      </span>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-xl border border-bear/30 bg-bear/10 px-4 py-3 text-sm text-bear">{message}</div>;
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-line/60 bg-ink2/70 px-3.5 py-2.5 text-xs leading-relaxed text-dim">
      {children}
    </p>
  );
}

export function RateInput({
  from,
  to,
  rate,
  onChange,
  loading,
  isLive,
}: {
  from: string;
  to: string;
  rate: number;
  onChange: (value: number) => void;
  loading: boolean;
  isLive: boolean;
}) {
  return (
    <div>
      <FieldLabel hint={loading ? "fetching…" : isLive ? "live" : "manual"}>
        {from} → {to} rate
      </FieldLabel>
      <NumberField
        value={String(rate)}
        onChange={(value) => onChange(Number.parseFloat(value) || 0)}
        step="0.00001"
        min="0"
        ariaLabel={`${from} to ${to} conversion rate`}
      />
    </div>
  );
}
