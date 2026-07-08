"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "./icon";

interface Cat { id: string; name: string; icon: string; color: string; }
interface Props {
  categories: Cat[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  exclude?: string[];
}

export function CategorySelect({ categories, value, onChange, placeholder = "Elige categoría...", exclude = [] }: Props) {
  const [open, setOpen] = useState(false);
  const filtered = categories.filter((c) => !exclude.includes(c.id));
  const selected = categories.find((c) => c.id === value);

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      <div
        className="nexora-input"
        style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, marginBottom: 0 }}
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <>
            <div className="icon-circ" style={{ background: `${selected.color}22`, width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={selected.icon} size={16} color={selected.color} />
            </div>
            <span className="txt-strong" style={{ fontSize: 14 }}>{selected.name}</span>
          </>
        ) : (
          <span style={{ color: "var(--text-faint)", fontSize: 14 }}>{placeholder}</span>
        )}
        <span style={{ marginLeft: "auto" }}><Icon name={open ? "ChevronUp" : "ChevronDown"} size={14} color="var(--text-faint)" /></span>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              position: "fixed", zIndex: 9999, top: "auto", bottom: "auto",
              maxHeight: "40dvh", overflowY: "auto", WebkitOverflowScrolling: "touch",
              background: "var(--sheet)", border: "1px solid var(--glass-border-strong)",
              borderRadius: 16, padding: 6, boxShadow: "var(--shadow)",
            }}
            ref={(el) => {
              if (el) {
                const rect = el.parentElement?.getBoundingClientRect();
                if (rect) {
                  // Use visualViewport when available (handles mobile keyboard correctly)
                  const vh = window.visualViewport?.height ?? window.innerHeight;
                  const spaceBelow = vh - rect.bottom;
                  if (spaceBelow > 300) {
                    el.style.top = rect.bottom + 4 + "px";
                    el.style.bottom = "auto";
                  } else {
                    el.style.bottom = (vh - rect.top + 4) + "px";
                    el.style.top = "auto";
                  }
                  el.style.left = rect.left + "px";
                  el.style.width = rect.width + "px";
                }
              }
            }}
          >
            {filtered.length === 0 ? (
              <div className="txt-dim" style={{ padding: 12, textAlign: "center", fontSize: 13 }}>Sin categorías disponibles</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { onChange(c.id); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                    borderRadius: 10, cursor: "pointer",
                    background: value === c.id ? `${c.color}15` : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div className="icon-circ" style={{ background: `${c.color}22`, width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={c.icon} size={18} color={c.color} />
                  </div>
                  <span className="txt-strong" style={{ fontSize: 14 }}>{c.name}</span>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
