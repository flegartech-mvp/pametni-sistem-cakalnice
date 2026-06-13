import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}

export const StatCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: StatCardProps) => (
  <article className={`stat-card stat-${tone}`}>
    <div className="stat-icon">
      <Icon size={22} aria-hidden="true" />
    </div>
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </div>
  </article>
);
