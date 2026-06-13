import type { Patient, TimelineStatus } from "../types";
import { formatTime } from "../utils/format";

const timelineSteps: TimelineStatus[] = [
  "Prijavljen",
  "Čaka",
  "Poklican",
  "V obravnavi",
  "Zaključeno",
];

const getStepTimestamp = (patient: Patient, status: TimelineStatus) =>
  [...(patient.timeline ?? [])]
    .reverse()
    .find((event) => event.status === status)?.timestamp;

interface StatusTimelineProps {
  patient: Patient;
  compact?: boolean;
}

export const StatusTimeline = ({ patient, compact = false }: StatusTimelineProps) => (
  <ol className={`status-timeline${compact ? " compact" : ""}`}>
    {timelineSteps.map((step) => {
      const timestamp = getStepTimestamp(patient, step);

      return (
        <li className={timestamp ? "is-done" : "is-pending"} key={step}>
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{step}</strong>
            {timestamp ? (
              <time dateTime={timestamp}>{formatTime(timestamp)}</time>
            ) : (
              <span>Še ni zabeleženo</span>
            )}
          </div>
        </li>
      );
    })}
  </ol>
);
