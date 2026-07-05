"use client";

import { useEffect, useRef, useCallback, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      ready?: (callback: () => void) => void;
    };
    __turnstileScriptLoading?: boolean;
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
}

export function Turnstile({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = "dark",
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Use refs for callbacks to avoid re-rendering the widget
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    if (!container || !window.turnstile || renderedRef.current) return;

    // Prevent duplicate widgets
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {}
      widgetIdRef.current = null;
    }

    renderedRef.current = true;

    widgetIdRef.current = window.turnstile.render(container, {
      sitekey: siteKey,
      callback: (token: string) => onVerifyRef.current(token),
      "error-callback": () => {
        onErrorRef.current?.();
        renderedRef.current = false;
      },
      "expired-callback": () => {
        onExpireRef.current?.();
        renderedRef.current = false;
        // Auto-reset
        if (widgetIdRef.current) {
          try {
            window.turnstile?.reset(widgetIdRef.current);
          } catch {}
        }
      },
      theme,
      size: "normal",
      retry: "auto",
      "refresh-expired": "auto",
    });
  }, [siteKey, theme]);

  // Only render on client — prevents SSR/hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Load script once globally
    if (!document.getElementById(SCRIPT_ID)) {
      if (!window.__turnstileScriptLoading) {
        window.__turnstileScriptLoading = true;
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = SCRIPT_SRC;
        // NOTE: Do NOT set async/defer on dynamically injected scripts.
        // Cloudflare forbids using turnstile.ready() with async/defer,
        // and dynamically created scripts are already non-blocking.
        document.head.appendChild(script);
      }
    }

    // Poll for turnstile to be available, then render.
    // We intentionally do NOT use turnstile.ready() because it conflicts
    // with dynamically loaded scripts and throws runtime errors.
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current) {
        clearInterval(interval);
        renderWidget();
      } else if (++attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("[Turnstile] Script failed to load within 5 seconds");
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
      renderedRef.current = false;
    };
  }, [mounted, renderWidget]);

  // Render a placeholder during SSR to avoid layout shift
  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          minHeight: 65,
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        justifyContent: "center",
        minHeight: 65,
      }}
    />
  );
}
