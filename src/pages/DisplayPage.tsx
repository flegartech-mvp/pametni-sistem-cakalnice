import { Building2, Clock3 } from "lucide-react";
import { useClock } from "../hooks/useClock";
import { useApp } from "../state/AppContext";
import { formatDate, formatTime } from "../utils/format";
import {
  activeStatuses,
  getCallableQueue,
  getDepartmentName,
  getRoomName,
} from "../utils/queue";

export const DisplayPage = () => {
  const { patients, settings } = useApp();
  const now = useClock();
  const displayMessage =
    settings.displayMessage || "Prosimo, spremljajte svojo številko.";
  const currentCalled = patients
    .filter((patient) => activeStatuses.includes(patient.status) && patient.calledTime)
    .sort(
      (left, right) =>
        new Date(right.calledTime ?? "").getTime() -
        new Date(left.calledTime ?? "").getTime(),
    )[0];
  const nextPatients = settings.departments
    .flatMap((department) => getCallableQueue(patients, department.id).slice(0, 3))
    .slice(0, 6);

  return (
    <main className="display-screen">
      <header className="display-header">
        <div className="brand">
          <div className="brand-mark">{settings.logoText}</div>
          <div>
            <strong>{settings.institutionName}</strong>
            <span>Javni prikaz čakalnice</span>
          </div>
        </div>
        <div className="display-time">
          <Clock3 size={28} aria-hidden="true" />
          <div>
            <strong>{formatTime(now)}</strong>
            <span>{formatDate(now)}</span>
          </div>
        </div>
      </header>

      <section className="called-panel" aria-live="polite">
        <span>Zdaj na vrsti</span>
        {currentCalled ? (
          <>
            <div className="display-call-card">
              <div className="display-number">{currentCalled.number}</div>
              <div className="display-room">
                <span>Soba</span>
                <strong>{getRoomName(settings, currentCalled.assignedRoom)}</strong>
              </div>
            </div>
            <p>{getDepartmentName(settings, currentCalled.department)}</p>
          </>
        ) : (
          <>
            <div className="display-call-card display-call-empty">
              <div className="display-number">Ni aktivnega klica</div>
            </div>
            <p>{displayMessage}</p>
          </>
        )}
      </section>

      <section className="display-next">
        <div>
          <span>Naslednji</span>
          <div className="next-grid">
            {nextPatients.length ? (
              nextPatients.map((patient) => (
                <article key={patient.id}>
                  <strong>{patient.number}</strong>
                  <span>{getDepartmentName(settings, patient.department)}</span>
                </article>
              ))
            ) : (
              <article>
                <strong>Ni čakajočih</strong>
                <span>Trenutno ni prikazanih številk.</span>
              </article>
            )}
          </div>
        </div>
        <aside className="display-message">
          <Building2 size={34} aria-hidden="true" />
          <p>{displayMessage}</p>
        </aside>
      </section>
    </main>
  );
};
