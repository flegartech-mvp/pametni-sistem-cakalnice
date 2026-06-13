import type { PatientInput } from "../types";

const INITIALS_PATTERN = /^[A-Za-zČŠŽĆĐčšžćđ][A-Za-zČŠŽĆĐčšžćđ.\-\s]{1,11}$/;

export const normalizeInitials = (value: string) =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

export const validatePatientInput = (
  input: PatientInput,
  currentYear = new Date().getFullYear(),
) => {
  const errors: string[] = [];
  const initials = normalizeInitials(input.initials);
  const notesLength = input.notes?.trim().length ?? 0;

  if (!initials) {
    errors.push("Vnesite začetnice pacienta.");
  } else if (!INITIALS_PATTERN.test(initials)) {
    errors.push("Začetnice naj vsebujejo 2 do 12 črk, pik, presledkov ali vezajev.");
  }

  if (
    input.birthYear !== undefined &&
    (!Number.isInteger(input.birthYear) ||
      input.birthYear < 1900 ||
      input.birthYear > currentYear)
  ) {
    errors.push(`Leto rojstva mora biti med 1900 in ${currentYear}.`);
  }

  if (!input.department) {
    errors.push("Izberite oddelek za pacienta.");
  }

  if (notesLength > 280) {
    errors.push("Operativna opomba je lahko dolga največ 280 znakov.");
  }

  return errors;
};
