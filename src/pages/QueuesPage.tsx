import {
  ArrowRightLeft,
  CheckCircle2,
  Filter,
  FlaskConical,
  HeartPulse,
  Microscope,
  PhoneCall,
  Search,
  Stethoscope,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { StatusTimeline } from "../components/StatusTimeline";
import { PATIENT_STATUSES, PRIORITIES } from "../data/constants";
import { useApp } from "../state/AppContext";
import type { Department, Patient, PatientStatus, Priority } from "../types";
import { formatTime, humanMinutes, minutesBetween } from "../utils/format";
import { activeStatuses, getDepartmentQueue, getRoomName } from "../utils/queue";

const icons = {
  urgentni: HeartPulse,
  laboratorij: FlaskConical,
  ambulante: Stethoscope,
  diagnostika: Microscope,
};

const quickActions = [
  { label: "Pošlji v triažo", status: "Čaka na triažo" as PatientStatus, department: "urgentni" },
  { label: "Pošlji v laboratorij", status: "Čaka na odvzem" as PatientStatus, department: "laboratorij" },
  { label: "Pošlji v ambulanto", status: "Čaka" as PatientStatus, department: "ambulante" },
];

const QueuePatient = ({
  patient,
  departments,
}: {
  patient: Patient;
  departments: Department[];
}) => {
  const { settings, updatePatient, movePatient, completePatient } = useApp();
  const [completeOpen, setCompleteOpen] = useState(false);
  const rooms = settings.rooms.filter((room) => room.department === patient.department);

  return (
    <article className={`queue-card priority-${patient.priority.toLowerCase()}`}>
      <div className="queue-card-main">
        <div>
          <strong>{patient.number}</strong>
          <span>
            Prihod {formatTime(patient.arrivalTime)} · čaka{" "}
            {humanMinutes(minutesBetween(patient.arrivalTime))}
          </span>
        </div>
        <div className="row-badges">
          <PriorityBadge priority={patient.priority} />
          <StatusBadge status={patient.status} />
        </div>
      </div>
      <div className="queue-controls">
        <label>
          Status
          <select
            value={patient.status}
            onChange={(event) => {
              const nextStatus = event.target.value as PatientStatus;
              if (nextStatus === "Zaključeno") {
                setCompleteOpen(true);
                return;
              }

              movePatient(patient.id, nextStatus);
            }}
          >
            {PATIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Soba
          <select
            value={patient.assignedRoom ?? ""}
            onChange={(event) =>
              updatePatient(patient.id, {
                assignedRoom: event.target.value || undefined,
              })
            }
          >
            <option value="">Ni določeno</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="quick-actions">
        <button
          className="button button-primary"
          type="button"
          onClick={() => movePatient(patient.id, "V obravnavi", patient.assignedRoom)}
        >
          <PhoneCall size={16} aria-hidden="true" />
          Označi v obravnavi
        </button>
        {quickActions.map((action) => (
          <button
            className="button button-secondary"
            key={action.label}
            type="button"
            onClick={() => {
              const departmentRoom = settings.rooms.find(
                (room) => room.department === action.department,
              );
              const targetDepartment =
                departments.find((department) => department.id === action.department)?.id ??
                patient.department;
              updatePatient(patient.id, {
                department: targetDepartment,
                status: action.status,
                assignedRoom: departmentRoom?.id,
              });
            }}
          >
            <ArrowRightLeft size={16} aria-hidden="true" />
            {action.label}
          </button>
        ))}
        <button
          className="button button-secondary"
          type="button"
          onClick={() => movePatient(patient.id, "Preusmerjen")}
        >
          Preusmeri
        </button>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setCompleteOpen(true)}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          Označi zaključeno
        </button>
      </div>
      {patient.assignedRoom ? (
        <p className="room-note">Dodeljena soba: {getRoomName(settings, patient.assignedRoom)}</p>
      ) : null}
      <StatusTimeline compact patient={patient} />
      <ConfirmDialog
        open={completeOpen}
        title="Zaključim obravnavo?"
        description={`${patient.number} bo označen kot zaključen.`}
        confirmLabel="Označi zaključeno"
        onCancel={() => setCompleteOpen(false)}
        onConfirm={() => {
          completePatient(patient.id);
          setCompleteOpen(false);
        }}
      />
    </article>
  );
};

export const QueuesPage = () => {
  const { patients, settings, callNextPatient } = useApp();
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("vsi");
  const [statusFilter, setStatusFilter] = useState("vsi");
  const [priorityFilter, setPriorityFilter] = useState("vsi");
  const [roomFilter, setRoomFilter] = useState("vsi");
  const queueDepartments = useMemo(
    () =>
      settings.departments.filter((department) =>
        ["urgentni", "laboratorij", "ambulante", "diagnostika"].includes(
          department.id,
        ),
      ),
    [settings.departments],
  );
  const filteredDepartments = useMemo(
    () =>
      queueDepartments.filter(
        (department) =>
          departmentFilter === "vsi" || department.id === departmentFilter,
      ),
    [departmentFilter, queueDepartments],
  );

  const filterQueue = (queue: Patient[]) => {
    const normalizedQuery = query.trim().toLowerCase();

    return queue.filter((patient) => {
      const matchesQuery =
        !normalizedQuery || patient.number.toLowerCase().includes(normalizedQuery);
      const matchesStatus =
        statusFilter === "vsi" || patient.status === statusFilter;
      const matchesPriority =
        priorityFilter === "vsi" || patient.priority === priorityFilter;
      const matchesRoom =
        roomFilter === "vsi" ||
        (roomFilter === "brez"
          ? !patient.assignedRoom
          : patient.assignedRoom === roomFilter);

      return matchesQuery && matchesStatus && matchesPriority && matchesRoom;
    });
  };

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Operativno razvrščanje</span>
          <h1>Čakalne vrste</h1>
          <p>
            Laboratorij, ambulante in urgentni center ostajajo ločeni; znotraj
            vsake vrste sistem uporabi prioriteto in čas prihoda.
          </p>
        </div>
      </section>

      <section className="filter-bar queue-filter-bar" aria-label="Filtri čakalnih vrst">
        <label className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            placeholder="Išči po številki pacienta"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <Filter size={18} aria-hidden="true" />
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
          >
            <option value="vsi">Vsi oddelki</option>
            {queueDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="vsi">Vsi statusi</option>
            {PATIENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as Priority | "vsi")}
          >
            <option value="vsi">Vse prioritete</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="vsi">Vse sobe</option>
            <option value="brez">Brez sobe</option>
            {settings.rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="queue-grid">
        {filteredDepartments.map((department) => {
          const Icon = icons[department.id as keyof typeof icons] ?? Stethoscope;
          const rawQueue = getDepartmentQueue(patients, department.id, true);
          const queue = filterQueue(rawQueue);
          const waitingCount = queue.filter(
            (patient) => !activeStatuses.includes(patient.status),
          ).length;
          const activeCount = queue.length - waitingCount;
          const urgentCount = queue.filter(
            (patient) =>
              patient.priority === "Nujno" || patient.priority === "Kritično",
          ).length;

          return (
            <article className="queue-column" key={department.id}>
              <div className="queue-header">
                <div>
                  <Icon size={22} aria-hidden="true" />
                  <div>
                    <h2>{department.name}</h2>
                    <span>{queue.length} pacientov v vrsti</span>
                  </div>
                </div>
                <div className="queue-summary" aria-label={`Povzetek za ${department.name}`}>
                  <span>{waitingCount} čaka</span>
                  <span>{activeCount} aktivno</span>
                  <span>{urgentCount} nujno</span>
                </div>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => callNextPatient(department.id)}
                >
                  <PhoneCall size={17} aria-hidden="true" />
                  Pokliči naslednjega
                </button>
              </div>

              {queue.length ? (
                <div className="queue-list">
                  {queue.map((patient) => (
                    <QueuePatient
                      departments={settings.departments}
                      key={patient.id}
                      patient={patient}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Icon}
                  title={rawQueue.length ? "Ni zadetkov" : "Vrsta je prazna"}
                  description={
                    rawQueue.length
                      ? "Spremenite filtre za prikaz pacientov v tej čakalni vrsti."
                      : "Pacienti za ta oddelek se bodo prikazali tukaj."
                  }
                />
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
};
