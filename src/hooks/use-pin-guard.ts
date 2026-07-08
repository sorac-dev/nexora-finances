"use client";

import { useState, useCallback } from "react";

/**
 * Hook that guards a protected action with PIN verification.
 *
 * Usage:
 *   const { guardWithPin, pinModalProps } = usePinGuard();
 *   await guardWithPin(async () => { deleteSomething(); });
 *   <PinModal {...pinModalProps} />
 */
export function usePinGuard() {
  const [showPin, setShowPin] = useState(false);
  const [pinTitle, setPinTitle] = useState("");
  const [pinSubtitle, setPinSubtitle] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [checkingPin, setCheckingPin] = useState(false);

  /** Check if user has PIN. If yes, show modal. If no, execute action directly. */
  const guardWithPin = useCallback(
    async (action: () => void | Promise<void>, title = "Verificación de seguridad", subtitle = "Ingresa tu PIN de 4 dígitos para continuar") => {
      // Prevent double triggers
      if (checkingPin) return;
      setCheckingPin(true);

      try {
        const r = await fetch("/api/user/security/pin");
        if (!r.ok) {
          // If we can't check, allow the action (fail open)
          await action();
          return;
        }
        const { hasPin } = await r.json();

        if (!hasPin) {
          // No PIN configured → execute directly
          await action();
          return;
        }

        // PIN configured → show modal, save action for later
        setPinTitle(title);
        setPinSubtitle(subtitle);
        setPendingAction(() => action);
        setShowPin(true);
      } catch {
        // Fail open
        await action();
      } finally {
        setCheckingPin(false);
      }
    },
    [checkingPin]
  );

  const onVerify = useCallback(
    async (pin: string): Promise<boolean> => {
      try {
        const r = await fetch("/api/user/security/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin }),
        });
        if (r.ok) {
          const { valid } = await r.json();
          if (valid && pendingAction) {
            await pendingAction();
            cleanup();
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    },
    [pendingAction]
  );

  const cleanup = useCallback(() => {
    setShowPin(false);
    setPendingAction(null);
    setCheckingPin(false);
  }, []);

  const onClose = useCallback(() => {
    cleanup();
  }, [cleanup]);

  return {
    guardWithPin,
    pinModalProps: {
      open: showPin,
      onClose,
      title: pinTitle,
      subtitle: pinSubtitle,
      onVerify,
    },
  };
}
