"use client";

import { useEffect, useRef, useCallback } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      ready: (callback: () => void) => void;
    };
    __turnstileScriptLoading?: boolean;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

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

  useEffect(() => {
    // Load script once globally
    if (!document.getElementById(SCRIPT_ID)) {
      if (!window.__turnstileScriptLoading) {
        window.__turnstileScriptLoading = true;
        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }

    // Wait for turnstile to be ready, then render
    function tryRender() {
      if (window.turnstile?.ready) {
        window.turnstile.ready(() => renderWidget());
      } else {
        // Script not loaded yet, retry
        setTimeout(tryRender, 200);
      }
    }

    tryRender();

    // Cleanup on unmount
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
        widgetIdRef.current = null;
      }
      renderedRef.current = false;
    };
  }, [renderWidget]);

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
