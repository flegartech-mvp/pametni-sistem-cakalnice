export type VisitType =
  | "Urgentni center"
  | "Laboratorij"
  | "Ambulanta"
  | "Diagnostika"
  | "Administrativni sprejem";

export type ReasonCategory =
  | "Kontrola"
  | "Odvzem krvi"
  | "Triaža"
  | "Posvet"
  | "Izvidi"
  | "Drugo";

export type Priority = "Normalno" | "Prednostno" | "Nujno" | "Kritično";

export type PatientStatus =
  | "Prijavljen"
  | "Čaka"
  | "Čaka na triažo"
  | "Čaka na odvzem"
  | "Poklican"
  | "V obravnavi"
  | "Na dodatnih preiskavah"
  | "Zaključeno"
  | "Preusmerjen";

export type StatusType = "waiting" | "active" | "completed" | "redirected";

export type TimelineStatus =
  | "Prijavljen"
  | "Čaka"
  | "Poklican"
  | "V obravnavi"
  | "Zaključeno";

export type Role =
  | "Sprejem"
  | "Medicinska sestra"
  | "Zdravnik"
  | "Administrator"
  | "Javni zaslon";

export interface Room {
  id: string;
  name: string;
  department: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  rooms: string[];
}

export interface StatusDefinition {
  id: string;
  label: PatientStatus;
  type: StatusType;
}

export interface PatientTimelineEvent {
  status: TimelineStatus;
  timestamp: string;
}

export interface Patient {
  id: string;
  number: string;
  initials: string;
  birthYear?: number;
  visitType: VisitType;
  reasonCategory: ReasonCategory;
  priority: Priority;
  status: PatientStatus;
  department: string;
  assignedRoom?: string;
  arrivalTime: string;
  calledTime?: string;
  completedTime?: string;
  notes?: string;
  qrCodeUrl: string;
  timeline: PatientTimelineEvent[];
}

export interface AppSettings {
  institutionName: string;
  displayMessage: string;
  logoText: string;
  rooms: Room[];
  departments: Department[];
  statuses: StatusDefinition[];
}

export interface PatientInput {
  initials: string;
  birthYear?: number;
  visitType: VisitType;
  reasonCategory: ReasonCategory;
  priority: Priority;
  status: PatientStatus;
  department: string;
  assignedRoom?: string;
  notes?: string;
}
