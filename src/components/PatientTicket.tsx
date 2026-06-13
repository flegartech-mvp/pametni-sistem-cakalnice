import { LEGAL_NOTE } from "../data/constants";
import type { AppSettings, Patient } from "../types";
import { formatTime } from "../utils/format";
import { getDepartmentName, getRoomName } from "../utils/queue";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const printPatientTicket = (patient: Patient, settings: AppSettings) => {
  const url = `${window.location.origin}${patient.qrCodeUrl}`;
  const ticket = window.open("", "_blank", "width=460,height=640");
  const roomName = getRoomName(settings, patient.assignedRoom) || "Bo določena";
  const instruction =
    patient.status === "Poklican"
      ? "Prosimo, pojdite proti označeni sobi in sledite navodilom osebja."
      : "Prosimo, spremljajte javni prikazovalnik in QR status povezavo.";

  if (!ticket) {
    return;
  }

  ticket.document.write(`
    <!doctype html>
    <html lang="sl">
      <head>
        <meta charset="utf-8" />
        <title>Listek ${patient.number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
          .ticket { border: 1px solid #d1d5db; border-radius: 16px; padding: 24px; max-width: 360px; margin: 0 auto; }
          h1 { margin: 0 0 8px; font-size: 18px; }
          .number { font-size: 42px; font-weight: 800; letter-spacing: 0; margin: 18px 0; }
          .row { display: flex; justify-content: space-between; gap: 16px; border-top: 1px solid #e5e7eb; padding: 10px 0; }
          .link-box { border: 1px dashed #93c5fd; border-radius: 10px; padding: 12px; margin-top: 14px; background: #eff6ff; }
          .muted, .note { color: #4b5563; font-size: 13px; }
          .note { margin-top: 18px; line-height: 1.45; }
          .url { word-break: break-all; font-size: 12px; margin-top: 12px; color: #1d4ed8; }
          @media print { body { padding: 0; } .ticket { border: 0; } }
        </style>
      </head>
      <body>
        <main class="ticket">
          <h1>${escapeHtml(settings.institutionName)}</h1>
          <div class="muted">Informativni listek za čakalnico</div>
          <div class="number">${escapeHtml(patient.number)}</div>
          <div class="row"><span>Usmeritev</span><strong>${escapeHtml(getDepartmentName(settings, patient.department))}</strong></div>
          <div class="row"><span>Status</span><strong>${escapeHtml(patient.status)}</strong></div>
          <div class="row"><span>Soba</span><strong>${escapeHtml(roomName)}</strong></div>
          <div class="row"><span>Prihod</span><strong>${escapeHtml(formatTime(patient.arrivalTime))}</strong></div>
          <div class="link-box">
            <strong>QR/status povezava</strong>
            <p class="url">${escapeHtml(url)}</p>
          </div>
          <p class="note">${escapeHtml(instruction)}</p>
          <p class="note">${escapeHtml(LEGAL_NOTE)}</p>
        </main>
        <script>window.print();</script>
      </body>
    </html>
  `);
  ticket.document.close();
};
