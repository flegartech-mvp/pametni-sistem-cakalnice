import { ArrowLeft, Clock3, Info, QrCode } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Link, useParams } from "react-router-dom";
import { StatusBadge } from "../components/Badge";
import { StatusTimeline } from "../components/StatusTimeline";
import { LEGAL_NOTE } from "../data/constants";
import { useClock } from "../hooks/useClock";
import { useApp } from "../state/AppContext";
import { formatTime } from "../utils/format";
import {
  getDepartmentName,
  getPatientStatusMessage,
  getQueuePosition,
  getRoomName,
} from "../utils/queue";

export const PatientStatusPage = () => {
  const { id } = useParams();
  const { patients, settings } = useApp();
  const now = useClock();
  const patient = patients.find((item) => item.id === id);

  if (!patient) {
    return (
      <main className="status-page">
        <section className="status-card">
          <Info size={34} aria-hidden="true" />
          <h1>Pacient ni najden</h1>
          <p>Preverite povezavo na informativnem listku ali se obrnite na osebje.</p>
          <Link className="button button-secondary" to="/login">
            <ArrowLeft size={18} aria-hidden="true" />
            Nazaj
          </Link>
        </section>
      </main>
    );
  }

  const position = getQueuePosition(patients, patient);
  const url = `${window.location.origin}${patient.qrCodeUrl}`;
  const statusMessage = getPatientStatusMessage(settings, patients, patient);

  return (
    <main className="status-page">
      <section className="status-card">
        <div className="status-top">
          <div className="brand">
            <div className="brand-mark">{settings.logoText}</div>
            <div>
              <strong>{settings.institutionName}</strong>
              <span>Status pacienta</span>
            </div>
          </div>
          <div className="time-pill">
            <Clock3 size={18} aria-hidden="true" />
            {formatTime(now)}
          </div>
        </div>
        <div className="status-summary">
          <div>
            <span>Vaša številka</span>
            <div className="patient-number">{patient.number}</div>
          </div>
          <StatusBadge status={patient.status} />
        </div>
        <div className="status-message" aria-live="polite">
          <span>Ocena stanja</span>
          <strong>{statusMessage}</strong>
        </div>
        <div className="status-grid">
          <div>
            <span>Usmeritev</span>
            <strong>{getDepartmentName(settings, patient.department)}</strong>
          </div>
          <div>
            <span>Položaj v vrsti</span>
            <strong>
              {position
                ? `${position}. v vrsti`
                : patient.status === "Poklican" || patient.status === "V obravnavi"
                  ? "Poklican"
                  : "Ni v vrsti"}
            </strong>
          </div>
          <div>
            <span>Soba</span>
            <strong>{getRoomName(settings, patient.assignedRoom) || "Bo določena"}</strong>
          </div>
          <div>
            <span>Prihod</span>
            <strong>{formatTime(patient.arrivalTime)}</strong>
          </div>
        </div>
        <section className="timeline-panel" aria-label="Časovnica statusov">
          <div>
            <span>Časovnica</span>
            <strong>Vaš potek obravnave</strong>
          </div>
          <StatusTimeline patient={patient} />
        </section>
        <div className="qr-panel">
          <QRCodeCanvas value={url} size={132} includeMargin />
          <div>
            <QrCode size={22} aria-hidden="true" />
            <strong>QR status povezava</strong>
            <p>Podatek je informativen. Za uradne informacije se obrnite na osebje.</p>
          </div>
        </div>
        <p className="legal-note standalone">{LEGAL_NOTE}</p>
      </section>
    </main>
  );
};
