import {
  CheckCircle2,
  ClipboardList,
  Filter,
  Printer,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState } from "../components/EmptyState";
import { printPatientTicket } from "../components/PatientTicket";
import { PriorityBadge, StatusBadge } from "../components/Badge";
import { StatusTimeline } from "../components/StatusTimeline";
import { PATIENT_STATUSES, PRIORITIES } from "../data/constants";
import { useApp } from "../state/AppContext";
import type { Patient, PatientStatus } from "../types";
import { formatTime } from "../utils/format";
import { getDepartmentName, getRoomName, sortQueuePatients } from "../utils/queue";
import { openAppWindow } from "../utils/window";

type SortMode = "priority" | "arrival" | "number";

export const PatientsPage = () => {
  const {
    patients,
    settings,
    updatePatient,
    completePatient,
    deletePatient,
    notify,
  } = useApp();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("vsi");
  const [status, setStatus] = useState("vsi");
  const [priority, setPriority] = useState("vsi");
  const [room, setRoom] = useState("vsi");
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const [completeTarget, setCompleteTarget] = useState<Patient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const base = patients.filter((patient) => {
      const matchesQuery =
        !normalizedQuery ||
        patient.number.toLowerCase().includes(normalizedQuery) ||
        patient.initials.toLowerCase().includes(normalizedQuery);
      const matchesDepartment =
        department === "vsi" || patient.department === department;
      const matchesStatus = status === "vsi" || patient.status === status;
      const matchesPriority = priority === "vsi" || patient.priority === priority;
      const matchesRoom =
        room === "vsi" ||
        (room === "brez" ? !patient.assignedRoom : patient.assignedRoom === room);

      return (
        matchesQuery &&
        matchesDepartment &&
        matchesStatus &&
        matchesPriority &&
        matchesRoom
      );
    });

    if (sortMode === "arrival") {
      return [...base].sort(
        (left, right) =>
          new Date(left.arrivalTime).getTime() -
          new Date(right.arrivalTime).getTime(),
      );
    }

    if (sortMode === "number") {
      return [...base].sort((left, right) => left.number.localeCompare(right.number));
    }

    return sortQueuePatients(base);
  }, [department, patients, priority, query, room, sortMode, status]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Seznam in iskanje</span>
          <h1>Pacienti</h1>
          <p>
            Pregled anonimiziranih pacientov, statusov, sob in informativnih QR
            povezav.
          </p>
        </div>
        <Link className="button button-primary" to="/patients/new">
          Dodaj pacienta
        </Link>
      </section>

      <section className="filter-bar" aria-label="Filtri pacientov">
        <label className="search-input">
          <Search size={18} aria-hidden="true" />
          <input
            placeholder="Išči po številki ali začetnicah"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <Filter size={18} aria-hidden="true" />
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="vsi">Vsi oddelki</option>
            {settings.departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="vsi">Vsi statusi</option>
            {PATIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="vsi">Vse prioritete</option>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select value={room} onChange={(event) => setRoom(event.target.value)}>
            <option value="vsi">Vse sobe</option>
            <option value="brez">Brez sobe</option>
            {settings.rooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="priority">Sortiraj po prioriteti</option>
            <option value="arrival">Sortiraj po prihodu</option>
            <option value="number">Sortiraj po številki</option>
          </select>
        </label>
      </section>

      <section className="panel table-panel">
        {filteredPatients.length ? (
          <div className="responsive-table" role="table" aria-label="Pacienti">
            <div className="table-head" role="row">
              <span>Pacient</span>
              <span>Oddelek</span>
              <span>Status</span>
              <span>Soba</span>
              <span>Prihod</span>
              <span>Akcije</span>
            </div>
            {filteredPatients.map((patient) => (
              <div className="table-row-group" role="rowgroup" key={patient.id}>
                <div className="table-row" role="row">
                  <div className="patient-cell">
                    <strong>{patient.number}</strong>
                    <span>{patient.initials}</span>
                    <PriorityBadge priority={patient.priority} />
                  </div>
                  <span>{getDepartmentName(settings, patient.department)}</span>
                  <label className="inline-control">
                    <select
                      aria-label={`Status za ${patient.number}`}
                      value={patient.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as PatientStatus;
                        if (nextStatus === "Zaključeno") {
                          setCompleteTarget(patient);
                          return;
                        }

                        updatePatient(patient.id, { status: nextStatus });
                      }}
                    >
                      {PATIENT_STATUSES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="inline-control">
                    <select
                      aria-label={`Soba za ${patient.number}`}
                      value={patient.assignedRoom ?? ""}
                      onChange={(event) =>
                        updatePatient(patient.id, {
                          assignedRoom: event.target.value || undefined,
                        })
                      }
                    >
                      <option value="">Ni določeno</option>
                      {settings.rooms
                        .filter((room) => room.department === patient.department)
                        .map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <span>{formatTime(patient.arrivalTime)}</span>
                  <div className="table-actions">
                    <button
                      className="icon-button"
                      aria-label={`Natisni listek za ${patient.number}`}
                      title="Natisni listek"
                      type="button"
                      onClick={() => {
                        printPatientTicket(patient, settings);
                        notify({
                          title: "Listek odprt",
                          description: `${patient.number} je pripravljen za tisk.`,
                          tone: "success",
                        });
                      }}
                    >
                      <Printer size={17} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Odpri QR status za ${patient.number}`}
                      title="Odpri QR status"
                      type="button"
                      onClick={() => {
                        openAppWindow(patient.qrCodeUrl);
                        notify({
                          title: "QR status odprt",
                          description: `Odprta je stran za ${patient.number}.`,
                          tone: "info",
                        });
                      }}
                    >
                      <QrCode size={17} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button success"
                      aria-label={`Označi ${patient.number} kot zaključeno`}
                      title="Označi zaključeno"
                      type="button"
                      onClick={() => setCompleteTarget(patient)}
                    >
                      <CheckCircle2 size={17} aria-hidden="true" />
                    </button>
                    <button
                      className="icon-button danger"
                      aria-label={`Odstrani pacienta ${patient.number}`}
                      title="Odstrani pacienta"
                      type="button"
                      onClick={() => setDeleteTarget(patient)}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="patient-timeline-row">
                  <StatusTimeline compact patient={patient} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Ni zadetkov"
            description="Spremenite iskanje ali filtre za prikaz pacientov."
          />
        )}
      </section>

      <ConfirmDialog
        open={Boolean(completeTarget)}
        title="Zaključim obravnavo?"
        description={
          completeTarget
            ? `${completeTarget.number} bo označen kot zaključen.`
            : "Pacient bo označen kot zaključen."
        }
        confirmLabel="Označi zaključeno"
        onCancel={() => setCompleteTarget(null)}
        onConfirm={() => {
          if (completeTarget) {
            completePatient(completeTarget.id);
            setCompleteTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Odstranim pacienta?"
        description={
          deleteTarget
            ? `${deleteTarget.number} bo odstranjen iz lokalnega seznama.`
            : "Pacient bo odstranjen iz lokalnega seznama."
        }
        confirmLabel="Odstrani pacienta"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deletePatient(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />

      <div className="mobile-card-list">
        {filteredPatients.length ? (
          filteredPatients.map((patient) => (
            <article className="mobile-patient-card" key={`mobile-${patient.id}`}>
              <div>
                <strong>{patient.number}</strong>
                <span>{patient.initials}</span>
              </div>
              <div className="row-badges">
                <PriorityBadge priority={patient.priority} />
                <StatusBadge status={patient.status} />
              </div>
              <p>
                {getDepartmentName(settings, patient.department)} ·{" "}
                {getRoomName(settings, patient.assignedRoom) || "Soba bo določena"}
              </p>
              <StatusTimeline compact patient={patient} />
              <div className="mobile-card-actions">
                <button
                  className="icon-button"
                  aria-label={`Natisni listek za ${patient.number}`}
                  title="Natisni listek"
                  type="button"
                  onClick={() => {
                    printPatientTicket(patient, settings);
                    notify({
                      title: "Listek odprt",
                      description: `${patient.number} je pripravljen za tisk.`,
                      tone: "success",
                    });
                  }}
                >
                  <Printer size={17} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  aria-label={`Odpri QR status za ${patient.number}`}
                  title="Odpri QR status"
                  type="button"
                  onClick={() => {
                    openAppWindow(patient.qrCodeUrl);
                    notify({
                      title: "QR status odprt",
                      description: `Odprta je stran za ${patient.number}.`,
                      tone: "info",
                    });
                  }}
                >
                  <QrCode size={17} aria-hidden="true" />
                </button>
                <button
                  className="icon-button success"
                  aria-label={`Označi ${patient.number} kot zaključeno`}
                  title="Označi zaključeno"
                  type="button"
                  onClick={() => setCompleteTarget(patient)}
                >
                  <CheckCircle2 size={17} aria-hidden="true" />
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Odstrani pacienta ${patient.number}`}
                  title="Odstrani pacienta"
                  type="button"
                  onClick={() => setDeleteTarget(patient)}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Ni zadetkov"
            description="Spremenite iskanje ali filtre za prikaz pacientov."
          />
        )}
      </div>
    </div>
  );
};
