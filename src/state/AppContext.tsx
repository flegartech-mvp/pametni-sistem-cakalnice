/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { demoPatients, demoSettings } from "../data/demoData";
import type {
  AppSettings,
  Patient,
  PatientInput,
  PatientStatus,
  Role,
} from "../types";
import {
  activeStatuses,
  appendTimelineEvent,
  createInitialTimeline,
  getDefaultRoomForDepartment,
  getNextPatient,
  terminalStatuses,
} from "../utils/queue";
import { toSlug } from "../utils/format";

interface UserSession {
  role: Role;
  name: string;
}

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: "success" | "info" | "warning" | "danger";
}

interface AppContextValue {
  patients: Patient[];
  settings: AppSettings;
  user: UserSession | null;
  toasts: ToastMessage[];
  login: (role: Role, name?: string) => void;
  logout: () => void;
  addPatient: (input: PatientInput) => Patient;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  movePatient: (id: string, status: PatientStatus, roomId?: string) => void;
  completePatient: (id: string) => void;
  deletePatient: (id: string) => void;
  callNextPatient: (departmentId: string) => Patient | null;
  updateSettings: (settings: AppSettings) => void;
  resetDemoData: () => void;
  dismissToast: (id: string) => void;
  notify: (message: Omit<ToastMessage, "id">) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const PATIENTS_KEY = "cakalnica:patients";
const SETTINGS_KEY = "cakalnica:settings";
const USER_KEY = "cakalnica:user";

const canUseStorage = () => typeof window !== "undefined" && "localStorage" in window;

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `fallback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const loadJson = <T,>(key: string, fallback: T): T => {
  try {
    if (!canUseStorage()) {
      return fallback;
    }

    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const getVisitDepartment = (visitType: PatientInput["visitType"]) => {
  switch (visitType) {
    case "Urgentni center":
      return "urgentni";
    case "Laboratorij":
      return "laboratorij";
    case "Ambulanta":
      return "ambulante";
    case "Diagnostika":
      return "diagnostika";
    case "Administrativni sprejem":
      return "sprejem";
    default:
      return "ambulante";
  }
};

const createPatientNumber = (
  patients: Patient[],
  settings: AppSettings,
  departmentId: string,
) => {
  const department = settings.departments.find((item) => item.id === departmentId);
  const code = department?.code ?? "P";
  const existingNumbers = patients
    .filter((patient) => patient.department === departmentId)
    .map((patient) => Number(patient.number.split("-")[1]))
    .filter(Number.isFinite);

  const next = existingNumbers.length ? Math.max(...existingNumbers) + 1 : 1;
  return `${code}-${next.toString().padStart(3, "0")}`;
};

type StoredPatient = Omit<Patient, "timeline"> & {
  timeline?: Patient["timeline"];
};

const normalizeAssignedRoom = (
  settings: AppSettings,
  assignedRoom: string | undefined,
  departmentId: string,
) => {
  if (!assignedRoom) {
    return undefined;
  }

  const existingRoom = settings.rooms.find((room) => room.id === assignedRoom);
  if (existingRoom) {
    return assignedRoom;
  }

  return (
    settings.rooms.find(
      (room) =>
        room.department === departmentId &&
        room.name.toLowerCase() === assignedRoom.toLowerCase(),
    )?.id ?? assignedRoom
  );
};

const normalizePatient = (
  patient: StoredPatient,
  settings: AppSettings,
): Patient => {
  const arrivalTime = patient.arrivalTime ?? new Date().toISOString();

  return {
    ...patient,
    arrivalTime,
    assignedRoom: normalizeAssignedRoom(
      settings,
      patient.assignedRoom,
      patient.department,
    ),
    qrCodeUrl: patient.qrCodeUrl || `/patient/${patient.id}/status`,
    timeline: patient.timeline?.length
      ? patient.timeline
      : createInitialTimeline(
          patient.status,
          arrivalTime,
          patient.calledTime,
          patient.completedTime,
        ),
  };
};

const loadPatients = (settings: AppSettings) =>
  loadJson<StoredPatient[]>(PATIENTS_KEY, demoPatients).map((patient) =>
    normalizePatient(patient, settings),
  );

const normalizeSettings = (settings: AppSettings): AppSettings => ({
  ...settings,
  statuses: [
    ...settings.statuses,
    ...demoSettings.statuses.filter(
      (status) =>
        !settings.statuses.some((current) => current.label === status.label),
    ),
  ],
});

const loadSettings = () =>
  normalizeSettings(loadJson<AppSettings>(SETTINGS_KEY, demoSettings));

const applyPatientUpdates = (
  patient: Patient,
  updates: Partial<Patient>,
  timestamp: string,
): Patient => {
  const nextStatus = updates.status ?? patient.status;
  const statusChanged = Boolean(
    updates.status && updates.status !== patient.status,
  );
  const calledTime =
    updates.calledTime ??
    (activeStatuses.includes(nextStatus)
      ? patient.calledTime ?? timestamp
      : patient.calledTime);
  const completedTime =
    updates.completedTime ??
    (terminalStatuses.includes(nextStatus)
      ? patient.completedTime ?? timestamp
      : patient.completedTime);
  const timeline = statusChanged
    ? appendTimelineEvent(patient.timeline, nextStatus, timestamp)
    : updates.timeline ?? patient.timeline;

  return {
    ...patient,
    ...updates,
    status: nextStatus,
    calledTime,
    completedTime,
    timeline,
  };
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadSettings(),
  );
  const [patients, setPatients] = useState<Patient[]>(() =>
    loadPatients(settings),
  );
  const [user, setUser] = useState<UserSession | null>(() =>
    loadJson<UserSession | null>(USER_KEY, null),
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((message: Omit<ToastMessage, "id">) => {
    const id = createId();
    setToasts((current) => [...current, { ...message, id }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  useEffect(() => {
    try {
      if (canUseStorage()) {
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
      }
    } catch {
      notify({
        title: "Shranjevanje ni uspelo",
        description: "Brskalnik trenutno ne dovoli zapisa pacientov v lokalno shrambo.",
        tone: "danger",
      });
    }
  }, [notify, patients]);

  useEffect(() => {
    try {
      if (canUseStorage()) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }
    } catch {
      notify({
        title: "Shranjevanje ni uspelo",
        description: "Nastavitve niso bile zapisane v lokalno shrambo.",
        tone: "danger",
      });
    }
  }, [notify, settings]);

  useEffect(() => {
    try {
      if (!canUseStorage()) {
        return;
      }

      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      notify({
        title: "Seja ni bila shranjena",
        description: "Prijava bo veljala samo do osvežitve strani.",
        tone: "warning",
      });
    }
  }, [notify, user]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const login = useCallback((role: Role, name = "Demo uporabnik") => {
    setUser({ role, name });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const addPatient = useCallback(
    (input: PatientInput) => {
      const departmentId = input.department || getVisitDepartment(input.visitType);
      const id = `p-${toSlug(departmentId)}-${createId().slice(0, 8)}`;
      const number = createPatientNumber(patients, settings, departmentId);
      const room = input.assignedRoom || getDefaultRoomForDepartment(settings, departmentId);
      const arrivalTime = new Date().toISOString();
      const patient: Patient = {
        ...input,
        id,
        number,
        department: departmentId,
        assignedRoom: room,
        arrivalTime,
        qrCodeUrl: `/patient/${id}/status`,
        timeline: createInitialTimeline(input.status, arrivalTime),
      };

      setPatients((current) => [patient, ...current]);
      notify({
        title: "Pacient dodan",
        description: `${number} je bil dodan v čakalno vrsto in ima pripravljen listek.`,
        tone: "success",
      });
      return patient;
    },
    [notify, patients, settings],
  );

  const updatePatient = useCallback(
    (id: string, updates: Partial<Patient>) => {
      const timestamp = new Date().toISOString();

      setPatients((current) =>
        current.map((patient) =>
          patient.id === id ? applyPatientUpdates(patient, updates, timestamp) : patient,
        ),
      );
      notify({
        title: "Pacient posodobljen",
        description: updates.status
          ? `Status je posodobljen na ${updates.status}.`
          : "Sprememba je shranjena v lokalni shrambi.",
        tone: "info",
      });
    },
    [notify],
  );

  const movePatient = useCallback(
    (id: string, status: PatientStatus, roomId?: string) => {
      const timestamp = new Date().toISOString();
      setPatients((current) =>
        current.map((patient) =>
          patient.id === id
            ? applyPatientUpdates(
                patient,
                {
                  status,
                  assignedRoom: roomId ?? patient.assignedRoom,
                },
                timestamp,
              )
            : patient,
        ),
      );
      notify({
        title: "Status posodobljen",
        description: `Pacient je prestavljen v status ${status}.`,
        tone: "info",
      });
    },
    [notify],
  );

  const completePatient = useCallback(
    (id: string) => {
      movePatient(id, "Zaključeno");
    },
    [movePatient],
  );

  const deletePatient = useCallback(
    (id: string) => {
      const deletedNumber = patients.find((patient) => patient.id === id)?.number;

      setPatients((current) => current.filter((item) => item.id !== id));
      notify({
        title: "Pacient odstranjen",
        description: deletedNumber
          ? `${deletedNumber} je odstranjen iz seznama.`
          : "Pacient je odstranjen iz seznama.",
        tone: "warning",
      });
    },
    [notify, patients],
  );

  const callNextPatient = useCallback(
    (departmentId: string) => {
      const next = getNextPatient(patients, departmentId);

      if (!next) {
        notify({
          title: "Ni čakajočih pacientov",
          description: "Izbrana čakalna vrsta je trenutno prazna.",
          tone: "warning",
        });
        return null;
      }

      const roomId =
        next.assignedRoom ?? getDefaultRoomForDepartment(settings, departmentId);
      const timestamp = new Date().toISOString();
      const calledPatient = applyPatientUpdates(
        next,
        {
          status: "Poklican",
          assignedRoom: roomId,
        },
        timestamp,
      );

      setPatients((current) =>
        current.map((patient) =>
          patient.id === next.id
            ? applyPatientUpdates(
                patient,
                {
                  status: "Poklican",
                  assignedRoom: roomId,
                },
                timestamp,
              )
            : patient,
        ),
      );
      const roomName = roomId
        ? settings.rooms.find((room) => room.id === roomId)?.name ?? "izbrano sobo"
        : "sobo";
      notify({
        title: "Pacient poklican",
        description: `${next.number} je poklican v ${roomName}.`,
        tone: next.priority === "Kritično" ? "danger" : "success",
      });
      return calledPatient;
    },
    [notify, patients, settings],
  );

  const updateSettings = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
  }, []);

  const resetDemoData = useCallback(() => {
    setPatients(demoPatients);
    setSettings(demoSettings);
    notify({
      title: "Demo pripravljen",
      description:
        "Naloženi so realistični pacienti, oddelki, sobe in sporočilo javnega prikaza.",
      tone: "success",
    });
  }, [notify]);

  const value = useMemo<AppContextValue>(
    () => ({
      patients,
      settings,
      user,
      toasts,
      login,
      logout,
      addPatient,
      updatePatient,
      movePatient,
      completePatient,
      deletePatient,
      callNextPatient,
      updateSettings,
      resetDemoData,
      dismissToast,
      notify,
    }),
    [
      patients,
      settings,
      user,
      toasts,
      login,
      logout,
      addPatient,
      updatePatient,
      movePatient,
      completePatient,
      deletePatient,
      callNextPatient,
      updateSettings,
      resetDemoData,
      dismissToast,
      notify,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
};
