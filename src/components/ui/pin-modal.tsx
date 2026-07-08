"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/src/components/ui/icon";

interface PinModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Called with the 4-digit PIN. Return true if correct, false if wrong. */
  onVerify: (pin: string) => Promise<boolean>;
  /** Allow closing without entering PIN (only if no PIN is configured) */
  allowSkip?: boolean;
}

export function PinModal({ open, onClose, title, subtitle, onVerify, allowSkip }: PinModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setDigits(["", "", "", ""]);
      setError(false);
      setShaking(false);
      setVerifying(false);
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 350);
    }
  }, [open]);

  const triggerShake = useCallback(() => {
    setError(true);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setDigits(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }, 500);
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    if (!digit) return;

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(false);

    // Move to next input
    if (index < 3 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    // If all 4 digits filled, auto-submit
    if (index === 3 && digit) {
      const finalPin = newDigits.join("");
      if (finalPin.length === 4) {
        handleSubmit(finalPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = "";
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 0) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length && i < 4; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    setError(false);
    if (pasted.length === 4) {
      handleSubmit(newDigits.join(""));
    } else {
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  async function handleSubmit(pin: string) {
    if (verifying) return;
    setVerifying(true);
    setError(false);
    try {
      const valid = await onVerify(pin);
      if (valid) {
        onClose();
      } else {
        triggerShake();
      }
    } catch {
      triggerShake();
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => {
            if (allowSkip) onClose();
          }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              width: "100%", maxWidth: 500,
              borderRadius: "28px 28px 0 0",
              padding: "28px 24px 38px",
              background: "var(--sheet)",
              border: "1px solid var(--glass-border-strong)",
              boxShadow: "var(--shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 40, height: 5, borderRadius: 10,
              background: "var(--track)", margin: "0 auto 24px",
            }} />

            {/* Lock icon */}
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 18,
                background: "rgba(10,132,255,0.12)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name="Lock" size={28} color="var(--c-blue)" />
              </div>
            </div>

            <div style={{
              fontSize: 20, fontWeight: 800, textAlign: "center", marginBottom: 4,
            }}>
              {title}
            </div>
            {subtitle && (
              <div style={{
                fontSize: 13, color: "var(--text-dim)", textAlign: "center",
                marginBottom: 24, lineHeight: 1.5,
              }}>
                {subtitle}
              </div>
            )}

            {/* PIN inputs */}
            <div
              style={{
                display: "flex", justifyContent: "center", gap: 14,
                marginBottom: error ? 8 : 28,
              }}
            >
              {digits.map((digit, i) => (
                <motion.input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  animate={shaking ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  style={{
                    width: 56, height: 64,
                    borderRadius: 16,
                    border: error
                      ? "2px solid #FF6B6B"
                      : digit
                        ? "2px solid var(--c-blue)"
                        : "2px solid var(--glass-border-strong)",
                    background: digit ? "rgba(10,132,255,0.08)" : "var(--glass)",
                    textAlign: "center",
                    fontSize: 28,
                    fontWeight: 800,
                    color: error ? "#FF6B6B" : "var(--text)",
                    outline: "none",
                    caretColor: "var(--c-blue)",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                />
              ))}
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  textAlign: "center", color: "#FF6B6B",
                  fontSize: 13, fontWeight: 600, marginBottom: 20,
                }}
              >
                PIN incorrecto. Intenta de nuevo.
              </motion.div>
            )}

            {/* Verifying indicator */}
            {verifying && (
              <div style={{ textAlign: "center", padding: 8 }}>
                <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }} />
              </div>
            )}

            {/* Skip button */}
            {allowSkip && (
              <div style={{ textAlign: "center", marginTop: 12 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-dim)", fontSize: 13, fontWeight: 600,
                    padding: "8px 16px",
                  }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
