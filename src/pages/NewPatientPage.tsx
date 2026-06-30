import { AlertCircle, Printer, QrCode, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PriorityBadge } from "../components/Badge";
import { printPatientTicket } from "../components/PatientTicket";
import {
  PATIENT_STATUSES,
  PRIORITIES,
  REASON_CATEGORIES,
  VISIT_TYPES,
} from "../data/constants";
import { useApp } from "../state/AppContext";
import type { PatientInput, PatientStatus, Priority, ReasonCategory, VisitType } from "../types";
import { getDefaultRoomForDepartment } from "../utils/queue";
import { normalizeInitials, validatePatientInput } from "../utils/patientValidation";
import { openAppWindow } from "../utils/window";

const visitToDepartment: Record<VisitType, string> = {
  "Urgentni center": "urgentni",
  Laboratorij: "laboratorij",
  Ambulanta: "ambulante",
  Diagnostika: "diagnostika",
  "Administrativni sprejem": "sprejem",
};

export const NewPatientPage = () => {
  const { addPatient, settings, notify } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<PatientInput>({
    initials: "",
    birthYear: undefined,
    visitType: "Laboratorij",
    reasonCategory: "Odvzem krvi",
    priority: "Normalno",
    status: "Čaka na odvzem",
    department: "laboratorij",
    assignedRoom: "lab-1",
    notes: "",
  });
  const [printAfterSave, setPrintAfterSave] = useState(true);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const availableRooms = settings.rooms.filter(
    (room) => room.department === form.department,
  );
  const numberPreview = useMemo(() => {
    const code =
      settings.departments.find((department) => department.id === form.department)?.code ??
      "P";
    return `${code}-naslednja`;
  }, [form.department, settings.departments]);

  const updateVisitType = (visitType: VisitType) => {
    const department = visitToDepartment[visitType];
    const assignedRoom = getDefaultRoomForDepartment(settings, department);
    const status: PatientStatus =
      visitType === "Laboratorij"
        ? "Čaka na odvzem"
        : visitType === "Urgentni center"
          ? "Čaka na triažo"
          : "Čaka";

    setForm((current) => ({
      ...current,
      visitType,
      department,
      status,
      assignedRoom,
    }));
  };

  return (
    <div className="page-stack narrow">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Sprejem pacienta</span>
          <h1>Dodaj pacienta</h1>
          <p>
            Sistem uporablja le številko, začetnice in operativne podatke za
            obveščanje v čakalnici.
          </p>
        </div>
        <div className="preview-ticket">
          <span>Predogled številke</span>
          <strong>{numberPreview}</strong>
          <PriorityBadge priority={form.priority} />
        </div>
      </section>

      <form
        className="form-grid panel"
        onSubmit={(event) => {
          event.preventDefault();
          const errors = validatePatientInput(form);

          if (errors.length) {
            setFormErrors(errors);
            return;
          }

          const patient = addPatient({
            ...form,
            initials: normalizeInitials(form.initials),
            notes: form.notes?.trim(),
          });

          if (printAfterSave) {
            printPatientTicket(patient, settings);
            notify({
              title: "Listek pripravljen",
              description: `${patient.number} ima QR povezavo in navodilo za čakalnico.`,
              tone: "success",
            });
          }

          navigate(`/patients`);
        }}
      >
        {formErrors.length ? (
          <div className="form-alert full-span" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <div>
              <strong>Preverite podatke za sprejem</strong>
              <ul>
                {formErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <label>
          Začetnice pacienta
          <input
            autoFocus
            aria-invalid={formErrors.some((error) => error.includes("Začetnice")) || undefined}
            maxLength={12}
            required
            placeholder="npr. M.N."
            value={form.initials}
            onChange={(event) =>
              setForm((current) => ({ ...current, initials: event.target.value }))
            }
          />
        </label>
        <label>
          Leto rojstva
          <input
            aria-invalid={formErrors.some((error) => error.includes("Leto")) || undefined}
            inputMode="numeric"
            max={new Date().getFullYear()}
            min={1900}
            placeholder="neobvezno"
            type="number"
            value={form.birthYear ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                birthYear: event.target.value ? Number(event.target.value) : undefined,
              }))
            }
          />
        </label>
        <label>
          Vrsta obiska
          <select
            value={form.visitType}
            onChange={(event) => updateVisitType(event.target.value as VisitType)}
          >
            {VISIT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Kategorija razloga
          <select
            value={form.reasonCategory}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reasonCategory: event.target.value as ReasonCategory,
              }))
            }
          >
            {REASON_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Prioriteta
          <select
            value={form.priority}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                priority: event.target.value as Priority,
              }))
            }
          >
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={form.status}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                status: event.target.value as PatientStatus,
              }))
            }
          >
            {PATIENT_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          Oddelek
          <select
            value={form.department}
            onChange={(event) => {
              const department = event.target.value;
              setForm((current) => ({
                ...current,
                department,
                assignedRoom: getDefaultRoomForDepartment(settings, department),
              }));
            }}
          >
            {settings.departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dodeljena soba
          <select
            value={form.assignedRoom ?? ""}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                assignedRoom: event.target.value || undefined,
              }))
            }
          >
            <option value="">Bo določena kasneje</option>
            {availableRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </label>
        <label className="full-span">
          Operativna opomba
          <textarea
            aria-describedby="notes-help"
            rows={4}
            maxLength={280}
            placeholder="Kratka opomba za osebje, brez diagnoz ali občutljivih podatkov."
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({ ...current, notes: event.target.value }))
            }
          />
          <span className="field-help" id="notes-help">
            {form.notes?.length ?? 0}/280 znakov
          </span>
        </label>
        <label className="checkbox-row full-span">
          <input
            checked={printAfterSave}
            type="checkbox"
            onChange={(event) => setPrintAfterSave(event.target.checked)}
          />
          <span>
            <Printer size={17} aria-hidden="true" />
            Po shranjevanju natisni informativni listek
          </span>
        </label>
        <div className="form-actions full-span">
          <button className="button button-secondary" type="button" onClick={() => navigate("/patients")}>
            Prekliči
          </button>
          <button className="button button-secondary" type="button" onClick={() => openAppWindow("/display")}>
            <QrCode size={18} aria-hidden="true" />
            Odpri javni zaslon
          </button>
          <button className="button button-primary" type="submit">
            <Save size={18} aria-hidden="true" />
            Dodaj pacienta
          </button>
        </div>
      </form>
    </div>
  );
};
