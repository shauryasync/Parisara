import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { createPortal } from "react-dom";

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  variant = "light",
  onConfirm,
  onCancel,
}) => {
  const cancelButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isDark = variant === "dark";

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    cancelButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !submittingRef.current) {
        event.preventDefault();
        onCancelRef.current();
      }

      if (event.key !== "Tab") return;
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusableElements?.length) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const handleCancel = () => {
    if (submittingRef.current) return;
    setError("");
    onCancel();
  };

  const handleConfirm = async () => {
    submittingRef.current = true;
    setSubmitting(true);
    setError("");

    try {
      await onConfirm();
      onCancelRef.current();
    } catch (confirmError) {
      setError(confirmError.message || "Unable to complete this action. Please try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const surfaceClass = isDark
    ? "border-slate-700 bg-slate-900 text-slate-100"
    : "border-stone-200 bg-white text-stone-900";
  const messageClass = isDark ? "text-slate-300" : "text-stone-600";
  const cancelClass = isDark
    ? "border-slate-600 text-slate-200 hover:bg-slate-800"
    : "border-stone-300 text-stone-700 hover:bg-stone-50";
  const confirmClass =
    tone === "danger"
      ? "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-500"
      : "bg-emerald-900 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submittingRef.current) handleCancel();
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className={`w-full max-w-md rounded-t-2xl border p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-6 ${surfaceClass}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              tone === "danger"
                ? isDark
                  ? "bg-red-950 text-red-300"
                  : "bg-red-50 text-red-700"
                : isDark
                  ? "bg-emerald-950 text-emerald-300"
                  : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <AlertTriangle size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-dialog-title" className="text-base font-semibold">
              {title}
            </h2>
            <p id="confirm-dialog-message" className={`mt-1.5 text-sm leading-6 ${messageClass}`}>
              {message}
            </p>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              isDark ? "bg-red-950 text-red-200" : "bg-red-50 text-red-800"
            }`}
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60 ${cancelClass}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${confirmClass}`}
          >
            {submitting ? "Working..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default ConfirmDialog;
