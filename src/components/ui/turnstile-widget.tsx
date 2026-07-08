"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, opts: {
        sitekey: string;
        callback?: (token: string) => void;
        "error-callback"?: () => void;
        "expired-callback"?: () => void;
        theme?: string;
        size?: string;
      }) => string;
      reset: (id: string) => void;
    };
    onLoadTurnstile?: () => void;
  }
}

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY || "1x00000000000000000000AA";

export function TurnstileWidget({ onVerify, onError, onExpire }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string>("");
  const [loaded, setLoaded] = useState(false);
  const renderedRef = useRef(false);
  // Store callbacks in refs to avoid re-rendering the widget
  const onVerifyRef = useRef(onVerify);
  const onErrorRef = useRef(onError);
  const onExpireRef = useRef(onExpire);
  onVerifyRef.current = onVerify;
  onErrorRef.current = onError;
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (window.turnstile) { setLoaded(true); return; }

    const scriptId = "turnstile-script";
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if (window.turnstile) { setLoaded(true); clearInterval(check); }
      }, 200);
      return () => clearInterval(check);
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Render widget ONCE — callbacks live in refs so they never go stale
  useEffect(() => {
    if (!loaded || !containerRef.current || renderedRef.current) return;

    try {
      renderedRef.current = true;
      widgetId.current = window.turnstile!.render(containerRef.current, {
        sitekey: SITEKEY,
        callback: (token: string) => onVerifyRef.current(token),
        "error-callback": () => onErrorRef.current?.(),
        "expired-callback": () => {
          if (widgetId.current) {
            window.turnstile?.reset(widgetId.current);
            renderedRef.current = true; // stay rendered after reset
          }
          onExpireRef.current?.();
        },
        theme: "dark",
        size: "normal",
      });
    } catch { /* ignore */ }

    return () => {
      if (widgetId.current) {
        try { renderedRef.current = false; window.turnstile?.reset(widgetId.current); } catch {}
      }
    };
  }, [loaded]); // ONLY re-render if `loaded` changes — never on callback changes

  return (
    <div style={{ marginBottom: 14, display: "flex", justifyContent: "center" }}>
      <div ref={containerRef} />
      {!loaded && (
        <div style={{
          height: 65, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text-faint)", fontSize: 13, gap: 8,
        }}>
          <div className="spinner" style={{ width: 16, height: 16 }} />
          Cargando verificación...
        </div>
      )}
    </div>
  );
}
