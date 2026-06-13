import {
  Activity,
  BarChart3,
  CheckCircle2,
  Clock4,
  Download,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { StatCard } from "../components/StatCard";
import { PATIENT_STATUSES, PRIORITIES } from "../data/constants";
import { useApp } from "../state/AppContext";
import type { PatientStatus } from "../types";
import { humanMinutes } from "../utils/format";
import {
  countBy,
  getAverageWaitingMinutes,
  getAverageWaitingMinutesByPriority,
  getCompletedToday,
  downloadDailyPatientFlowCsv,
  getPeakHour,
  getTodayPatients,
} from "../utils/reports";
import { activeStatuses } from "../utils/queue";
import { getDepartmentName } from "../utils/queue";

const BarList = ({
  data,
}: {
  data: Array<{ label: string; value: number; valueLabel?: string }>;
}) => {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="bar-list">
      {data.map((item) => (
        <div className="bar-row" key={item.label}>
          <span>{item.label}</span>
          <div>
            <i style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          <strong>{item.valueLabel ?? item.value}</strong>
        </div>
      ))}
    </div>
  );
};

export const ReportsPage = () => {
  const { patients, settings, notify } = useApp();
  const todayPatients = getTodayPatients(patients);
  const completed = getCompletedToday(patients);
  const active = todayPatients.filter((patient) =>
    activeStatuses.includes(patient.status),
  );
  const patientsByDepartment = settings.departments.map((department) => ({
    label: getDepartmentName(settings, department.id),
    value: todayPatients.filter((patient) => patient.department === department.id).length,
  }));
  const statusCounts = countBy(
    todayPatients.map((patient) => patient.status),
    PATIENT_STATUSES as PatientStatus[],
  );
  const patientsByStatus = Object.entries(statusCounts).map(([label, value]) => ({
    label,
    value,
  }));
  const waitingByPriority = getAverageWaitingMinutesByPriority(
    todayPatients,
    PRIORITIES,
  ).map((item) => ({
    ...item,
    valueLabel: humanMinutes(item.value),
  }));

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Dnevni pregled</span>
          <h1>Poročila</h1>
          <p>
            Pregled pretoka pacientov, obremenitve oddelkov in osnovnih časov
            čakanja za predstavitev delovanja sistema.
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={() => {
            downloadDailyPatientFlowCsv(patients, settings);
            notify({
              title: "CSV izvoz pripravljen",
              description: "Dnevni tok pacientov je izvožen brez polnih imen.",
              tone: "success",
            });
          }}
        >
          <Download size={18} aria-hidden="true" />
          Izvozi CSV
        </button>
      </section>

      <section className="stat-grid compact">
        <StatCard
          icon={UsersRound}
          label="Pacientov danes"
          value={todayPatients.length}
          detail="Vsi registrirani prihodi"
        />
        <StatCard
          icon={Clock4}
          label="Povprečno čakanje"
          value={humanMinutes(getAverageWaitingMinutes(todayPatients))}
          detail="Do prvega klica"
          tone="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Zaključeno danes"
          value={completed.length}
          detail="Današnji zaključki"
          tone="slate"
        />
        <StatCard
          icon={Activity}
          label="Aktivni pacienti"
          value={active.length}
          detail="Poklicani ali v obravnavi"
          tone="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Največji naval"
          value={getPeakHour(todayPatients)}
          detail="Po uri prihoda"
          tone="amber"
        />
      </section>

      <section className="two-column">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Obremenitev</span>
              <h2>Pacienti po oddelkih</h2>
            </div>
            <BarChart3 size={24} aria-hidden="true" />
          </div>
          <BarList data={patientsByDepartment} />
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Stanje obravnav</span>
              <h2>Pacienti po statusu</h2>
            </div>
            <BarChart3 size={24} aria-hidden="true" />
          </div>
          <BarList data={patientsByStatus} />
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Čakanje</span>
              <h2>Povprečje po prioriteti</h2>
            </div>
            <Clock4 size={24} aria-hidden="true" />
          </div>
          <BarList data={waitingByPriority} />
        </article>
      </section>
    </div>
  );
};
