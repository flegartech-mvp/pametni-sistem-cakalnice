import type {
  AppSettings,
  Patient,
  PatientStatus,
  PatientTimelineEvent,
  Priority,
  TimelineStatus,
} from "../types";

const priorityWeight: Record<Priority, number> = {
  Kritično: 0,
  Nujno: 1,
  Prednostno: 2,
  Normalno: 3,
};

export const terminalStatuses: PatientStatus[] = ["Zaključeno", "Preusmerjen"];

export const activeStatuses: PatientStatus[] = ["Poklican", "V obravnavi"];

export const callableStatuses: PatientStatus[] = [
  "Prijavljen",
  "Čaka",
  "Čaka na triažo",
  "Čaka na odvzem",
  "Na dodatnih preiskavah",
];

export const sortQueuePatients = (patients: Patient[]) =>
  [...patients].sort((left, right) => {
    const priorityDelta =
      priorityWeight[left.priority] - priorityWeight[right.priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (
      new Date(left.arrivalTime).getTime() -
      new Date(right.arrivalTime).getTime()
    );
  });

export const getDepartmentQueue = (
  patients: Patient[],
  departmentId: string,
  includeActive = false,
) =>
  sortQueuePatients(
    patients.filter((patient) => {
      const isSameDepartment = patient.department === departmentId;
      const isTerminal = terminalStatuses.includes(patient.status);
      const isActive = activeStatuses.includes(patient.status);

      return isSameDepartment && !isTerminal && (includeActive || !isActive);
    }),
  );

export const getCallableQueue = (patients: Patient[], departmentId: string) =>
  sortQueuePatients(
    patients.filter(
      (patient) =>
        patient.department === departmentId &&
        callableStatuses.includes(patient.status),
    ),
  );

export const getNextPatient = (patients: Patient[], departmentId: string) =>
  getCallableQueue(patients, departmentId)[0];

export const getDepartmentName = (
  settings: AppSettings,
  departmentId?: string,
) =>
  settings.departments.find((department) => department.id === departmentId)
    ?.name ?? "Ni določeno";

export const getRoomName = (settings: AppSettings, roomId?: string) =>
  settings.rooms.find((room) => room.id === roomId)?.name ?? roomId ?? "";

export const getDefaultRoomForDepartment = (
  settings: AppSettings,
  departmentId: string,
) => settings.rooms.find((room) => room.department === departmentId)?.id;

export const statusTone = (status: PatientStatus) => {
  if (status === "Zaključeno") {
    return "success";
  }

  if (status === "Preusmerjen") {
    return "neutral";
  }

  if (status === "Poklican" || status === "V obravnavi") {
    return "info";
  }

  if (status === "Čaka na triažo" || status === "Čaka na odvzem") {
    return "warning";
  }

  return "neutral";
};

export const priorityTone = (priority: Priority) => {
  if (priority === "Kritično") {
    return "danger";
  }

  if (priority === "Nujno") {
    return "urgent";
  }

  if (priority === "Prednostno") {
    return "warning";
  }

  return "neutral";
};

export const getQueuePosition = (patients: Patient[], patient: Patient) => {
  if (terminalStatuses.includes(patient.status) || activeStatuses.includes(patient.status)) {
    return null;
  }

  const queue = getCallableQueue(patients, patient.department);
  const index = queue.findIndex((item) => item.id === patient.id);
  return index >= 0 ? index + 1 : null;
};

export const getTimelineStatus = (status: PatientStatus): TimelineStatus => {
  if (status === "Poklican") {
    return "Poklican";
  }

  if (status === "V obravnavi") {
    return "V obravnavi";
  }

  if (terminalStatuses.includes(status)) {
    return "Zaključeno";
  }

  if (status === "Prijavljen") {
    return "Prijavljen";
  }

  return "Čaka";
};

export const appendTimelineEvent = (
  timeline: PatientTimelineEvent[] | undefined,
  status: PatientStatus,
  timestamp: string,
) => {
  const nextStatus = getTimelineStatus(status);
  const normalizedTimeline = timeline ?? [];
  const lastEvent = normalizedTimeline[normalizedTimeline.length - 1];

  if (lastEvent?.status === nextStatus) {
    return normalizedTimeline;
  }

  return [...normalizedTimeline, { status: nextStatus, timestamp }];
};

export const createInitialTimeline = (
  status: PatientStatus,
  arrivalTime: string,
  calledTime?: string,
  completedTime?: string,
) => {
  let timeline: PatientTimelineEvent[] = [
    { status: "Prijavljen", timestamp: arrivalTime },
  ];

  const statusStep = getTimelineStatus(status);
  if (statusStep !== "Prijavljen") {
    timeline = appendTimelineEvent(timeline, "Čaka", arrivalTime);
  }

  if (calledTime || statusStep === "Poklican" || statusStep === "V obravnavi") {
    timeline = appendTimelineEvent(timeline, "Poklican", calledTime ?? arrivalTime);
  }

  if (statusStep === "V obravnavi" || (statusStep === "Zaključeno" && calledTime)) {
    timeline = appendTimelineEvent(timeline, "V obravnavi", calledTime ?? arrivalTime);
  }

  if (completedTime || statusStep === "Zaključeno") {
    timeline = appendTimelineEvent(timeline, "Zaključeno", completedTime ?? calledTime ?? arrivalTime);
  }

  return timeline;
};

export const getPatientStatusMessage = (
  settings: AppSettings,
  patients: Patient[],
  patient: Patient,
) => {
  const roomName = getRoomName(settings, patient.assignedRoom);

  if (patient.status === "Zaključeno" || patient.status === "Preusmerjen") {
    return "Obravnava je zaključena";
  }

  if (patient.status === "Poklican") {
    return roomName
      ? `Poklicani ste v sobo ${roomName}`
      : "Poklicani ste. Prosimo, sledite navodilom osebja.";
  }

  if (patient.status === "V obravnavi") {
    return roomName ? `Ste v obravnavi v sobi ${roomName}` : "Ste v obravnavi";
  }

  const position = getQueuePosition(patients, patient);

  if (position) {
    return `Ste ${position}. v vrsti`;
  }

  return "Vaš status spremlja osebje";
};
