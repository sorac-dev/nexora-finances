"use client";

import { cn } from "@/src/lib/cn";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}

export function ToggleSwitch({ checked, onChange, id }: ToggleSwitchProps) {
  return (
    <div
      id={id}
      className={cn("toggle", checked ? "on" : "off")}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="toggle-knob" />
    </div>
  );
}
