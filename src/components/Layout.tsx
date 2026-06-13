import {
  BarChart3,
  BellRing,
  ClipboardList,
  Info,
  LayoutDashboard,
  LogOut,
  Monitor,
  PlusCircle,
  Settings,
  UsersRound,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LEGAL_NOTE } from "../data/constants";
import { useClock } from "../hooks/useClock";
import { useApp } from "../state/AppContext";
import { formatDate, formatTime } from "../utils/format";

const navItems = [
  { to: "/dashboard", label: "Nadzorna plošča", icon: LayoutDashboard },
  { to: "/patients", label: "Pacienti", icon: UsersRound },
  { to: "/patients/new", label: "Dodaj pacienta", icon: PlusCircle },
  { to: "/queues", label: "Čakalne vrste", icon: ClipboardList },
  { to: "/reports", label: "Poročila", icon: BarChart3 },
  { to: "/about", label: "O sistemu", icon: Info },
  { to: "/settings", label: "Nastavitve", icon: Settings },
];

export const Layout = () => {
  const now = useClock();
  const navigate = useNavigate();
  const { settings, user, logout } = useApp();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Glavna navigacija">
        <div className="brand">
          <div className="brand-mark">{settings.logoText}</div>
          <div>
            <strong>{settings.institutionName}</strong>
            <span>Čakalni sistem</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink className="nav-link" key={item.to} to={item.to}>
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <button
          className="button button-secondary sidebar-display"
          type="button"
          onClick={() => window.open("/display", "_blank")}
        >
          <Monitor size={18} aria-hidden="true" />
          Odpri javni zaslon
        </button>
        <p className="legal-note">{LEGAL_NOTE}</p>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <span className="eyebrow">Operativni pregled</span>
            <strong>{formatDate(now)}</strong>
          </div>
          <div className="topbar-actions">
            <div className="time-pill" aria-label="Trenutni čas">
              <BellRing size={18} aria-hidden="true" />
              {formatTime(now)}
            </div>
            <div className="user-pill">
              <span>{user?.role}</span>
              <strong>{user?.name}</strong>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Odjava"
              title="Odjava"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
