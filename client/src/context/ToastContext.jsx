import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { ToastContext } from "./toast-context.js";
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = "success") => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, message, type }]);
    setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      4500,
    );
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed right-4 top-4 z-50 flex w-[min(92vw,380px)] flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="surface flex items-start gap-3 p-4">
            <span
              className={
                toast.type === "error" ? "text-rose-600" : "text-emerald-600"
              }
            >
              {toast.type === "error" ? (
                <CircleAlert size={20} />
              ) : (
                <CheckCircle2 size={20} />
              )}
            </span>
            <p className="flex-1 text-sm font-medium text-slate-700">
              {toast.message}
            </p>
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setToasts((items) =>
                  items.filter((item) => item.id !== toast.id),
                )
              }
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
