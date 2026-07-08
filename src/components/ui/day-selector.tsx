"use client";

import { Icon } from "./icon";

interface DaySelectorProps {
  value: number;
  onChange: (day: number) => void;
  label?: string;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function DaySelector({ value, onChange, label }: DaySelectorProps) {
  const needsValidation = value > 28;

  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label className="field-label">{label}</label>}
      <select
        className="nexora-select"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ fontSize: 16, fontWeight: 600, cursor: "pointer" }}
      >
        {DAYS.map((day) => (
          <option key={day} value={day}>
            Día {day}
            {day > 28 ? " (fin de mes)" : ""}
          </option>
        ))}
      </select>
      {needsValidation && (
        <div style={{
          marginTop: 6, padding: "8px 12px", borderRadius: 10,
          background: "rgba(255,159,67,0.1)", border: "1px solid rgba(255,159,67,0.2)",
          fontSize: 11, color: "#FF9F43", display: "flex", alignItems: "center", gap: 6,
        }}>
          <Icon name="AlertTriangle" size={14} color="#FF9F43" />
          En meses con menos de {value} días, se usará el último día del mes.
        </div>
      )}
    </div>
  );
}
