import {
  Activity,
  AlarmClock,
  ArrowRight,
  Building2,
  ClipboardCheck,
  FlaskConical,
  HeartPulse,
  Hourglass,
  PlusCircle,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { StatCard } from "../components/StatCard";
import { useApp } from "../state/AppContext";
import { formatTime, humanMinutes, minutesBetween } from "../utils/format";
import { getDashboardMetrics } from "../utils/reports";
import {
  getDepartmentName,
  getRoomName,
  sortQueuePatients,
} from "../utils/queue";

export const DashboardPage = () => {
  const { patients, settings, callNextPatient } = useApp();
  const metrics = getDashboardMetrics(patients, settings);
  const activePatients = sortQueuePatients(metrics.active).slice(0, 6);
  const waitingPreview = sortQueuePatients(metrics.waiting).slice(0, 6);
  const departmentLoad = settings.departments
    .filter((department) =>
      ["urgentni", "laboratorij", "ambulante", "diagnostika"].includes(
        department.id,
      ),
    )
    .map((department) => {
      const waiting = metrics.waiting.filter(
        (patient) => patient.department === department.id,
      ).length;
      const active = metrics.active.filter(
        (patient) => patient.department === department.id,
      ).length;

      return { ...department, waiting, active };
    });

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Današnji operativni tok</span>
          <h1>Nadzorna plošča osebja</h1>
          <p>
            Hiter pregled čakalnih vrst, aktivnih sob in pacientov z višjo
            prioriteto.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" to="/patients/new">
            <PlusCircle size={18} aria-hidden="true" />
            Dodaj pacienta
          </Link>
          <Link className="button button-primary" to="/queues">
            <ArrowRight size={18} aria-hidden="true" />
            Upravljaj vrste
          </Link>
        </div>
      </section>

      <section className="operations-strip" aria-label="Povzetek obremenitve">
        <article>
          <span>Trenutna obremenitev</span>
          <strong>{metrics.waiting.length + metrics.active.length}</strong>
          <p>pacientov je trenutno v aktivnem toku</p>
        </article>
        <article>
          <span>Prioritetni nadzor</span>
          <strong>{metrics.urgent.length}</strong>
          <p>nujnih ali kritičnih primerov za prednostno obravnavo</p>
        </article>
        <article className="operations-load">
          <div>
            <span>Oddelki</span>
            <strong>Stanje vrst</strong>
          </div>
          <div className="load-chips">
            {departmentLoad.map((department) => (
              <div key={department.id}>
                <Building2 size={16} aria-hidden="true" />
                <span>{department.code}</span>
                <strong>{department.waiting}</strong>
                <small>{department.active} aktivno</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="stat-grid">
        <StatCard
          icon={UsersRound}
          label="Skupaj čaka"
          value={metrics.waiting.length}
          detail="Vse aktivne čakalne vrste"
          tone="blue"
        />
        <StatCard
          icon={HeartPulse}
          label="V obravnavi"
          value={metrics.active.length}
          detail={metrics.currentActiveRoom}
          tone="green"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Zaključeno"
          value={metrics.completed.length}
          detail="Današnji zaključeni primeri"
          tone="slate"
        />
        <StatCard
          icon={AlarmClock}
          label="Nujni primeri"
          value={metrics.urgent.length}
          detail="Nujno in kritično"
          tone="red"
        />
        <StatCard
          icon={FlaskConical}
          label="Laboratorij"
          value={metrics.labQueue.length}
          detail="Čaka na odvzem"
          tone="amber"
        />
        <StatCard
          icon={Stethoscope}
          label="Ambulante"
          value={metrics.ambulatoryQueue.length}
          detail="Čaka na obravnavo"
          tone="blue"
        />
        <StatCard
          icon={Hourglass}
          label="Povp. čakanje"
          value={humanMinutes(metrics.averageWaiting)}
          detail="Od prihoda do klica"
          tone="green"
        />
        <StatCard
          icon={Activity}
          label="Najdlje čaka"
          value={
            metrics.longestWaiting
              ? humanMinutes(minutesBetween(metrics.longestWaiting.arrivalTime))
              : "Ni podatkov"
          }
          detail={metrics.longestWaiting?.number ?? "Ni čakajočega pacienta"}
          tone="amber"
        />
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Aktivne sobe</span>
              <h2>V obravnavi</h2>
            </div>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => callNextPatient("urgentni")}
            >
              <HeartPulse size={18} aria-hidden="true" />
              Pokliči urgentnega
            </button>
          </div>
          {activePatients.length ? (
            <div className="list-table">
              {activePatients.map((patient) => (
                <div className="list-row" key={patient.id}>
                  <div>
                    <strong>{patient.number}</strong>
                    <span>
                      {getDepartmentName(settings, patient.department)} ·{" "}
                      {getRoomName(settings, patient.assignedRoom)}
                    </span>
                  </div>
                  <div className="row-badges">
                    <PriorityBadge priority={patient.priority} />
                    <StatusBadge status={patient.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Stethoscope}
              title="Ni aktivnih obravnav"
              description="Ko osebje pokliče pacienta, bo prikazan tukaj."
            />
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Naslednji pacienti</span>
              <h2>Prednostni vrstni red</h2>
            </div>
            <Link className="button button-secondary" to="/queues">
              <ArrowRight size={18} aria-hidden="true" />
              Odpri vrste
            </Link>
          </div>
          {waitingPreview.length ? (
            <div className="list-table">
              {waitingPreview.map((patient) => (
                <div className="list-row" key={patient.id}>
                  <div>
                    <strong>{patient.number}</strong>
                    <span>
                      {getDepartmentName(settings, patient.department)} · prihod{" "}
                      {formatTime(patient.arrivalTime)}
                    </span>
                  </div>
                  <div className="row-badges">
                    <PriorityBadge priority={patient.priority} />
                    <StatusBadge status={patient.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Čakalne vrste so prazne"
              description="Trenutno ni pacientov, ki čakajo na klic."
            />
          )}
        </article>
      </section>
    </div>
  );
};
