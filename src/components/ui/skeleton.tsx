import { cn } from "@/src/lib/cn";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn("skeleton", className)}
      style={{ width, height }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card">
      <Skeleton height={20} width="60%" className="mb-3" />
      <Skeleton height={36} width="80%" className="mb-3" />
      <div className="flex justify-between">
        <Skeleton height={16} width="30%" />
        <Skeleton height={16} width="30%" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 py-3"
          style={{
            borderBottom:
              i < rows - 1 ? "1px solid var(--glass-border)" : "none",
          }}
        >
          <Skeleton width={44} height={44} className="rounded-[14px]" />
          <div className="flex-1">
            <Skeleton height={16} width="50%" className="mb-2" />
            <Skeleton height={12} width="30%" />
          </div>
          <Skeleton height={16} width={80} />
        </div>
      ))}
    </div>
  );
}
