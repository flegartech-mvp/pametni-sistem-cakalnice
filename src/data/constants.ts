import type {
  PatientStatus,
  Priority,
  ReasonCategory,
  Role,
  VisitType,
} from "../types";

export const VISIT_TYPES: VisitType[] = [
  "Urgentni center",
  "Laboratorij",
  "Ambulanta",
  "Diagnostika",
  "Administrativni sprejem",
];

export const REASON_CATEGORIES: ReasonCategory[] = [
  "Kontrola",
  "Odvzem krvi",
  "Triaža",
  "Posvet",
  "Izvidi",
  "Drugo",
];

export const PRIORITIES: Priority[] = [
  "Normalno",
  "Prednostno",
  "Nujno",
  "Kritično",
];

export const PATIENT_STATUSES: PatientStatus[] = [
  "Prijavljen",
  "Čaka",
  "Čaka na triažo",
  "Čaka na odvzem",
  "Poklican",
  "V obravnavi",
  "Na dodatnih preiskavah",
  "Zaključeno",
  "Preusmerjen",
];

export const STAFF_ROLES: Role[] = [
  "Sprejem",
  "Medicinska sestra",
  "Zdravnik",
  "Administrator",
];

export const LEGAL_NOTE =
  "Sistem je demonstracijski prototip za komunikacijo v čakalnici. Ni namenjen medicinski diagnostiki in ne nadomešča uradnih zdravstvenih informacijskih sistemov ali eNaročanja.";
