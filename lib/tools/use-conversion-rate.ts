"use client";

/* eslint-disable react-hooks/set-state-in-effect -- this hook intentionally syncs async FX-rate state when the currency pair changes. */
import { useEffect, useState } from "react";
import { getConversionRate } from "./fx-rates";

export type ConversionRateState = {
  rate: number;
  setRate: (rate: number) => void;
  loading: boolean;
  isLive: boolean;
  error: string | null;
};

/**
 * Best-effort live currency conversion for public calculators.
 * If the provider is unavailable, the calculator remains usable because users
 * can type the conversion rate manually.
 */
export function useConversionRate(from: string, to: string): ConversionRateState {
  const [rate, setRate] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (from === to) {
      setRate(1);
      setLoading(false);
      setIsLive(true);
      setError(null);
      return;
    }

    setLoading(true);
    setIsLive(false);
    setError(null);

    getConversionRate(from, to)
      .then((nextRate) => {
        if (!cancelled) {
          setRate(nextRate);
          setIsLive(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Live rate unavailable — enter the conversion rate manually.");
          setIsLive(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return { rate, setRate, loading, isLive, error };
}
