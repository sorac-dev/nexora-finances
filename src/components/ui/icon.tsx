"use client";

import * as Lu from "lucide-react";

interface Props {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export function Icon({ name, size = 22, className, color }: Props) {
  const iconName = (name && name in Lu ? name : "CircleHelp") as keyof typeof Lu;
  const LucideIcon = Lu[iconName] as React.ComponentType<{
    size?: number; className?: string; color?: string; strokeWidth?: number;
  }>;
  if (!LucideIcon) { const F = Lu.CircleHelp; return <F size={size} className={className} color={color} strokeWidth={2} />; }
  return <LucideIcon size={size} className={className} color={color} strokeWidth={2} />;
}

// Re-export from the shared helper
export { ALL_ICONS, ICON_GROUPS, DEFAULT_ICON } from "@/src/lib/icons-helper";
