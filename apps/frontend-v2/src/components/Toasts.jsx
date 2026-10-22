import React from "react";
import Icon from "./Icon";

const ToastContext = React.createContext(() => {});
let nextId = 1;

export const useToast = () => React.useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const dismiss = React.useCallback((id) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  // toast({ tone: "success" | "danger" | "info", title, body })
  const toast = React.useCallback(
    (t) => {
      const id = nextId++;
      setToasts((all) => [...all.slice(-3), { ...t, id }]);
      setTimeout(() => dismiss(id), t.tone === "danger" ? 9000 : 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone || "info"}`}>
            <Icon name={t.tone === "success" ? "check" : t.tone === "danger" ? "alert" : "sparkles"} />
            <div>
              <strong>{t.title}</strong>
              {t.body && <p>{t.body}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
