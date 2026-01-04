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
  const icon =
    type === "success" ? (
      <CheckCircle className="w-5 h-5 text-white" />
    ) : (
      <AlertCircle className="w-5 h-5 text-white" />
    );

  return (
    <div
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg shadow-slate-200/50 animate-in slide-in-from-top-4 fade-in duration-300 ${bgColor}`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <p className="text-sm font-bold text-white">{message}</p>
      <button
        onClick={onClose}
        className="p-1 ml-2 text-white/50 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
