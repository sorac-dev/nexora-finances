interface ProgressBarProps {
  percent: number;
  color?: string;
  className?: string;
}

export function ProgressBar({ percent, color, className }: ProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <div className={`progress-track ${className || ""}`}>
      <div
        className="progress-fill"
        style={{
          width: `${safePercent}%`,
          background: color || "var(--c-blue)",
        }}
      />
    </div>
  );
}
