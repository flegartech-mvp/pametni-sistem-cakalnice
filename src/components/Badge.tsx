import type { Priority, PatientStatus } from "../types";
import { priorityTone, statusTone } from "../utils/queue";

type Tone = "neutral" | "info" | "success" | "warning" | "urgent" | "danger";

interface BadgeProps {
  children: string;
  tone?: Tone;
}

export const Badge = ({ children, tone = "neutral" }: BadgeProps) => (
  <span className={`badge badge-${tone}`}>{children}</span>
);

export const StatusBadge = ({ status }: { status: PatientStatus }) => (
  <Badge tone={statusTone(status)}>{status}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Badge tone={priorityTone(priority)}>{priority}</Badge>
);
