import { Icon } from "./icon";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="empty-state glass" style={{ borderRadius: 24 }}>
      <div className="icon-circ" style={{ background: "var(--glass-strong)", margin: "0 auto 16px", width: 64, height: 64, borderRadius: 20 }}>
        <Icon name={icon} size={28} />
      </div>
      <div className="txt-strong" style={{ marginBottom: 6 }}>{title}</div>
      <div className="txt-dim">{description}</div>
    </div>
  );
}
