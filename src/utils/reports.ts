import type { AppSettings, Patient, Priority } from "../types";
import { minutesBetween } from "./format";
import { activeStatuses, getDepartmentName, getRoomName, terminalStatuses } from "./queue";

const isToday = (iso: string) => {
  const date = new Date(iso);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const getTodayPatients = (patients: Patient[]) =>
  patients.filter((patient) => isToday(patient.arrivalTime));

export const getCompletedToday = (patients: Patient[]) =>
  patients.filter(
    (patient) =>
      patient.status === "Zaključeno" &&
      (patient.completedTime ? isToday(patient.completedTime) : isToday(patient.arrivalTime)),
  );

export const getAverageWaitingMinutes = (patients: Patient[]) => {
  const called = patients.filter((patient) => patient.calledTime);

  if (!called.length) {
    return 0;
  }

  return Math.round(
    called.reduce(
      (sum, patient) => sum + minutesBetween(patient.arrivalTime, patient.calledTime),
      0,
    ) / called.length,
  );
};

export const getAverageWaitingMinutesByPriority = (
  patients: Patient[],
  priorities: Priority[],
) =>
  priorities.map((priority) => {
    const called = patients.filter(
      (patient) => patient.priority === priority && patient.calledTime,
    );

    if (!called.length) {
      return { label: priority, value: 0 };
    }

    return {
      label: priority,
      value: Math.round(
        called.reduce(
          (sum, patient) =>
            sum + minutesBetween(patient.arrivalTime, patient.calledTime),
          0,
        ) / called.length,
      ),
    };
  });

export const getLongestWaitingPatient = (patients: Patient[]) =>
  patients
    .filter(
      (patient) =>
        !patient.calledTime &&
        !terminalStatuses.includes(patient.status) &&
        !activeStatuses.includes(patient.status),
    )
    .sort(
      (left, right) =>
        new Date(left.arrivalTime).getTime() -
        new Date(right.arrivalTime).getTime(),
    )[0];

export const countBy = <T extends string>(
  items: T[],
  knownValues: T[] = [],
): Record<T, number> => {
  const result = knownValues.reduce<Record<T, number>>((current, item) => {
    current[item] = 0;
    return current;
  }, {} as Record<T, number>);

  items.forEach((item) => {
    result[item] = (result[item] ?? 0) + 1;
  });

  return result;
};

export const getPeakHour = (patients: Patient[]) => {
  const hours = patients.reduce<Record<string, number>>((result, patient) => {
    const hour = new Date(patient.arrivalTime).getHours().toString().padStart(2, "0");
    result[hour] = (result[hour] ?? 0) + 1;
    return result;
  }, {});

  const [hour] = Object.entries(hours).sort((left, right) => right[1] - left[1])[0] ?? [
    "Ni podatkov",
    0,
  ];

  return hour === "Ni podatkov" ? hour : `${hour}:00`;
};

export const getDashboardMetrics = (
  patients: Patient[],
  settings: AppSettings,
) => {
  const todayPatients = getTodayPatients(patients);
  const waiting = todayPatients.filter(
    (patient) =>
      !terminalStatuses.includes(patient.status) &&
      !activeStatuses.includes(patient.status),
  );
  const active = todayPatients.filter((patient) =>
    activeStatuses.includes(patient.status),
  );
  const completed = getCompletedToday(patients);
  const urgent = todayPatients.filter(
    (patient) => patient.priority === "Nujno" || patient.priority === "Kritično",
  );
  const labQueue = waiting.filter((patient) => patient.department === "laboratorij");
  const ambulatoryQueue = waiting.filter((patient) => patient.department === "ambulante");
  const longestWaiting = getLongestWaitingPatient(todayPatients);
  const currentActiveRoom =
    active
      .map((patient) => patient.assignedRoom)
      .filter(Boolean)
      .map((roomId) => settings.rooms.find((room) => room.id === roomId)?.name)
      .filter(Boolean)[0] ?? "Ni aktivne sobe";

  return {
    todayPatients,
    waiting,
    active,
    completed,
    urgent,
    labQueue,
    ambulatoryQueue,
    averageWaiting: getAverageWaitingMinutes(todayPatients),
    longestWaiting,
    currentActiveRoom,
  };
};

const csvHeaders = [
  "Stevilka pacienta",
  "Zacetnice",
  "Oddelek",
  "Status",
  "Prioriteta",
  "Soba",
  "Prihod",
  "Poklican",
  "Zakljucen",
  "Cakanje v minutah",
];

const formatCsvDateTime = (value?: string) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("sl-SI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const escapeCsvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const getDailyPatientFlowCsv = (
  patients: Patient[],
  settings: AppSettings,
) => {
  const rows = getTodayPatients(patients).map((patient) => [
    patient.number,
    patient.initials,
    getDepartmentName(settings, patient.department),
    patient.status,
    patient.priority,
    getRoomName(settings, patient.assignedRoom) || "",
    formatCsvDateTime(patient.arrivalTime),
    formatCsvDateTime(patient.calledTime),
    formatCsvDateTime(patient.completedTime),
    patient.calledTime ? minutesBetween(patient.arrivalTime, patient.calledTime) : "",
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(";"))
    .join("\n");
};

export const downloadDailyPatientFlowCsv = (
  patients: Patient[],
  settings: AppSettings,
) => {
  const csv = `\uFEFF${getDailyPatientFlowCsv(patients, settings)}`;
  const today = new Date().toISOString().slice(0, 10);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `dnevni-tok-pacientov-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
