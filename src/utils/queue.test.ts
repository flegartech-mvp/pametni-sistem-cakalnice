import { describe, expect, it } from "vitest";
import type { Patient } from "../types";
import { sortQueuePatients } from "./queue";

const createPatient = (
  id: string,
  number: string,
  priority: Patient["priority"],
  arrivalTime: string,
): Patient => ({
  id,
  number,
  initials: "T.P.",
  visitType: "Laboratorij",
  reasonCategory: "Odvzem krvi",
  priority,
  status: "Čaka na odvzem",
  department: "laboratorij",
  arrivalTime,
  qrCodeUrl: `/patient/${id}/status`,
  timeline: [
    { status: "Prijavljen", timestamp: arrivalTime },
    { status: "Čaka", timestamp: arrivalTime },
  ],
});

describe("sortQueuePatients", () => {
  it("orders critical, urgent, priority and normal patients by arrival time inside each priority", () => {
    const queue = [
      createPatient("normal-new", "L-004", "Normalno", "2026-05-14T09:20:00.000Z"),
      createPatient("urgent", "L-002", "Nujno", "2026-05-14T09:30:00.000Z"),
      createPatient("critical", "L-003", "Kritično", "2026-05-14T09:45:00.000Z"),
      createPatient("normal-old", "L-001", "Normalno", "2026-05-14T09:00:00.000Z"),
      createPatient("priority", "L-005", "Prednostno", "2026-05-14T09:10:00.000Z"),
    ];

    expect(sortQueuePatients(queue).map((patient) => patient.id)).toEqual([
      "critical",
      "urgent",
      "priority",
      "normal-old",
      "normal-new",
    ]);
  });
});
