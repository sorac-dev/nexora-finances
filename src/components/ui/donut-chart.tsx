interface DonutSegment {
  pct: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export function DonutChart({
  segments,
  size = 170,
  centerLabel = "GASTOS",
  centerValue = "",
}: DonutChartProps) {
  let acc = 0;
  const stops = segments.map((s) => {
    const start = acc;
    acc += s.pct;
    return `${s.color} ${start}% ${acc}%`;
  });

  return (
    <div
      className="donut"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${stops.join(",")})`,
      }}
    >
      <div className="donut-hole">
        <div style={{ fontSize: 11, color: "var(--text-faint)", fontWeight: 700 }}>
          {centerLabel}
        </div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>{centerValue}</div>
      </div>
    </div>
  );
}
