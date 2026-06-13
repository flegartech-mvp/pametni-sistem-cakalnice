import { describe, expect, it } from "vitest";
import type { PatientInput } from "../types";
import { normalizeInitials, validatePatientInput } from "./patientValidation";

const validInput: PatientInput = {
  initials: "m.n.",
  birthYear: 1985,
  visitType: "Laboratorij",
  reasonCategory: "Odvzem krvi",
  priority: "Normalno",
  status: "Čaka na odvzem",
  department: "laboratorij",
  assignedRoom: "lab-1",
  notes: "",
};

describe("patient validation", () => {
  it("normalizes initials without removing meaningful separators", () => {
    expect(normalizeInitials("  m.  n. ")).toBe("M. N.");
  });

  it("accepts a complete patient intake draft", () => {
    expect(validatePatientInput(validInput, 2026)).toEqual([]);
  });

  it("returns clear validation errors for unsafe intake data", () => {
    expect(
      validatePatientInput(
        {
          ...validInput,
          initials: "!",
          birthYear: 1888,
          department: "",
          notes: "x".repeat(281),
        },
        2026,
      ),
    ).toEqual([
      "Začetnice naj vsebujejo 2 do 12 črk, pik, presledkov ali vezajev.",
      "Leto rojstva mora biti med 1900 in 2026.",
      "Izberite oddelek za pacienta.",
      "Operativna opomba je lahko dolga največ 280 znakov.",
    ]);
  });
});
