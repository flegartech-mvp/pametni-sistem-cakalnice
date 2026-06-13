import {
  ArrowRight,
  Building2,
  ClipboardList,
  Eye,
  Info,
  Monitor,
  PlayCircle,
  QrCode,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LEGAL_NOTE, STAFF_ROLES } from "../data/constants";
import { useApp } from "../state/AppContext";
import type { Role } from "../types";

const productBenefits = [
  {
    icon: ClipboardList,
    text: "Manj ponavljajočih vprašanj na sprejemu.",
  },
  {
    icon: UsersRound,
    text: "Boljši pregled nad trenutno zasedenostjo čakalnice.",
  },
  {
    icon: QrCode,
    text: "Pacient vidi svoj status prek informativnega listka ali QR povezave.",
  },
  {
    icon: Eye,
    text: "Osebje vidi tok pacientov po oddelkih, sobah in prioritetah.",
  },
  {
    icon: ShieldCheck,
    text: "Javni prikaz ne razkriva imen ali drugih občutljivih podatkov.",
  },
  {
    icon: Building2,
    text: "Primerno za laboratorij, ambulante, diagnostiko in čakalnice.",
  },
];

export const LoginPage = () => {
  const { login, resetDemoData, settings, user } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState<Role>("Sprejem");
  const [name, setName] = useState("Demo uporabnik");
  const from =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : "/dashboard";

  if (user) {
    return <Navigate replace to="/dashboard" />;
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand large">
          <div className="brand-mark">{settings.logoText}</div>
          <div>
            <strong>{settings.institutionName}</strong>
            <span>Produktni demo za upravljanje čakalnice</span>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Čakalniški sistem za zdravstvene ustanove</span>
          <h1>Pregleden tok pacientov, manj pritiska na sprejem.</h1>
          <p>
            Sistem poveže sprejem, osebje, javni prikaz in pacienta v enoten
            operativni tok. Namenjen je klinikam, zasebnim ambulantam,
            laboratorijem in zdravstvenim centrom, ki želijo bolj razumljivo
            komunikacijo v čakalnici.
          </p>
        </div>
        <div className="login-benefits">
          {productBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <div key={benefit.text}>
                <Icon size={20} aria-hidden="true" />
                <span>{benefit.text}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="login-card" aria-labelledby="login-title">
        <h2 id="login-title">Predstavitveni dostop</h2>
        <p>
          Za predstavitev lahko zaženete demo z realističnimi pacienti ali
          vstopite z izbrano vlogo osebja.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            login(role, name.trim() || "Demo uporabnik");
            navigate(from);
          }}
        >
          <label>
            Ime uporabnika
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Vloga
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {STAFF_ROLES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary full-width" type="submit">
            Vstop v sistem
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
        <button
          className="button button-primary full-width"
          type="button"
          onClick={() => {
            resetDemoData();
            login("Administrator", "Demo predstavitev");
            navigate("/dashboard");
          }}
        >
          <PlayCircle size={18} aria-hidden="true" />
          Zaženi demo
        </button>
        <button
          className="button button-secondary full-width"
          type="button"
          onClick={() => window.open("/display", "_blank")}
        >
          <Monitor size={18} aria-hidden="true" />
          Odpri javni zaslon
        </button>
        <Link className="button button-secondary full-width" to="/about">
          <Info size={18} aria-hidden="true" />
          O sistemu
        </Link>
        <p className="legal-note standalone">{LEGAL_NOTE}</p>
      </section>
    </main>
  );
};
