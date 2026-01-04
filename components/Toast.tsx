import React, { useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "success" ? "bg-emerald-500" : "bg-rose-500";
  const borderColor =
    type === "success" ? "border-emerald-600" : "border-rose-600";
  const icon =
    type === "success" ? (
      <CheckCircle className="w-5 h-5 text-white" />
    ) : (
      <AlertCircle className="w-5 h-5 text-white" />
    );

  return (
    <div
      className={`fixed top-4 left-4 right-4 mx-auto max-w-sm z-50 flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${bgColor} ${borderColor}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <p className="flex-1 text-sm font-bold text-white leading-tight">
        {message}
      </p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 text-white/60 active:text-white transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;
