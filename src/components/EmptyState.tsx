import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const EmptyState = ({ icon: Icon, title, description }: EmptyStateProps) => (
  <div className="empty-state">
    <Icon size={34} aria-hidden="true" />
    <strong>{title}</strong>
    <p>{description}</p>
  </div>
);
