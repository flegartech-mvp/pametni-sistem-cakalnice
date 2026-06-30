import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Toasts } from "./components/Toasts";
import { useApp } from "./state/AppContext";
import { AboutPage } from "./pages/AboutPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DisplayPage } from "./pages/DisplayPage";
import { LoginPage } from "./pages/LoginPage";
import { NewPatientPage } from "./pages/NewPatientPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PatientStatusPage } from "./pages/PatientStatusPage";
import { PatientsPage } from "./pages/PatientsPage";
import { QueuesPage } from "./pages/QueuesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

const RequireAuth = () => {
  const { user } = useApp();
  const location = useLocation();

  if (!user) {
    return <Navigate replace to="/login" state={{ from: location.pathname }} />;
  }

  return <Layout />;
};

export const App = () => (
  <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/display" element={<DisplayPage />} />
      <Route path="/patient/:id/status" element={<PatientStatusPage />} />
      <Route path="/" element={<Navigate replace to="/dashboard" />} />
      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/new" element={<NewPatientPage />} />
        <Route path="/queues" element={<QueuesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    <Toasts />
  </>
);
