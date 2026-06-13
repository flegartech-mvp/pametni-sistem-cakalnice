import { PlayCircle, Save, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useApp } from "../state/AppContext";
import type { AppSettings, Department, Room, StatusDefinition } from "../types";
import { toSlug } from "../utils/format";

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const getDepartmentText = (settings: AppSettings) =>
  settings.departments.map((department) => `${department.code} | ${department.name}`).join("\n");

const getStatusText = (settings: AppSettings) =>
  settings.statuses.map((status) => status.label).join("\n");

const createRoomId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 6)
    : Math.random().toString(36).slice(2, 8);

export const SettingsPage = () => {
  const { settings, updateSettings, resetDemoData, notify } = useApp();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [departmentText, setDepartmentText] = useState(getDepartmentText(settings));
  const [statusText, setStatusText] = useState(getStatusText(settings));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [roomDeleteTarget, setRoomDeleteTarget] = useState<Room | null>(null);

  useEffect(() => {
    setDraft(settings);
    setDepartmentText(getDepartmentText(settings));
    setStatusText(getStatusText(settings));
  }, [settings]);

  const save = () => {
    const departmentLines = splitLines(departmentText);
    const statusLines = splitLines(statusText);
    const errors = [
      !draft.institutionName.trim() ? "Naziv ustanove je obvezen." : "",
      !draft.logoText.trim() ? "Oznaka logotipa je obvezna." : "",
      !departmentLines.length ? "Dodajte vsaj en oddelek." : "",
      !statusLines.length ? "Dodajte vsaj en status." : "",
    ].filter(Boolean);

    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    const departments: Department[] = departmentLines.map((line) => {
      const [codePart, namePart] = line.split("|").map((item) => item.trim());
      const name = namePart || codePart;
      const existing = draft.departments.find(
        (department) => department.name === name || department.code === codePart,
      );

      return {
        id: existing?.id ?? toSlug(name),
        name,
        code: (namePart ? codePart : name.charAt(0)).toUpperCase().slice(0, 2),
        rooms: existing?.rooms ?? [],
      };
    });

    const statuses: StatusDefinition[] = statusLines.map((label) => {
      const existing = draft.statuses.find((status) => status.label === label);
      return (
        existing ?? {
          id: toSlug(label),
          label: label as StatusDefinition["label"],
          type: "waiting",
        }
      );
    });

    updateSettings({
      ...draft,
      institutionName: draft.institutionName.trim(),
      logoText: draft.logoText.trim().toUpperCase(),
      departments,
      statuses,
    });
    setFormErrors([]);
    notify({
      title: "Nastavitve shranjene",
      description: "Spremembe so zapisane v lokalni demo shrambi.",
      tone: "success",
    });
  };

  const addRoom = () => {
    const firstDepartment = draft.departments[0]?.id ?? "ambulante";
    const room: Room = {
      id: `soba-${createRoomId()}`,
      name: "Nova soba",
      department: firstDepartment,
    };
    setDraft((current) => ({ ...current, rooms: [...current.rooms, room] }));
    notify({
      title: "Soba dodana",
      description: "Novo sobo po potrebi preimenujte in shranite nastavitve.",
      tone: "info",
    });
  };

  return (
    <div className="page-stack narrow">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Administracija ustanove</span>
          <h1>Nastavitve</h1>
          <p>
            Prilagodite naziv ustanove, oznako logotipa, oddelke, sobe in
            sporočilo javnega prikaza za realistično predstavitev sistema.
          </p>
        </div>
      </section>

      <section className="panel form-grid">
        {formErrors.length ? (
          <div className="form-alert full-span" role="alert">
            <Settings2 size={20} aria-hidden="true" />
            <div>
              <strong>Preverite nastavitve</strong>
              <ul>
                {formErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <label>
          Naziv ustanove
          <input
            value={draft.institutionName}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                institutionName: event.target.value,
              }))
            }
          />
        </label>
        <label>
          Oznaka logotipa
          <input
            maxLength={5}
            placeholder="npr. ZD, LAB, AMB"
            value={draft.logoText}
            onChange={(event) =>
              setDraft((current) => ({ ...current, logoText: event.target.value }))
            }
          />
        </label>
        <div className="logo-preview full-span">
          <div className="brand-mark">{draft.logoText || "LOGO"}</div>
          <div>
            <strong>Predogled označbe ustanove</strong>
            <span>
              Placeholder je namenjen predstavitvi. V produkcijski izvedbi bi ga
              lahko zamenjal uradni logotip ustanove.
            </span>
          </div>
        </div>
        <label className="full-span">
          Sporočilo za javni zaslon
          <textarea
            rows={4}
            placeholder="Prosimo, spremljajte svojo številko."
            value={draft.displayMessage}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                displayMessage: event.target.value,
              }))
            }
          />
        </label>
        <label className="full-span">
          Oddelki
          <textarea
            rows={6}
            value={departmentText}
            onChange={(event) => setDepartmentText(event.target.value)}
          />
        </label>
        <label className="full-span">
          Privzeti statusi
          <textarea
            rows={8}
            value={statusText}
            onChange={(event) => setStatusText(event.target.value)}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Prostori</span>
            <h2>Sobe in delovišča</h2>
          </div>
          <button className="button button-secondary" type="button" onClick={addRoom}>
            <Settings2 size={17} aria-hidden="true" />
            Dodaj sobo
          </button>
        </div>
        <div className="room-editor">
          {draft.rooms.map((room) => (
            <div className="room-row" key={room.id}>
              <input
                aria-label="Naziv sobe"
                value={room.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    rooms: current.rooms.map((item) =>
                      item.id === room.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <select
                aria-label="Oddelek sobe"
                value={room.department}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    rooms: current.rooms.map((item) =>
                      item.id === room.id
                        ? { ...item, department: event.target.value }
                        : item,
                    ),
                  }))
                }
              >
                {draft.departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <button
                aria-label="Odstrani sobo"
                className="icon-button"
                type="button"
                onClick={() => setRoomDeleteTarget(room)}
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <button
          className="button button-secondary"
          type="button"
          onClick={resetDemoData}
        >
          <PlayCircle size={18} aria-hidden="true" />
          Zaženi demo podatke
        </button>
        <button className="button button-primary" type="button" onClick={save}>
          <Save size={18} aria-hidden="true" />
          Shrani nastavitve
        </button>
      </div>

      <ConfirmDialog
        open={Boolean(roomDeleteTarget)}
        title="Odstranim sobo?"
        description={
          roomDeleteTarget
            ? `${roomDeleteTarget.name} bo odstranjena iz konfiguracije.`
            : "Soba bo odstranjena iz konfiguracije."
        }
        confirmLabel="Odstrani sobo"
        onCancel={() => setRoomDeleteTarget(null)}
        onConfirm={() => {
          if (roomDeleteTarget) {
            setDraft((current) => ({
              ...current,
              rooms: current.rooms.filter((item) => item.id !== roomDeleteTarget.id),
            }));
            notify({
              title: "Soba odstranjena",
              description: "Spremembo shranite, da ostane v nastavitvah.",
              tone: "warning",
            });
            setRoomDeleteTarget(null);
          }
        }}
      />

      <p className="support-note">
        Made by FlegarTech &mdash;{" "}
        <a
          href="https://paypal.me/TiniFlegar"
          target="_blank"
          rel="noopener noreferrer"
          className="support-link"
        >
          Support development
        </a>
      </p>
    </div>
  );
};
