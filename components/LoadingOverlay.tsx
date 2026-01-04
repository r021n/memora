import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  duration?: number; // Duration in ms for the progress bar to fill
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Loading...",
  duration = 3000,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, duration]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xs p-6 bg-white shadow-2xl rounded-2xl">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            {/* Using a simple spinning icon as well for liveliness */}
            <div className="p-3 bg-indigo-50 text-indigo-500 rounded-full animate-spin-slow">
              <Loader2 size={32} />
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-700">{message}</h3>

          {/* Progress Bar Container */}
          <div className="w-full h-2 overflow-hidden bg-slate-100 rounded-full">
            <div
              className="h-full bg-indigo-500 transition-all duration-75 ease-linear rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Please wait
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
