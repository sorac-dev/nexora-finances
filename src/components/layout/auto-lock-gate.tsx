"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { PinModal } from "@/src/components/ui/pin-modal";

const STORAGE_KEY = "nexora-lock-timestamp";

export function AutoLockGate({ children }: { children: React.ReactNode }) {
  const [showLock, setShowLock] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(-1);
  const [checked, setChecked] = useState(false);
  const unlockedRef = useRef(false); // prevent re-lock after successful PIN

  // Load lock config on mount
  useEffect(() => {
    fetch("/api/user/security/pin")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setHasPin(d.hasPin);
          setLockTimeout(d.lockTimeout ?? -1);
        }
      })
      .finally(() => setChecked(true));
  }, []);

  // On mount: check if we need to lock
  useEffect(() => {
    if (!checked || !hasPin || lockTimeout < 0) return;

    const now = Date.now();
    const lastHidden = localStorage.getItem(STORAGE_KEY);

    if (lockTimeout === 0) {
      // "Enseguida" — always lock on every app open
      if (!unlockedRef.current) {
        setShowLock(true);
      }
      return;
    }

    if (lastHidden) {
      const elapsed = (now - parseInt(lastHidden)) / 1000 / 60;
      if (elapsed >= lockTimeout) {
        setShowLock(true);
        return;
      }
    }

    // Save current timestamp for future checks
    localStorage.setItem(STORAGE_KEY, String(now));
  }, [checked, hasPin, lockTimeout]);

  // Track visibility changes (switch tabs, minimize, lock phone)
  useEffect(() => {
    if (!checked || !hasPin || lockTimeout < 0) return;

    function handleVisibility() {
      if (document.hidden) {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      } else {
        const lastHidden = localStorage.getItem(STORAGE_KEY);
        if (lastHidden) {
          const elapsed = (Date.now() - parseInt(lastHidden)) / 1000 / 60;
          if (elapsed >= lockTimeout) {
            setShowLock(true);
          }
        }
      }
    }

    // Also track beforeunload to catch tab close
    function handleBeforeUnload() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [checked, hasPin, lockTimeout]);

  // Verify PIN
  const handleVerify = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const r = await fetch("/api/user/security/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await r.json().catch(() => ({}));

      // Brute-force lockout — force logout
      if (r.status === 423 && d.forceLogout) {
        setShowLock(false);
        localStorage.removeItem(STORAGE_KEY);
        window.location.assign("/login");
        return false;
      }

      if (d.valid) {
        unlockedRef.current = true;
        setShowLock(false);
        localStorage.removeItem(STORAGE_KEY);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Still loading config — show nothing
  if (!checked) return null;

  // Lock is active — render ONLY the PIN modal, NOTHING else. No children.
  // If someone inspects the DOM, all they'll see is this modal.
  if (showLock) {
    return (
      <PinModal
        open={true}
        onClose={() => {}}
        title="Bloqueo de seguridad"
        subtitle="Ingresa tu PIN para continuar"
        onVerify={handleVerify}
      />
    );
  }

  // No lock — render app normally
  return <>{children}</>;
}
