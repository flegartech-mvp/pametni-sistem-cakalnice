import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useApp } from "../state/AppContext";

const icons = {
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  danger: XCircle,
};

export const Toasts = () => {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="toast-region" aria-live="polite" aria-label="Obvestila">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone ?? "info"];
        return (
          <div className={`toast toast-${toast.tone ?? "info"}`} key={toast.id}>
            <Icon size={20} aria-hidden="true" />
            <div>
              <strong>{toast.title}</strong>
              {toast.description ? <p>{toast.description}</p> : null}
            </div>
            <button
              aria-label="Zapri obvestilo"
              className="icon-button"
              type="button"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
